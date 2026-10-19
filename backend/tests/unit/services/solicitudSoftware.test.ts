import {
  CategoriaSoftware,
  ComparacionVersion,
  EstadoSolicitud,
  RolCuenta,
  TipoEspacio,
} from '@prisma/client';
import {
  aprobarSolicitud,
  crearSolicitud,
  listarSolicitudes,
  listarSolicitudesDeDocente,
  rechazarSolicitud,
  SolicitudCrearSchema,
  SolicitudListadoQuerySchema,
  SolicitudRechazarSchema,
} from '../../../src/services/solicitudSoftware.service';
import { TokenPayload } from '../../../src/types/auth';

/* ── helpers ─────────────────────────────────────────────── */

const auth: TokenPayload = { sub: 'coord-1', rol: RolCuenta.COORDINACION_ACADEMICA };

const DOCENTE = { id: 'doc-1', nombre: 'Dra. García', codigoDocente: 'D001' };

const SECCION_LAB = {
  id: 'sec-1',
  codigoSeccion: '1',
  periodo: '2026-1',
  tipoEspacioRequerido: TipoEspacio.LABORATORIO,
  curso: { codigo: 'ISW101', nombre: 'Programación' },
};

function solicitudDB(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sol-1',
    docenteId: 'doc-1',
    seccionId: null,
    nombre: 'MATLAB',
    version: 'R2023b',
    categoria: null,
    justificacion: 'Para el laboratorio de señales',
    estado: EstadoSolicitud.PENDIENTE,
    fechaSolicitud: new Date('2026-03-01T10:00:00Z'),
    resueltaPorId: null,
    fechaResolucion: null,
    motivoRechazo: null,
    softwareId: null,
    docente: DOCENTE,
    seccion: null,
    software: null,
    ...overrides,
  };
}

/**
 * Prisma en memoria con la forma mínima que usa el servicio. `$transaction` ejecuta el callback
 * sobre el mismo objeto, como en el resto de las suites.
 */
function dbMock(
  opciones: {
    docente?: unknown;
    seccion?: unknown;
    software?: unknown;
    solicitud?: unknown;
    solicitudes?: unknown[];
    total?: number;
  } = {},
) {
  const tx = {
    docente: {
      findUnique: jest
        .fn()
        .mockResolvedValue(opciones.docente === undefined ? DOCENTE : opciones.docente),
    },
    seccion: { findUnique: jest.fn().mockResolvedValue(opciones.seccion ?? null) },
    software: {
      findUnique: jest.fn().mockResolvedValue(opciones.software ?? null),
      create: jest.fn().mockImplementation(async ({ data }) => ({
        id: 'sw-nuevo',
        activo: true,
        ...data,
      })),
    },
    solicitudSoftware: {
      create: jest
        .fn()
        .mockImplementation(async ({ data }) => solicitudDB({ ...data, seccion: null })),
      findUnique: jest.fn().mockResolvedValue(opciones.solicitud ?? null),
      findMany: jest.fn().mockResolvedValue(opciones.solicitudes ?? []),
      count: jest.fn().mockResolvedValue(opciones.total ?? 0),
      update: jest.fn().mockImplementation(async ({ data }) => solicitudDB(data)),
    },
    seccionSoftware: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
  };

  return {
    ...tx,
    $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(tx)),
    __tx: tx,
  } as any;
}

/* ── suite: contratos Zod (Spec 08, §2.3) ────────────────── */

describe('Contratos de solicitudes de software (Issue 4.29)', () => {
  it('SolicitudCrearSchema exige nombre y justificación, y usa versión vacía por defecto', () => {
    const datos = SolicitudCrearSchema.parse({ nombre: ' MATLAB ', justificacion: '  Señales ' });

    expect(datos).toMatchObject({ nombre: 'MATLAB', version: '', justificacion: 'Señales' });
    expect(() => SolicitudCrearSchema.parse({ nombre: 'MATLAB' })).toThrow();
    expect(() => SolicitudCrearSchema.parse({ nombre: '', justificacion: 'x' })).toThrow();
  });

  it('SolicitudCrearSchema rechaza campos desconocidos y secciones que no son uuid', () => {
    expect(() =>
      SolicitudCrearSchema.parse({ nombre: 'MATLAB', justificacion: 'x', extra: 1 }),
    ).toThrow();
    expect(() =>
      SolicitudCrearSchema.parse({ nombre: 'MATLAB', justificacion: 'x', seccionId: 'no-uuid' }),
    ).toThrow();
  });

  it('SolicitudRechazarSchema exige el motivo', () => {
    expect(SolicitudRechazarSchema.parse({ motivoRechazo: ' Ya existe ' }).motivoRechazo).toBe(
      'Ya existe',
    );
    expect(() => SolicitudRechazarSchema.parse({})).toThrow();
  });

  it('SolicitudListadoQuerySchema pagina con valores por defecto y valida el estado', () => {
    expect(SolicitudListadoQuerySchema.parse({})).toEqual({ page: 1, limit: 50 });
    expect(SolicitudListadoQuerySchema.parse({ estado: 'PENDIENTE', page: '2' })).toMatchObject({
      estado: EstadoSolicitud.PENDIENTE,
      page: 2,
    });
    expect(() => SolicitudListadoQuerySchema.parse({ estado: 'OTRO' })).toThrow();
  });
});

/* ── suite: el docente crea y consulta ───────────────────── */

describe('Solicitudes del docente (Issue 4.29)', () => {
  it('crea la solicitud con el docente de la cuenta y separa la versión del nombre', async () => {
    const db = dbMock();

    const res = await crearSolicitud(
      'cuenta-doc',
      {
        nombre: 'MATLAB R2023b',
        version: '',
        categoria: CategoriaSoftware.SIMULACION,
        justificacion: 'Para el laboratorio de señales',
      },
      db,
    );

    expect(db.docente.findUnique).toHaveBeenCalledWith({ where: { cuentaId: 'cuenta-doc' } });
    expect(db.solicitudSoftware.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          docenteId: 'doc-1',
          nombre: 'MATLAB',
          version: 'R2023b',
          categoria: CategoriaSoftware.SIMULACION,
          seccionId: null,
        }),
      }),
    );
    expect(res).toMatchObject({ nombre: 'MATLAB', version: 'R2023b', estado: 'PENDIENTE' });
  });

  it('409 con el id existente si el software ya está en el catálogo', async () => {
    const db = dbMock({ software: { id: 'sw-matlab' } });

    await expect(
      crearSolicitud(
        'cuenta-doc',
        { nombre: 'MATLAB R2023b', version: '', justificacion: 'x' },
        db,
      ),
    ).rejects.toMatchObject({
      status: 409,
      message: expect.stringMatching(/MATLAB R2023b.*sw-matlab/),
    });
    expect(db.solicitudSoftware.create).not.toHaveBeenCalled();
  });

  it('404 si la sección indicada no existe', async () => {
    const db = dbMock({ seccion: null });

    await expect(
      crearSolicitud(
        'cuenta-doc',
        {
          nombre: 'MATLAB',
          version: '',
          justificacion: 'x',
          seccionId: '00000000-0000-4000-8000-000000000001',
        },
        db,
      ),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('404 si la cuenta no tiene docente asociado', async () => {
    const db = dbMock({ docente: null });

    await expect(
      crearSolicitud('cuenta-x', { nombre: 'MATLAB', version: '', justificacion: 'x' }, db),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('lista solo las solicitudes propias', async () => {
    const db = dbMock({ solicitudes: [solicitudDB(), solicitudDB({ id: 'sol-2' })] });

    const res = await listarSolicitudesDeDocente('cuenta-doc', db);

    expect(db.solicitudSoftware.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { docenteId: 'doc-1' } }),
    );
    expect(res.map((s) => s.id)).toEqual(['sol-1', 'sol-2']);
  });
});

/* ── suite: Coordinación lista, aprueba y rechaza ────────── */

describe('Resolución por Coordinación (Issue 4.29)', () => {
  it('lista con filtro de estado y paginación', async () => {
    const db = dbMock({ solicitudes: [solicitudDB()], total: 7 });

    const res = await listarSolicitudes(
      { estado: EstadoSolicitud.PENDIENTE, page: 2, limit: 5 },
      db,
    );

    expect(db.solicitudSoftware.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { estado: EstadoSolicitud.PENDIENTE },
        skip: 5,
        take: 5,
      }),
    );
    expect(res).toMatchObject({ total: 7, page: 2, limit: 5 });
  });

  it('aprobar crea el Software con la categoría sugerida y marca la solicitud', async () => {
    const db = dbMock({
      solicitud: solicitudDB({ categoria: CategoriaSoftware.SIMULACION }),
    });

    const res = await aprobarSolicitud('sol-1', auth, { agregarASeccion: false }, db);

    expect(db.__tx.software.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        nombre: 'MATLAB',
        nombreNormalizado: 'matlab',
        version: 'R2023b',
        categoria: CategoriaSoftware.SIMULACION,
        creadoPorId: 'coord-1',
      }),
    });
    expect(db.__tx.solicitudSoftware.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sol-1' },
        data: expect.objectContaining({
          estado: EstadoSolicitud.APROBADA,
          softwareId: 'sw-nuevo',
          resueltaPorId: 'coord-1',
        }),
      }),
    );
    expect(res).toMatchObject({ agregadaASeccion: false });
  });

  it('aprobar vincula el software si otra cuenta ya lo creó, sin duplicarlo', async () => {
    const db = dbMock({ solicitud: solicitudDB(), software: { id: 'sw-ya-existe', activo: true } });

    await aprobarSolicitud('sol-1', auth, { agregarASeccion: false }, db);

    expect(db.__tx.software.create).not.toHaveBeenCalled();
    expect(db.__tx.solicitudSoftware.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ softwareId: 'sw-ya-existe' }),
      }),
    );
  });

  it('422 si el software vinculado está dado de baja en el catálogo', async () => {
    const db = dbMock({ solicitud: solicitudDB(), software: { id: 'sw-x', activo: false } });

    await expect(
      aprobarSolicitud('sol-1', auth, { agregarASeccion: false }, db),
    ).rejects.toMatchObject({ status: 422, message: expect.stringContaining('dado de baja') });
    expect(db.__tx.solicitudSoftware.update).not.toHaveBeenCalled();
  });

  it('404 si la solicitud no existe', async () => {
    const db = dbMock({ solicitud: null });

    await expect(
      aprobarSolicitud('sol-x', auth, { agregarASeccion: false }, db),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('409 si la solicitud ya fue resuelta', async () => {
    const db = dbMock({ solicitud: solicitudDB({ estado: EstadoSolicitud.APROBADA }) });

    await expect(
      aprobarSolicitud('sol-1', auth, { agregarASeccion: false }, db),
    ).rejects.toMatchObject({ status: 409, message: expect.stringContaining('ya fue aprobada') });
  });

  it('agregarASeccion deja el requerimiento con EXACTA si la solicitud declara versión', async () => {
    const db = dbMock({ solicitud: solicitudDB({ seccionId: 'sec-1', seccion: SECCION_LAB }) });

    const res = await aprobarSolicitud('sol-1', auth, { agregarASeccion: true }, db);

    expect(db.__tx.seccionSoftware.createMany).toHaveBeenCalledWith({
      data: [
        {
          seccionId: 'sec-1',
          softwareId: 'sw-nuevo',
          comparacionVersion: ComparacionVersion.EXACTA,
        },
      ],
      skipDuplicates: true,
    });
    expect(res.agregadaASeccion).toBe(true);
  });

  it('agregarASeccion usa CUALQUIERA si la solicitud no declara versión', async () => {
    const db = dbMock({
      solicitud: solicitudDB({ version: '', seccionId: 'sec-1', seccion: SECCION_LAB }),
    });

    await aprobarSolicitud('sol-1', auth, { agregarASeccion: true }, db);

    expect(db.__tx.seccionSoftware.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [expect.objectContaining({ comparacionVersion: ComparacionVersion.CUALQUIERA })],
      }),
    );
  });

  it('422 si se pide agregar a una sección que no existe o que es aula teórica', async () => {
    const sinSeccion = dbMock({ solicitud: solicitudDB() });
    await expect(
      aprobarSolicitud('sol-1', auth, { agregarASeccion: true }, sinSeccion),
    ).rejects.toMatchObject({ status: 422 });

    const aula = dbMock({
      solicitud: solicitudDB({
        seccionId: 'sec-2',
        seccion: { ...SECCION_LAB, tipoEspacioRequerido: TipoEspacio.AULA_TEORICA },
      }),
    });
    await expect(
      aprobarSolicitud('sol-1', auth, { agregarASeccion: true }, aula),
    ).rejects.toMatchObject({ status: 422, message: expect.stringContaining('aula teórica') });
  });

  it('rechazar guarda el motivo, quién resolvió y cuándo', async () => {
    const db = dbMock({ solicitud: solicitudDB() });

    await rechazarSolicitud('sol-1', auth, { motivoRechazo: 'Ya está en el catálogo' }, db);

    expect(db.__tx.solicitudSoftware.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sol-1' },
        data: expect.objectContaining({
          estado: EstadoSolicitud.RECHAZADA,
          motivoRechazo: 'Ya está en el catálogo',
          resueltaPorId: 'coord-1',
          fechaResolucion: expect.any(Date),
        }),
      }),
    );
  });

  it('409 si se intenta rechazar una solicitud ya resuelta', async () => {
    const db = dbMock({ solicitud: solicitudDB({ estado: EstadoSolicitud.RECHAZADA }) });

    await expect(
      rechazarSolicitud('sol-1', auth, { motivoRechazo: 'x' }, db),
    ).rejects.toMatchObject({ status: 409, message: expect.stringContaining('ya fue rechazada') });
  });
});

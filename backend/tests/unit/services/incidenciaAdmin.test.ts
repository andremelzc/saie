import { RolCuenta, EstadoIncidencia, PrioridadIncidencia } from '@prisma/client';
import {
  listarIncidencias,
  cerrarIncidencia,
  CerrarIncidenciaSchema,
} from '../../../src/services/incidenciaAdmin.service';
import { TokenPayload } from '../../../src/types/auth';
import { HttpError } from '../../../src/lib/http';

/* ── helpers ─────────────────────────────────────────────── */

const authCoord: TokenPayload = { sub: 'coord1', rol: RolCuenta.COORDINACION_ACADEMICA };
const authJefatura: TokenPayload = { sub: 'jef1', rol: RolCuenta.JEFATURA_LABORATORIOS };

function incidenciaCompleta(overrides: Record<string, any> = {}) {
  return {
    id: 'inc1',
    identificadorSeguimiento: 'INC-AABB0011',
    tipo: 'EQUIPO_NO_OPERATIVO',
    prioridad: 'MEDIA' as const,
    estado: 'PENDIENTE' as const,
    descripcion: 'El proyector no enciende',
    evidencia: null,
    fechaReporte: new Date('2026-09-01'),
    comentarioCierre: null,
    fechaCierre: null,
    asignacionId: 'a1',
    espacioId: 'e1',
    espacio: { id: 'e1', identificador: 'Lab 01', pabellon: 'A', piso: 1 },
    docente: { codigoDocente: 'D001', nombre: 'Dr. López' },
    asignacion: {
      seccion: { curso: { codigo: 'ISW101', nombre: 'Programación' }, codigoSeccion: '1' },
    },
    ...overrides,
  };
}

function listDbMock(incidencias: any[] = []) {
  return {
    incidencia: {
      findMany: jest.fn().mockResolvedValue(incidencias),
    },
  } as any;
}

function closeDbMock(incidencia: any | null, responsable: any | null = null) {
  const updatedInc = incidencia
    ? {
        ...incidencia,
        estado: 'RESUELTA',
        comentarioCierre: 'Resuelto',
        fechaCierre: new Date(),
      }
    : null;

  return {
    $transaction: jest.fn().mockImplementation(async (fn: Function) => {
      return fn({
        incidencia: {
          findUnique: jest.fn().mockResolvedValue(incidencia),
          update: jest.fn().mockResolvedValue(updatedInc),
        },
        espacioResponsable: {
          findUnique: jest.fn().mockResolvedValue(responsable),
        },
      });
    }),
  } as any;
}

/* ── suite: listar ───────────────────────────────────────── */

describe('Listado de incidencias (Issue 7.6)', () => {
  it('por defecto lista PENDIENTES, ordenadas por mayor prioridad y antigüedad', async () => {
    const inc1 = incidenciaCompleta({
      id: 'i1',
      prioridad: 'BAJA',
      fechaReporte: new Date('2026-09-01'),
    });
    const inc2 = incidenciaCompleta({
      id: 'i2',
      prioridad: 'ALTA',
      fechaReporte: new Date('2026-09-05'),
    });
    const inc3 = incidenciaCompleta({
      id: 'i3',
      prioridad: 'MEDIA',
      fechaReporte: new Date('2026-09-02'),
    });

    const db = listDbMock([inc1, inc2, inc3]);
    const res = await listarIncidencias({}, authCoord, db);

    // Orden: ALTA primero, luego MEDIA, luego BAJA
    expect(res[0].prioridad).toBe('ALTA');
    expect(res[1].prioridad).toBe('MEDIA');
    expect(res[2].prioridad).toBe('BAJA');
  });

  it('filtra por estado', async () => {
    const db = listDbMock([]);
    await listarIncidencias({ estado: EstadoIncidencia.RESUELTA }, authCoord, db);

    expect(db.incidencia.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ estado: 'RESUELTA' }),
      }),
    );
  });

  it('filtra por prioridad y espacioId', async () => {
    const db = listDbMock([]);
    await listarIncidencias(
      { prioridad: PrioridadIncidencia.ALTA, espacioId: 'e5' },
      authCoord,
      db,
    );

    expect(db.incidencia.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          prioridad: 'ALTA',
          espacioId: 'e5',
        }),
      }),
    );
  });

  it('Jefatura solo ve las de los laboratorios a su cargo (filtra por espacioResponsable)', async () => {
    const db = listDbMock([]);
    await listarIncidencias({}, authJefatura, db);

    expect(db.incidencia.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          espacio: { responsables: { some: { cuentaId: 'jef1' } } },
        }),
      }),
    );
  });

  it('la respuesta mapea los campos del DTO correctamente', async () => {
    const inc = incidenciaCompleta();
    const db = listDbMock([inc]);
    const res = await listarIncidencias({}, authCoord, db);

    expect(res[0]).toMatchObject({
      id: 'inc1',
      identificadorSeguimiento: 'INC-AABB0011',
      tipo: 'EQUIPO_NO_OPERATIVO',
      estado: 'PENDIENTE',
      espacio: { identificador: 'Lab 01' },
      docente: { codigo: 'D001', nombre: 'Dr. López' },
      asignacion: { codigoCurso: 'ISW101' },
    });
  });
});

/* ── suite: cerrar ───────────────────────────────────────── */

describe('Cierre de incidencia (Issue 7.6)', () => {
  it('404 si la incidencia no existe', async () => {
    const db = closeDbMock(null);
    await expect(
      cerrarIncidencia('fake', { estado: 'RESUELTA', comentario: 'Hecho' }, authCoord, db),
    ).rejects.toThrow(HttpError);
    await expect(
      cerrarIncidencia('fake', { estado: 'RESUELTA', comentario: 'Hecho' }, authCoord, db),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('403 si Jefatura no es responsable del espacio', async () => {
    const inc = { id: 'inc1', estado: 'PENDIENTE', espacioId: 'e1' };
    const db = closeDbMock(inc, null); // no responsable

    await expect(
      cerrarIncidencia('inc1', { estado: 'RESUELTA', comentario: 'Listo' }, authJefatura, db),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('409 si la incidencia ya fue cerrada', async () => {
    const inc = { id: 'inc1', estado: 'RESUELTA', espacioId: 'e1' };
    const db = closeDbMock(inc);

    await expect(
      cerrarIncidencia('inc1', { estado: 'RESUELTA', comentario: 'OK' }, authCoord, db),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('Coordinación puede cerrar cualquier incidencia pendiente', async () => {
    const inc = incidenciaCompleta({ estado: 'PENDIENTE' });
    const db = {
      $transaction: jest.fn().mockImplementation(async (fn: Function) =>
        fn({
          incidencia: {
            findUnique: jest.fn().mockResolvedValue(inc),
            update: jest.fn().mockResolvedValue({
              ...inc,
              estado: 'RESUELTA',
              comentarioCierre: 'Solucionado',
              fechaCierre: new Date(),
            }),
          },
          espacioResponsable: {
            findUnique: jest.fn(),
          },
        }),
      ),
    } as any;

    const res = await cerrarIncidencia(
      'inc1',
      { estado: 'RESUELTA', comentario: 'Solucionado' },
      authCoord,
      db,
    );

    expect(res.estado).toBe('RESUELTA');
    expect(res.comentarioCierre).toBe('Solucionado');
    expect(res.fechaCierre).toBeInstanceOf(Date);
  });
});

/* ── suite: schema validación ────────────────────────────── */

describe('CerrarIncidenciaSchema', () => {
  it('acepta RESUELTA con comentario de 3+ caracteres', () => {
    expect(() =>
      CerrarIncidenciaSchema.parse({ estado: 'RESUELTA', comentario: 'OK!' }),
    ).not.toThrow();
  });

  it('acepta DESCARTADA', () => {
    expect(() =>
      CerrarIncidenciaSchema.parse({ estado: 'DESCARTADA', comentario: 'No aplica' }),
    ).not.toThrow();
  });

  it('rechaza estado inválido', () => {
    expect(() =>
      CerrarIncidenciaSchema.parse({ estado: 'ABIERTA', comentario: 'Hola' }),
    ).toThrow();
  });

  it('rechaza comentario menor a 3 caracteres', () => {
    expect(() =>
      CerrarIncidenciaSchema.parse({ estado: 'RESUELTA', comentario: 'AB' }),
    ).toThrow();
  });

  it('rechaza comentario mayor a 1000 caracteres', () => {
    expect(() =>
      CerrarIncidenciaSchema.parse({ estado: 'RESUELTA', comentario: 'x'.repeat(1001) }),
    ).toThrow();
  });

  it('rechaza campos desconocidos (strict)', () => {
    expect(() =>
      CerrarIncidenciaSchema.parse({ estado: 'RESUELTA', comentario: 'OK!', extra: true }),
    ).toThrow();
  });
});

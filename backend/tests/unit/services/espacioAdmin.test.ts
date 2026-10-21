import { RolCuenta, TipoEspacio, Prisma } from '@prisma/client';
import {
  camposEditables,
  CrearEspacioSchema,
  ActualizarEspacioSchema,
  crearEspacio,
  listarEspacios,
  obtenerEspacioAdmin,
  actualizarEspacio,
} from '../../../src/services/espacioAdmin.service';
import { TokenPayload } from '../../../src/types/auth';

/* ── helpers ─────────────────────────────────────────────── */

const authCoord: TokenPayload = { sub: 'coord1', rol: RolCuenta.COORDINACION_ACADEMICA };
const authJefatura: TokenPayload = { sub: 'jef1', rol: RolCuenta.JEFATURA_LABORATORIOS };

/** Id de catálogo válido (uuid) para los esquemas de alta. */
const UUID_SOFTWARE = '00000000-0000-4000-8000-000000000001';

function espacioDB(overrides: Record<string, any> = {}) {
  return {
    id: 'e1',
    identificador: 'Lab 01',
    tipo: TipoEspacio.LABORATORIO,
    pabellon: 'A',
    piso: 1,
    aforoNominal: 40,
    pcsMalogradas: 2,
    softwareInstaladoCatalogo: [
      { espacioId: 'e1', softwareId: 'sw-docker', software: { nombre: 'Docker', version: '' } },
      { espacioId: 'e1', softwareId: 'sw-node', software: { nombre: 'Node.js', version: '' } },
    ],
    ...overrides,
  };
}

/* ── suite: camposEditables (Issue 4.15) ─────────────────── */

describe('camposEditables por rol y tipo (Issue 4.15)', () => {
  it('Coordinación edita todos los campos de un laboratorio', () => {
    const campos = camposEditables(RolCuenta.COORDINACION_ACADEMICA, TipoEspacio.LABORATORIO);
    expect(campos).toContain('identificador');
    expect(campos).toContain('pabellon');
    expect(campos).toContain('aforoNominal');
    expect(campos).toContain('contiguos');
    expect(campos).toContain('softwareIds');
    expect(campos).toContain('pcsMalogradas');
  });

  it('Coordinación NO puede editar software ni PCs de un aula teórica', () => {
    const campos = camposEditables(RolCuenta.COORDINACION_ACADEMICA, TipoEspacio.AULA_TEORICA);
    expect(campos).not.toContain('softwareIds');
    expect(campos).not.toContain('pcsMalogradas');
    expect(campos).toContain('identificador');
  });

  it('Jefatura solo edita PCs y software de laboratorios', () => {
    const campos = camposEditables(RolCuenta.JEFATURA_LABORATORIOS, TipoEspacio.LABORATORIO);
    expect(campos).toEqual(expect.arrayContaining(['softwareIds', 'pcsMalogradas']));
    expect(campos).not.toContain('identificador');
    expect(campos).not.toContain('pabellon');
  });

  it('Jefatura no edita nada de un aula teórica', () => {
    const campos = camposEditables(RolCuenta.JEFATURA_LABORATORIOS, TipoEspacio.AULA_TEORICA);
    expect(campos).toEqual([]);
  });

  it('Otros roles no pueden editar nada', () => {
    expect(camposEditables(RolCuenta.ALUMNO, TipoEspacio.LABORATORIO)).toEqual([]);
    expect(camposEditables(RolCuenta.DOCENTE, TipoEspacio.AULA_TEORICA)).toEqual([]);
  });
});

/* ── suite: CrearEspacioSchema ───────────────────────────── */

describe('CrearEspacioSchema', () => {
  it('acepta un aula teórica sin PCs ni software', () => {
    expect(() =>
      CrearEspacioSchema.parse({
        identificador: 'A-101',
        tipo: 'AULA_TEORICA',
        pabellon: 'A',
        piso: 1,
        aforoNominal: 50,
      }),
    ).not.toThrow();
  });

  it('acepta un laboratorio con PCs y software', () => {
    expect(() =>
      CrearEspacioSchema.parse({
        identificador: 'Lab 01',
        tipo: 'LABORATORIO',
        pabellon: 'B',
        piso: 2,
        aforoNominal: 30,
        softwareIds: [UUID_SOFTWARE],
        pcsMalogradas: 3,
      }),
    ).not.toThrow();
  });

  it('rechaza PCs y software en un aula teórica', () => {
    expect(() =>
      CrearEspacioSchema.parse({
        identificador: 'A-101',
        tipo: 'AULA_TEORICA',
        pabellon: 'A',
        piso: 1,
        aforoNominal: 50,
        pcsMalogradas: 2,
      }),
    ).toThrow();
  });

  it('rechaza PCs malogradas que excedan el aforo nominal de un laboratorio', () => {
    expect(() =>
      CrearEspacioSchema.parse({
        identificador: 'Lab 02',
        tipo: 'LABORATORIO',
        pabellon: 'A',
        piso: 1,
        aforoNominal: 10,
        pcsMalogradas: 15,
      }),
    ).toThrow();
  });

  it('rechaza campos desconocidos (strict)', () => {
    expect(() =>
      CrearEspacioSchema.parse({
        identificador: 'A-101',
        tipo: 'AULA_TEORICA',
        pabellon: 'A',
        piso: 1,
        aforoNominal: 50,
        extra: true,
      }),
    ).toThrow();
  });
});

/* ── suite: ActualizarEspacioSchema ──────────────────────── */

describe('ActualizarEspacioSchema', () => {
  it('acepta al menos un campo', () => {
    expect(() => ActualizarEspacioSchema.parse({ aforoNominal: 60 })).not.toThrow();
  });

  it('rechaza si no se envía ningún campo (refine)', () => {
    expect(() => ActualizarEspacioSchema.parse({})).toThrow();
  });
});

/* ── suite: listar espacios ──────────────────────────────── */

describe('listarEspacios (Issue 4.15)', () => {
  it('Jefatura solo ve laboratorios que tiene a su cargo', async () => {
    const db = {
      espacio: { findMany: jest.fn().mockResolvedValue([]) },
      espacioContiguo: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;

    await listarEspacios({}, authJefatura, db);

    expect(db.espacio.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tipo: 'LABORATORIO',
          responsables: { some: { cuentaId: 'jef1' } },
        }),
      }),
    );
  });
});

/* ── suite: actualizar espacio ────────────────────────────── */

describe('actualizarEspacio (Issue 4.15)', () => {
  it('403 si Jefatura intenta cambiar un campo de Coordinación (ej. pabellon)', async () => {
    const e = espacioDB();
    const db = {
      espacio: { findUnique: jest.fn().mockResolvedValue(e) },
      espacioResponsable: {
        findUnique: jest.fn().mockResolvedValue({ cuentaId: 'jef1', espacioId: 'e1' }),
      },
    } as any;

    await expect(
      actualizarEspacio('e1', { pabellon: 'Z' }, authJefatura, db),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('400 si se envían campos de laboratorio sobre un aula teórica', async () => {
    const e = espacioDB({ tipo: TipoEspacio.AULA_TEORICA, pcsMalogradas: null });
    const db = {
      espacio: { findUnique: jest.fn().mockResolvedValue(e) },
      espacioResponsable: { findUnique: jest.fn() },
    } as any;

    await expect(
      actualizarEspacio('e1', { pcsMalogradas: 3 }, authCoord, db),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('422 si PCs malogradas superan el aforo nominal del laboratorio', async () => {
    const e = espacioDB({ aforoNominal: 10, pcsMalogradas: 2 });
    const db = {
      espacio: { findUnique: jest.fn().mockResolvedValue(e) },
      espacioResponsable: { findUnique: jest.fn() },
    } as any;

    await expect(
      actualizarEspacio('e1', { pcsMalogradas: 15 }, authCoord, db),
    ).rejects.toMatchObject({ status: 422 });
  });
});

/* ── suite: validarContiguos (integrado en crearEspacio) ─── */

describe('crearEspacio — validaciones de contigüidad y catálogo (Issue 4.15 / 4.28)', () => {
  /** Catálogo simulado que resuelve `resolverSoftwareIds`. */
  const catalogo = [
    { id: UUID_SOFTWARE, nombre: 'Git', nombreNormalizado: 'git', version: '', activo: true },
  ];

  function createDb(
    vecinos: any[] = [],
    throwOnCreate = false,
    software: Array<Record<string, unknown>> = catalogo,
  ) {
    const p2002 = new Prisma.PrismaClientKnownRequestError('', {
      code: 'P2002',
      clientVersion: '1',
    });

    const tx = {
      espacio: {
        create: throwOnCreate
          ? jest.fn().mockRejectedValue(p2002)
          : jest.fn().mockImplementation(async ({ data }: any) => ({
              id: 'nuevo-id',
              ...data,
            })),
        findMany: jest.fn().mockResolvedValue(vecinos),
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue(
            espacioDB({ id: 'nuevo-id', identificador: 'Lab 99', softwareInstaladoCatalogo: [] }),
          ),
      },
      software: { findMany: jest.fn().mockResolvedValue(software) },
      espacioSoftware: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
      espacioContiguo: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    return {
      $transaction: jest.fn().mockImplementation(async (fn: (tx: any) => Promise<any>) => fn(tx)),
      __tx: tx,
    } as any;
  }

  it('crea las relaciones de software del catálogo a partir de los ids', async () => {
    const db = createDb();

    await crearEspacio(
      {
        identificador: 'Lab 99',
        tipo: TipoEspacio.LABORATORIO,
        pabellon: 'A',
        piso: 1,
        aforoNominal: 30,
        softwareIds: [UUID_SOFTWARE],
      },
      authCoord,
      db,
    );

    expect(db.__tx.espacioSoftware.createMany).toHaveBeenCalledWith({
      data: [{ espacioId: 'nuevo-id', softwareId: UUID_SOFTWARE, registradoPorId: 'coord1' }],
    });
  });

  it('404 si algún software no existe en el catálogo y no crea el espacio', async () => {
    const db = createDb([], false, []);

    await expect(
      crearEspacio(
        {
          identificador: 'Lab 99',
          tipo: TipoEspacio.LABORATORIO,
          pabellon: 'A',
          piso: 1,
          aforoNominal: 30,
          softwareIds: [UUID_SOFTWARE],
        },
        authCoord,
        db,
      ),
    ).rejects.toMatchObject({ status: 404 });
    expect(db.__tx.espacioSoftware.createMany).not.toHaveBeenCalled();
  });

  it('422 si el software está dado de baja', async () => {
    const db = createDb([], false, [{ ...catalogo[0], activo: false }]);

    await expect(
      crearEspacio(
        {
          identificador: 'Lab 99',
          tipo: TipoEspacio.LABORATORIO,
          pabellon: 'A',
          piso: 1,
          aforoNominal: 30,
          softwareIds: [UUID_SOFTWARE],
        },
        authCoord,
        db,
      ),
    ).rejects.toMatchObject({ status: 422, message: expect.stringContaining('dado de baja') });
  });

  it('422 si un espacio contiguo es de tipo distinto al nuevo', async () => {
    const db = createDb([{ id: 'vecino', tipo: TipoEspacio.AULA_TEORICA }]);

    await expect(
      crearEspacio(
        {
          identificador: 'Lab 99',
          tipo: TipoEspacio.LABORATORIO,
          pabellon: 'A',
          piso: 1,
          aforoNominal: 30,
          contiguos: ['vecino'],
        },
        authCoord,
        db,
      ),
    ).rejects.toMatchObject({ status: 422, message: expect.stringContaining('mismo tipo') });
  });

  it('404 si alguno de los contiguos no existe', async () => {
    const db = createDb([]); // findMany devuelve vacío pero se pidió 1

    await expect(
      crearEspacio(
        {
          identificador: 'Lab 99',
          tipo: TipoEspacio.LABORATORIO,
          pabellon: 'A',
          piso: 1,
          aforoNominal: 30,
          contiguos: ['inexistente'],
        },
        authCoord,
        db,
      ),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('409 si el identificador duplicado causa un P2002', async () => {
    const db = createDb([], true);

    await expect(
      crearEspacio(
        {
          identificador: 'Lab 01',
          tipo: TipoEspacio.LABORATORIO,
          pabellon: 'A',
          piso: 1,
          aforoNominal: 30,
        },
        authCoord,
        db,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
});

/* ── suite: obtener y listar espacios ─────────────────────── */

describe('obtenerEspacioAdmin y listarEspacios (Issue 4.15)', () => {
  it('obtenerEspacioAdmin devuelve el espacio con sus contiguos ordenados', async () => {
    const db = {
      espacio: {
        findUnique: jest.fn().mockResolvedValue(espacioDB({ id: 'e1', identificador: 'Lab 01' })),
      },
      espacioResponsable: { findUnique: jest.fn().mockResolvedValue({ id: 'r1' }) },
      espacioContiguo: {
        findMany: jest.fn().mockResolvedValue([{ espacioIdB: 'e3' }, { espacioIdB: 'e2' }]),
      },
    } as any;

    const res = await obtenerEspacioAdmin('e1', authCoord, db);
    expect(res.id).toBe('e1');
    expect(res.contiguos).toEqual(['e2', 'e3']);
  });

  it('obtenerEspacioAdmin lanza 404 si el espacio no existe', async () => {
    const db = {
      espacio: { findUnique: jest.fn().mockResolvedValue(null) },
    } as any;

    await expect(obtenerEspacioAdmin('inexistente', authCoord, db)).rejects.toMatchObject({
      status: 404,
    });
  });

  it('listarEspacios lista espacios y los transforma a DTO', async () => {
    const db = {
      espacio: {
        findMany: jest.fn().mockResolvedValue([espacioDB({ id: 'e1', identificador: 'Lab 01' })]),
      },
      espacioContiguo: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;

    const res = await listarEspacios({}, authCoord, db);
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('e1');
  });
});

/* ── suite: actualizar espacio ────────────────────────────── */

describe('actualizarEspacio (Issue 4.15)', () => {
  function updateDb({
    actual = espacioDB({ id: 'e1', aforoNominal: 30, pcsMalogradas: 2 }),
    throwP2002 = false,
  } = {}) {
    const p2002 = new Prisma.PrismaClientKnownRequestError('', {
      code: 'P2002',
      clientVersion: '1',
    });

    const txMock = {
      espacio: {
        update: throwP2002
          ? jest.fn().mockRejectedValue(p2002)
          : jest.fn().mockImplementation(async ({ data }: any) => ({ ...actual, ...data })),
      },
      espacioContiguo: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      asignacion: { findMany: jest.fn().mockResolvedValue([]) },
      alerta: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
    };

    return {
      espacio: {
        findUnique: jest.fn().mockResolvedValue(actual),
      },
      espacioResponsable: { findUnique: jest.fn().mockResolvedValue({ id: 'r1' }) },
      espacioContiguo: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest
        .fn()
        .mockImplementation(async (fn: (tx: any) => Promise<any>) => fn(txMock)),
    } as any;
  }

  it('Coordinación actualiza campos propios con éxito', async () => {
    const db = updateDb();
    const res = await actualizarEspacio(
      'e1',
      { identificador: 'Lab 01 Mod', aforoNominal: 35 },
      authCoord,
      db,
    );

    expect(res.espacio).toBeDefined();
    expect(res.alertas).toEqual([]);
  });

  it('409 si el identificador en actualización causa un P2002', async () => {
    const db = updateDb({ throwP2002: true });

    await expect(
      actualizarEspacio('e1', { identificador: 'Lab Ocupado' }, authCoord, db),
    ).rejects.toMatchObject({ status: 409 });
  });
});

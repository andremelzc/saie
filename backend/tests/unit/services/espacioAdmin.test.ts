import { RolCuenta, TipoEspacio, Prisma } from '@prisma/client';
import {
  camposEditables,
  CrearEspacioSchema,
  ActualizarEspacioSchema,
  crearEspacio,
  listarEspacios,
  actualizarEspacio,
} from '../../../src/services/espacioAdmin.service';
import { TokenPayload } from '../../../src/types/auth';
import { HttpError } from '../../../src/lib/http';

/* ── helpers ─────────────────────────────────────────────── */

const authCoord: TokenPayload = { sub: 'coord1', rol: RolCuenta.COORDINACION_ACADEMICA };
const authJefatura: TokenPayload = { sub: 'jef1', rol: RolCuenta.JEFATURA_LABORATORIOS };

function espacioDB(overrides: Record<string, any> = {}) {
  return {
    id: 'e1',
    identificador: 'Lab 01',
    tipo: TipoEspacio.LABORATORIO,
    pabellon: 'A',
    piso: 1,
    aforoNominal: 40,
    pcsMalogradas: 2,
    softwareInstalado: ['Docker', 'Node.js'],
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
    expect(campos).toContain('softwareInstalado');
    expect(campos).toContain('pcsMalogradas');
  });

  it('Coordinación NO puede editar software ni PCs de un aula teórica', () => {
    const campos = camposEditables(RolCuenta.COORDINACION_ACADEMICA, TipoEspacio.AULA_TEORICA);
    expect(campos).not.toContain('softwareInstalado');
    expect(campos).not.toContain('pcsMalogradas');
    expect(campos).toContain('identificador');
  });

  it('Jefatura solo edita PCs y software de laboratorios', () => {
    const campos = camposEditables(RolCuenta.JEFATURA_LABORATORIOS, TipoEspacio.LABORATORIO);
    expect(campos).toEqual(expect.arrayContaining(['softwareInstalado', 'pcsMalogradas']));
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
        softwareInstalado: ['Docker'],
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
    expect(() =>
      ActualizarEspacioSchema.parse({ aforoNominal: 60 }),
    ).not.toThrow();
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

describe('crearEspacio — validaciones de contigüidad (Issue 4.15)', () => {
  function createDb(vecinos: any[] = [], throwOnCreate = false) {
    const p2002 = new Prisma.PrismaClientKnownRequestError('', {
      code: 'P2002',
      clientVersion: '1',
    });

    return {
      $transaction: jest.fn().mockImplementation(async (fn: Function) => {
        return fn({
          espacio: {
            create: throwOnCreate
              ? jest.fn().mockRejectedValue(p2002)
              : jest.fn().mockImplementation(async ({ data }: any) => ({
                  id: 'nuevo-id',
                  ...data,
                })),
            findMany: jest.fn().mockResolvedValue(vecinos),
          },
          espacioContiguo: {
            deleteMany: jest.fn(),
            createMany: jest.fn(),
            findMany: jest.fn().mockResolvedValue([]),
          },
        });
      }),
    } as any;
  }

  it('422 si un espacio contiguo es de tipo distinto al nuevo', async () => {
    const db = createDb([
      { id: 'vecino', tipo: TipoEspacio.AULA_TEORICA },
    ]);

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

import { EstadoAsignacion, RolCuenta, TipoEspacio } from '@prisma/client';
import {
  actualizarSeccion,
  camposEditablesDeSeccion,
  listarSecciones,
  obtenerSeccionAdmin,
} from '../../../src/services/seccionAdmin.service';

const COORDINACION = {
  sub: 'cuenta-coord',
  rol: RolCuenta.COORDINACION_ACADEMICA,
  email: 'coord@unmsm.edu.pe',
} as never;

const JEFATURA = {
  sub: 'cuenta-jef',
  rol: RolCuenta.JEFATURA_LABORATORIOS,
  email: 'jef@unmsm.edu.pe',
} as never;

function seccion(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sec-1',
    codigoSeccion: '1',
    periodo: '2026-2',
    tipoEspacioRequerido: TipoEspacio.LABORATORIO,
    curso: { codigo: 'IS101', nombre: 'Algoritmos' },
    docente: { id: 'doc-1', codigoDocente: 'D001', nombre: 'Dra. García' },
    horarios: [{ diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00' }],
    _count: { matriculas: 30 },
    softwareRequerido: [
      {
        softwareId: 'sw-docker',
        comparacionVersion: 'MINIMA',
        software: { nombre: 'Docker', version: '24.0' },
      },
    ],
    asignaciones: [
      {
        id: 'asig-1',
        estado: EstadoAsignacion.VIGENTE,
        fechaAsignacion: new Date('2026-10-01T10:00:00Z'),
        corridaId: 'corrida-1',
        motivoEscalamiento: null,
        espacios: [
          {
            espacioId: 'esp-1',
            espacio: {
              id: 'esp-1',
              identificador: 'Lab 03',
              pabellon: 'A',
              piso: 2,
              tipo: TipoEspacio.LABORATORIO,
            },
          },
        ],
      },
    ],
    ...overrides,
  };
}

function dbMock(secciones: unknown[] = [], total = secciones.length) {
  return {
    seccion: {
      count: jest.fn().mockResolvedValue(total),
      findMany: jest.fn().mockResolvedValue(secciones),
      findUnique: jest.fn().mockResolvedValue(secciones[0] ?? null),
      findFirst: jest.fn().mockResolvedValue({ periodo: '2026-2' }),
      update: jest.fn().mockResolvedValue(seccion()),
    },
  } as any;
}

describe('Gestión individual de secciones (Issue 4.31)', () => {
  describe('campos editables por rol', () => {
    it('Coordinación edita el tipo de aula, el docente y el software', () => {
      expect(camposEditablesDeSeccion(RolCuenta.COORDINACION_ACADEMICA)).toEqual([
        'tipoEspacioRequerido',
        'docenteId',
        'softwareRequerido',
      ]);
    });

    it('Jefatura solo consulta', () => {
      expect(camposEditablesDeSeccion(RolCuenta.JEFATURA_LABORATORIOS)).toEqual([]);
    });
  });

  describe('listado', () => {
    it('devuelve las secciones del periodo vigente con su asignación', async () => {
      const db = dbMock([seccion()]);

      const res = await listarSecciones({ pagina: 1, limite: 50 }, COORDINACION, db);

      expect(res.total).toBe(1);
      expect(res.items[0].codigoCurso).toBe('IS101');
      expect(res.items[0].alumnosMatriculados).toBe(30);
      expect(res.items[0].asignacion?.espacios[0].identificador).toBe('Lab 03');
      expect(res.items[0].softwareRequerido[0]).toMatchObject({
        id: 'sw-docker',
        comparacionVersion: 'MINIMA',
      });
      expect(res.items[0].camposEditables).toContain('softwareRequerido');
    });

    it('Jefatura recibe la lista sin campos editables', async () => {
      const db = dbMock([seccion()]);
      const res = await listarSecciones({ pagina: 1, limite: 50 }, JEFATURA, db);
      expect(res.items[0].camposEditables).toEqual([]);
    });

    it('filtra por búsqueda libre en el curso y en el código de sección', async () => {
      const db = dbMock([]);
      await listarSecciones({ q: 'algorit', pagina: 1, limite: 50 }, COORDINACION, db);

      const where = db.seccion.findMany.mock.calls[0][0].where;
      expect(where.OR).toEqual(
        expect.arrayContaining([
          { curso: { codigo: { contains: 'algorit', mode: 'insensitive' } } },
          { curso: { nombre: { contains: 'algorit', mode: 'insensitive' } } },
          { codigoSeccion: { contains: 'algorit', mode: 'insensitive' } },
        ]),
      );
    });

    it('pagina con skip y take', async () => {
      const db = dbMock([]);
      await listarSecciones({ pagina: 3, limite: 20 }, COORDINACION, db);

      const args = db.seccion.findMany.mock.calls[0][0];
      expect(args.skip).toBe(40);
      expect(args.take).toBe(20);
    });
  });

  describe('detalle', () => {
    it('devuelve la sección pedida', async () => {
      const db = dbMock([seccion()]);
      const res = await obtenerSeccionAdmin('sec-1', COORDINACION, db);
      expect(res.id).toBe('sec-1');
    });

    it('404 si la sección no existe', async () => {
      const db = dbMock([]);
      await expect(obtenerSeccionAdmin('nope', COORDINACION, db)).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('edición', () => {
    function prismaEdicion() {
      const tx = {
        docente: { findUnique: jest.fn().mockResolvedValue({ id: 'doc-2' }) },
        seccion: { update: jest.fn().mockResolvedValue(seccion()) },
        seccionSoftware: {
          deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
          createMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        software: {
          findMany: jest
            .fn()
            .mockResolvedValue([
              { id: 'sw-python', nombre: 'Python', version: '3.12', activo: true },
            ]),
        },
      };
      const prisma = {
        seccion: {
          findUnique: jest.fn().mockResolvedValue(seccion({ asignaciones: [] })),
        },
        espacio: { findUnique: jest.fn() },
        asignacion: { findMany: jest.fn().mockResolvedValue([]) },
        alerta: {
          findMany: jest.fn().mockResolvedValue([]),
          create: jest.fn(),
          update: jest.fn(),
        },
        $transaction: jest.fn(async (fn: any) => fn(tx)),
      } as any;
      return { prisma, tx };
    }

    it('Jefatura no puede editar una sección', async () => {
      const { prisma } = prismaEdicion();
      await expect(
        actualizarSeccion(
          'sec-1',
          { tipoEspacioRequerido: TipoEspacio.AULA_TEORICA },
          JEFATURA,
          prisma,
        ),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('404 si la sección no existe', async () => {
      const { prisma } = prismaEdicion();
      prisma.seccion.findUnique.mockResolvedValue(null);
      await expect(
        actualizarSeccion(
          'nope',
          { tipoEspacioRequerido: TipoEspacio.AULA_TEORICA },
          COORDINACION,
          prisma,
        ),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('cambia el tipo de espacio que exige la sección', async () => {
      const { prisma, tx } = prismaEdicion();
      await actualizarSeccion(
        'sec-1',
        { tipoEspacioRequerido: TipoEspacio.AULA_TEORICA },
        COORDINACION,
        prisma,
      );
      expect(tx.seccion.update).toHaveBeenCalledWith({
        where: { id: 'sec-1' },
        data: { tipoEspacioRequerido: TipoEspacio.AULA_TEORICA },
      });
    });

    it('asigna docente', async () => {
      const { prisma, tx } = prismaEdicion();
      await actualizarSeccion('sec-1', { docenteId: 'doc-2' }, COORDINACION, prisma);
      expect(tx.seccion.update).toHaveBeenCalledWith({
        where: { id: 'sec-1' },
        data: { docenteId: 'doc-2' },
      });
    });

    it('404 si el docente indicado no existe', async () => {
      const { prisma, tx } = prismaEdicion();
      tx.docente.findUnique.mockResolvedValue(null);
      await expect(
        actualizarSeccion('sec-1', { docenteId: 'doc-9' }, COORDINACION, prisma),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('reemplaza el software requerido con la regla de versión', async () => {
      const { prisma, tx } = prismaEdicion();
      await actualizarSeccion(
        'sec-1',
        { softwareRequerido: [{ softwareId: 'sw-python', comparacionVersion: 'MINIMA' }] },
        COORDINACION,
        prisma,
      );

      expect(tx.seccionSoftware.deleteMany).toHaveBeenCalledWith({ where: { seccionId: 'sec-1' } });
      expect(tx.seccionSoftware.createMany).toHaveBeenCalledWith({
        data: [{ seccionId: 'sec-1', softwareId: 'sw-python', comparacionVersion: 'MINIMA' }],
      });
    });

    it('422 si el software está dado de baja', async () => {
      const { prisma, tx } = prismaEdicion();
      tx.software.findMany.mockResolvedValue([
        { id: 'sw-python', nombre: 'Python', version: '3.12', activo: false },
      ]);
      await expect(
        actualizarSeccion(
          'sec-1',
          { softwareRequerido: [{ softwareId: 'sw-python', comparacionVersion: 'CUALQUIERA' }] },
          COORDINACION,
          prisma,
        ),
      ).rejects.toMatchObject({ status: 422 });
    });

    it('avisa con una alerta si el aula asignada no tiene el software nuevo', async () => {
      const { prisma, tx } = prismaEdicion();

      // La sección conserva su asignación vigente, con un laboratorio asignado.
      prisma.seccion.findUnique.mockResolvedValue(seccion());
      prisma.espacio.findUnique.mockResolvedValue({
        id: 'esp-1',
        identificador: 'Lab 03',
        pabellon: 'A',
        piso: 2,
        tipo: TipoEspacio.LABORATORIO,
        softwareInstaladoCatalogo: [],
      });
      // La asignación vigente usa ese laboratorio y no tiene el software instalado.
      prisma.asignacion.findMany.mockResolvedValue([
        {
          id: 'asig-1',
          seccionId: 'sec-1',
          codigoSeccion: '1',
          codigoCurso: 'IS101',
          nombreCurso: 'Algoritmos',
          seccion: {
            curso: { codigo: 'IS101', nombre: 'Algoritmos' },
            _count: { matriculas: 30 },
            softwareRequerido: [
              {
                softwareId: 'sw-python',
                comparacionVersion: 'CUALQUIERA',
                software: { nombre: 'Python', nombreNormalizado: 'python', version: '3.12' },
              },
            ],
          },
          softwareRequerido: [{ nombre: 'Python', nombreNormalizado: 'python', version: '3.12' }],
          alumnosMatriculados: 30,
          espacios: [
            {
              espacio: {
                id: 'esp-1',
                identificador: 'Lab 03',
                tipo: TipoEspacio.LABORATORIO,
                pabellon: 'A',
                piso: 2,
                aforoNominal: 40,
                pcsMalogradas: 0,
                softwareInstaladoCatalogo: [],
              },
            },
          ],
        },
      ]);
      prisma.alerta.findMany.mockResolvedValue([]);
      prisma.alerta.create.mockResolvedValue({
        id: 'al-1',
        tipo: 'SOFTWARE',
        espacioId: 'esp-1',
        motivo: 'Software incompatible en Lab 03: Python 3.12',
      });
      tx.software.findMany.mockResolvedValue([
        { id: 'sw-python', nombre: 'Python', version: '3.12', activo: true },
      ]);

      const resultado = await actualizarSeccion(
        'sec-1',
        { softwareRequerido: [{ softwareId: 'sw-python', comparacionVersion: 'CUALQUIERA' }] },
        COORDINACION,
        prisma,
      );

      expect(resultado.alertas).toHaveLength(1);
      expect(resultado.alertas[0].motivo).toContain('Lab 03');
    });
  });
});

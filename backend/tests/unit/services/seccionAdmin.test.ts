import { EstadoAsignacion, RolCuenta, TipoEspacio } from '@prisma/client';
import { HttpError } from '../../../src/lib/http';
import { ejecutarAsignacionADemanda } from '../../../src/services/asignacionDemanda.service';
import {
  ActualizarSeccionSchema,
  actualizarSeccion,
  camposEditablesDeSeccion,
  choquesDeDocente,
  listarSecciones,
  obtenerSeccionAdmin,
} from '../../../src/services/seccionAdmin.service';

jest.mock('../../../src/services/asignacionDemanda.service', () => ({
  ejecutarAsignacionADemanda: jest.fn(),
}));

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
      update: jest.fn().mockResolvedValue(seccion()),
    },
    periodo: {
      findFirst: jest.fn().mockResolvedValue({ codigo: '2026-2' }),
      findUnique: jest.fn().mockResolvedValue({ estado: 'VIGENTE' }),
    },
  } as any;
}

describe('Gestión individual de secciones (Issue 4.31)', () => {
  describe('campos editables por rol', () => {
    it('Coordinación edita el tipo de aula, el docente, el software y el horario', () => {
      expect(camposEditablesDeSeccion(RolCuenta.COORDINACION_ACADEMICA)).toEqual([
        'tipoEspacioRequerido',
        'docenteId',
        'softwareRequerido',
        'horarios',
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
        periodo: { findFirst: jest.fn().mockResolvedValue({ codigo: '2026-2' }) },
        docente: { findUnique: jest.fn().mockResolvedValue({ id: 'doc-2', nombre: 'Ing. Pérez' }) },
        registroAuditoria: { create: jest.fn().mockResolvedValue({}) },
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
        periodo: {
          findUnique: jest.fn().mockResolvedValue({ estado: 'VIGENTE' }),
          findFirst: jest.fn().mockResolvedValue({ codigo: '2026-2' }),
        },
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

    it('409 si la sección es de un periodo cerrado (Issue 4.64)', async () => {
      const { prisma, tx } = prismaEdicion();
      prisma.periodo.findUnique.mockResolvedValue({ estado: 'CERRADO' });
      await expect(
        actualizarSeccion(
          'sec-1',
          { tipoEspacioRequerido: TipoEspacio.AULA_TEORICA },
          COORDINACION,
          prisma,
        ),
      ).rejects.toMatchObject({ status: 409 });
      expect(tx.seccion.update).not.toHaveBeenCalled();
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

    it('registra quién cambió el docente, con los nombres y no los ids (Issue 4.58)', async () => {
      const { prisma, tx } = prismaEdicion();
      await actualizarSeccion('sec-1', { docenteId: 'doc-2' }, COORDINACION, prisma);

      expect(tx.registroAuditoria.create).toHaveBeenCalledTimes(1);
      expect(tx.registroAuditoria.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tipoEvento: 'EDICION_SECCION',
          cuentaId: COORDINACION.sub,
          seccionId: 'sec-1',
          cambios: [{ campo: 'docente', anterior: 'Dra. García', nuevo: 'Ing. Pérez' }],
        }),
      });
      expect(tx.registroAuditoria.create.mock.calls[0][0].data.detalle).toBe(
        'Sección IS101-1 editada: docente: Dra. García → Ing. Pérez',
      );
    });

    it('registra el cambio del software requerido con la regla de versión (Issue 4.58)', async () => {
      const { prisma, tx } = prismaEdicion();
      await actualizarSeccion(
        'sec-1',
        { softwareRequerido: [{ softwareId: 'sw-python', comparacionVersion: 'MINIMA' }] },
        COORDINACION,
        prisma,
      );

      expect(tx.registroAuditoria.create.mock.calls[0][0].data.cambios).toEqual([
        {
          campo: 'softwareRequerido',
          anterior: ['Docker 24.0 (versión mínima)'],
          nuevo: ['Python 3.12 (versión mínima)'],
        },
      ]);
    });

    it('no deja asiento si la edición no cambia ningún valor (Issue 4.58)', async () => {
      const { prisma, tx } = prismaEdicion();
      await actualizarSeccion(
        'sec-1',
        { tipoEspacioRequerido: TipoEspacio.LABORATORIO },
        COORDINACION,
        prisma,
      );
      expect(tx.registroAuditoria.create).not.toHaveBeenCalled();
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

describe('Edición del horario de una sección (Issue 4.62)', () => {
  const ejecutar = ejecutarAsignacionADemanda as jest.Mock;

  function prismaHorario(otrasSecciones: unknown[] = []) {
    const tx = {
      registroAuditoria: { create: jest.fn().mockResolvedValue({}) },
      horario: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };
    const prisma = {
      seccion: {
        findUnique: jest.fn().mockResolvedValue(seccion({ docenteId: 'doc-1', asignaciones: [] })),
        findMany: jest.fn().mockResolvedValue(otrasSecciones),
      },
      periodo: { findUnique: jest.fn().mockResolvedValue({ estado: 'VIGENTE' }) },
      $transaction: jest.fn(async (fn: any) => fn(tx)),
    } as any;
    return { prisma, tx };
  }

  beforeEach(() => {
    ejecutar.mockReset();
    ejecutar.mockResolvedValue({
      resultados: [
        {
          seccionId: 'sec-1',
          codigoSeccion: '1',
          estado: EstadoAsignacion.VIGENTE,
          espacioIds: ['esp-2'],
          motivoEscalamiento: null,
          conservada: false,
        },
      ],
    });
  });

  describe('validación', () => {
    const franja = (diaSemana: string, horaInicio: string, horaFin: string) => ({
      diaSemana,
      horaInicio,
      horaFin,
    });

    it('acepta franjas válidas', () => {
      expect(
        ActualizarSeccionSchema.safeParse({
          horarios: [franja('LUNES', '08:00', '10:00'), franja('MIERCOLES', '08:00', '10:00')],
        }).success,
      ).toBe(true);
    });

    it('rechaza un inicio igual o posterior al fin', () => {
      for (const [inicio, fin] of [
        ['10:00', '10:00'],
        ['12:00', '10:00'],
      ]) {
        const r = ActualizarSeccionSchema.safeParse({ horarios: [franja('LUNES', inicio, fin)] });
        expect(r.success).toBe(false);
        expect(JSON.stringify(r.error?.issues)).toContain('anterior a la hora de fin');
      }
    });

    it('rechaza horas con formato inválido y días que no existen', () => {
      expect(
        ActualizarSeccionSchema.safeParse({ horarios: [franja('LUNES', '8:00', '10:00')] }).success,
      ).toBe(false);
      expect(
        ActualizarSeccionSchema.safeParse({ horarios: [franja('FERIADO', '08:00', '10:00')] })
          .success,
      ).toBe(false);
    });

    it('rechaza franjas de la misma sección que se cruzan', () => {
      const r = ActualizarSeccionSchema.safeParse({
        horarios: [franja('LUNES', '08:00', '10:00'), franja('LUNES', '09:00', '11:00')],
      });
      expect(r.success).toBe(false);
      expect(JSON.stringify(r.error?.issues)).toContain('se cruzan');
    });
  });

  it('reemplaza las franjas, registra el cambio en la auditoría y reasigna la sección', async () => {
    const { prisma, tx } = prismaHorario();
    const resultado = await actualizarSeccion(
      'sec-1',
      {
        horarios: [
          { diaSemana: 'MIERCOLES', horaInicio: '14:00', horaFin: '16:00' },
          { diaSemana: 'LUNES', horaInicio: '10:00', horaFin: '12:00' },
        ],
      } as never,
      COORDINACION,
      prisma,
    );

    expect(tx.horario.deleteMany).toHaveBeenCalledWith({ where: { seccionId: 'sec-1' } });
    expect(tx.horario.createMany).toHaveBeenCalledWith({
      data: [
        { seccionId: 'sec-1', diaSemana: 'LUNES', horaInicio: '10:00', horaFin: '12:00' },
        { seccionId: 'sec-1', diaSemana: 'MIERCOLES', horaInicio: '14:00', horaFin: '16:00' },
      ],
    });
    expect(tx.registroAuditoria.create.mock.calls[0][0].data.cambios).toEqual([
      {
        campo: 'horarios',
        anterior: ['Lunes 08:00–10:00'],
        nuevo: ['Lunes 10:00–12:00', 'Miércoles 14:00–16:00'],
      },
    ]);
    expect(ejecutar).toHaveBeenCalledWith('sec-1', prisma);
    expect(resultado.reasignacion).toEqual({
      estado: EstadoAsignacion.VIGENTE,
      motivoEscalamiento: null,
      conservada: false,
    });
    expect(resultado.advertencias).toEqual([]);
  });

  it('permite quitar todas las franjas', async () => {
    const { prisma, tx } = prismaHorario();
    await actualizarSeccion('sec-1', { horarios: [] }, COORDINACION, prisma);
    expect(tx.horario.deleteMany).toHaveBeenCalled();
    expect(tx.horario.createMany).not.toHaveBeenCalled();
  });

  it('si el horario no cambia, no toca la base, no deja asiento ni reasigna', async () => {
    const { prisma, tx } = prismaHorario();
    const resultado = await actualizarSeccion(
      'sec-1',
      { horarios: [{ diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '10:00' }] } as never,
      COORDINACION,
      prisma,
    );
    expect(tx.horario.deleteMany).not.toHaveBeenCalled();
    expect(tx.registroAuditoria.create).not.toHaveBeenCalled();
    expect(ejecutar).not.toHaveBeenCalled();
    expect(resultado.reasignacion).toBeNull();
  });

  it('advierte el choque con otra sección del mismo docente sin impedir el guardado', async () => {
    const { prisma, tx } = prismaHorario([
      {
        id: 'sec-9',
        codigoSeccion: '3',
        curso: { codigo: 'IS202', nombre: 'Redes' },
        horarios: [{ diaSemana: 'MARTES', horaInicio: '09:00', horaFin: '11:00' }],
      },
    ]);
    prisma.seccion.findUnique
      .mockResolvedValueOnce(seccion({ docenteId: 'doc-1', asignaciones: [] }))
      .mockResolvedValueOnce(
        seccion({
          docenteId: 'doc-1',
          asignaciones: [],
          horarios: [{ diaSemana: 'MARTES', horaInicio: '10:00', horaFin: '12:00' }],
        }),
      );

    const resultado = await actualizarSeccion(
      'sec-1',
      { horarios: [{ diaSemana: 'MARTES', horaInicio: '10:00', horaFin: '12:00' }] } as never,
      COORDINACION,
      prisma,
    );

    expect(tx.horario.createMany).toHaveBeenCalled();
    expect(prisma.seccion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { docenteId: 'doc-1', periodo: '2026-2', id: { not: 'sec-1' } },
      }),
    );
    expect(resultado.advertencias).toEqual([
      'El docente también dicta IS202-3 el Martes 09:00–11:00: se cruza con la franja Martes 10:00–12:00',
    ]);
  });

  it('si hay una corrida en curso, guarda el horario y avisa que falta reasignar', async () => {
    ejecutar.mockRejectedValue(new HttpError(409, 'Ya hay una corrida de asignación en curso.'));
    const { prisma, tx } = prismaHorario();

    const resultado = await actualizarSeccion(
      'sec-1',
      { horarios: [{ diaSemana: 'VIERNES', horaInicio: '08:00', horaFin: '10:00' }] } as never,
      COORDINACION,
      prisma,
    );

    expect(tx.horario.createMany).toHaveBeenCalled();
    expect(resultado.reasignacion).toBeNull();
    expect(resultado.advertencias[0]).toContain('no se pudo reasignar');
  });

  it('409 si el periodo está cerrado: no se toca el horario (Issue 4.64)', async () => {
    const { prisma, tx } = prismaHorario();
    prisma.periodo.findUnique.mockResolvedValue({ estado: 'CERRADO' });
    await expect(
      actualizarSeccion('sec-1', { horarios: [] }, COORDINACION, prisma),
    ).rejects.toMatchObject({ status: 409 });
    expect(tx.horario.deleteMany).not.toHaveBeenCalled();
    expect(ejecutar).not.toHaveBeenCalled();
  });

  it('choquesDeDocente no avisa si la sección no tiene docente', async () => {
    const prisma = { seccion: { findMany: jest.fn() } } as any;
    await expect(
      choquesDeDocente({ id: 's', periodo: '2026-2', docenteId: null, horarios: [] }, prisma),
    ).resolves.toEqual([]);
    expect(prisma.seccion.findMany).not.toHaveBeenCalled();
  });
});

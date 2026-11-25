import { EstadoAsignacion, RolCuenta } from '@prisma/client';
import { bus } from '../../../src/events/bus';
import { HttpError } from '../../../src/lib/http';
import { ejecutarAsignacionADemanda } from '../../../src/services/asignacionDemanda.service';
import {
  CrearFusionSchema,
  crearSolicitudFusion,
  listarFusiones,
  resolverSolicitudFusion,
} from '../../../src/services/fusionLaboratorio.service';

jest.mock('../../../src/services/asignacionDemanda.service', () => ({
  ejecutarAsignacionADemanda: jest.fn(),
}));

const COORDINACION = {
  sub: 'cuenta-coord',
  rol: RolCuenta.COORDINACION_ACADEMICA,
  email: 'coord@unmsm.edu.pe',
} as never;

const ejecutar = ejecutarAsignacionADemanda as jest.Mock;
const UUID_TEORIA = '7d3c1f9e-2b4a-4c8e-9f1d-0a6b5c4d3e2f';

const franja = (diaSemana: string, horaInicio: string, horaFin: string) => ({
  diaSemana,
  horaInicio,
  horaFin,
});

function seccionTeoria(o: Record<string, unknown> = {}) {
  return {
    id: 'sec-teo',
    cursoId: 'curso-1',
    docenteId: 'doc-1',
    codigoSeccion: '2',
    periodo: '2026-2',
    tipoEspacioRequerido: 'AULA_TEORICA',
    activa: true,
    horarios: [franja('JUEVES', '18:00', '20:00')],
    matriculas: [
      { alumnoId: 'al-1', movilidadReducida: false },
      { alumnoId: 'al-2', movilidadReducida: true },
    ],
    ...o,
  };
}

function seccionLab(o: Record<string, unknown> = {}) {
  return {
    id: 'sec-lab',
    cursoId: 'curso-1',
    codigoSeccion: '2-LAB',
    periodo: '2026-2',
    tipoEspacioRequerido: 'LABORATORIO',
    activa: true,
    horarios: [franja('JUEVES', '20:00', '22:00')],
    matriculas: [{ alumnoId: 'al-1' }],
    ...o,
  };
}

const seccionDTO = (id: string, codigoSeccion: string, horarios: unknown[]) => ({
  id,
  codigoSeccion,
  periodo: '2026-2',
  curso: { codigo: '202SW0805', nombre: 'Gestión de la Configuración' },
  horarios,
});

function solicitud(o: Record<string, unknown> = {}) {
  return {
    id: 'sol-1',
    docenteId: 'doc-1',
    seccionTeoriaId: 'sec-teo',
    seccionLaboratorioId: 'sec-lab',
    justificacion: 'Toda la práctica es con Git y Docker en las PCs',
    estado: 'PENDIENTE',
    fechaSolicitud: new Date('2026-11-24T10:00:00Z'),
    fechaResolucion: null,
    motivoRechazo: null,
    resultado: null,
    resueltaPorId: null,
    docente: { codigoDocente: '0A0690', nombre: 'Dra. Rojas' },
    seccionTeoria: seccionDTO('sec-teo', '2', [franja('JUEVES', '18:00', '20:00')]),
    seccionLaboratorio: seccionDTO('sec-lab', '2-LAB', [
      franja('JUEVES', '18:00', '20:00'),
      franja('JUEVES', '20:00', '22:00'),
    ]),
    ...o,
  };
}

describe('«Dictar todo en laboratorio»: solicitud del docente (Issue 7.17)', () => {
  function prismaCrear(o: { teoria?: unknown; lab?: unknown; pendiente?: unknown } = {}) {
    return {
      docente: { findUnique: jest.fn().mockResolvedValue({ id: 'doc-1' }) },
      seccion: {
        findUnique: jest.fn().mockResolvedValue('teoria' in o ? o.teoria : seccionTeoria()),
        findFirst: jest.fn().mockResolvedValue('lab' in o ? o.lab : seccionLab()),
      },
      periodo: { findUnique: jest.fn().mockResolvedValue({ estado: 'VIGENTE' }) },
      solicitudFusionLaboratorio: {
        findFirst: jest.fn().mockResolvedValue(o.pendiente ?? null),
        create: jest.fn().mockResolvedValue(solicitud()),
      },
    } as any;
  }

  const entrada = { seccionTeoriaId: UUID_TEORIA, justificacion: 'Toda la práctica es en PCs' };

  it('exige una justificación de al menos 10 caracteres', () => {
    expect(CrearFusionSchema.safeParse({ ...entrada, justificacion: 'corta' }).success).toBe(false);
    expect(CrearFusionSchema.safeParse(entrada).success).toBe(true);
  });

  it('crea la solicitud con la teoría y su laboratorio del mismo grupo', async () => {
    const prisma = prismaCrear();
    const dto = await crearSolicitudFusion('cuenta-d', entrada, prisma);

    expect(prisma.seccion.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        cursoId: 'curso-1',
        periodo: '2026-2',
        activa: true,
        tipoEspacioRequerido: 'LABORATORIO',
        codigoSeccion: { equals: '2-LAB', mode: 'insensitive' },
      }),
    });
    expect(prisma.solicitudFusionLaboratorio.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          docenteId: 'doc-1',
          seccionTeoriaId: 'sec-teo',
          seccionLaboratorioId: 'sec-lab',
          justificacion: 'Toda la práctica es en PCs',
        },
      }),
    );
    expect(dto).toMatchObject({ grupo: '2', curso: { codigo: '202SW0805' }, estado: 'PENDIENTE' });
  });

  it('404 si la sección no es del docente (no revela que existe)', async () => {
    const prisma = prismaCrear({ teoria: seccionTeoria({ docenteId: 'otro' }) });
    await expect(crearSolicitudFusion('cuenta-d', entrada, prisma)).rejects.toMatchObject({
      status: 404,
    });
  });

  it('422 si la sección no es de teoría', async () => {
    const prisma = prismaCrear({
      teoria: seccionTeoria({ codigoSeccion: '2-LAB', tipoEspacioRequerido: 'LABORATORIO' }),
    });
    await expect(crearSolicitudFusion('cuenta-d', entrada, prisma)).rejects.toMatchObject({
      status: 422,
    });
  });

  it('422 si el grupo no tiene laboratorio', async () => {
    const prisma = prismaCrear({ lab: null });
    await expect(crearSolicitudFusion('cuenta-d', entrada, prisma)).rejects.toMatchObject({
      status: 422,
    });
  });

  it('409 si ya hay una pendiente para la misma sección o el periodo está cerrado', async () => {
    await expect(
      crearSolicitudFusion('cuenta-d', entrada, prismaCrear({ pendiente: { id: 'x' } })),
    ).rejects.toMatchObject({ status: 409 });

    const cerrado = prismaCrear();
    cerrado.periodo.findUnique.mockResolvedValue({ estado: 'CERRADO' });
    await expect(crearSolicitudFusion('cuenta-d', entrada, cerrado)).rejects.toMatchObject({
      status: 409,
    });
  });
});

describe('«Dictar todo en laboratorio»: Coordinación resuelve (Issue 7.17)', () => {
  let emitir: jest.SpyInstance;

  function prismaResolver(o: { teoria?: unknown; lab?: unknown; sol?: unknown } = {}) {
    const tx = {
      horario: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      matricula: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      seccion: { update: jest.fn().mockResolvedValue({}) },
      asignacion: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      solicitudFusionLaboratorio: { update: jest.fn().mockResolvedValue({}) },
      registroAuditoria: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      solicitudFusionLaboratorio: {
        findUnique: jest.fn().mockResolvedValue(o.sol ?? solicitud()),
        update: jest.fn(async ({ data }: any) => solicitud({ ...data })),
      },
      seccion: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce(o.teoria ?? seccionTeoria())
          .mockResolvedValueOnce(o.lab ?? seccionLab()),
      },
      periodo: { findUnique: jest.fn().mockResolvedValue({ estado: 'VIGENTE' }) },
      espacio: {
        findMany: jest.fn().mockResolvedValue([{ id: 'esp-l01', identificador: 'L-01' }]),
      },
      $transaction: jest.fn(async (fn: any) => fn(tx)),
    } as any;
    return { prisma, tx };
  }

  beforeEach(() => {
    ejecutar.mockReset();
    ejecutar.mockResolvedValue({
      resultados: [
        {
          seccionId: 'sec-lab',
          estado: EstadoAsignacion.VIGENTE,
          espacioIds: ['esp-l01'],
          motivoEscalamiento: null,
          conservada: false,
        },
      ],
    });
    emitir = jest.spyOn(bus, 'emitir').mockResolvedValue(undefined as never);
  });

  afterEach(() => emitir.mockRestore());

  it('al aprobar junta las franjas, retira la teoría, libera su aula y reasigna el laboratorio', async () => {
    const { prisma, tx } = prismaResolver();
    const dto = await resolverSolicitudFusion(
      'sol-1',
      COORDINACION,
      { decision: 'APROBAR' },
      prisma,
    );

    expect(tx.horario.createMany).toHaveBeenCalledWith({
      data: [{ seccionId: 'sec-lab', diaSemana: 'JUEVES', horaInicio: '18:00', horaFin: '20:00' }],
    });
    // Solo se matricula en el laboratorio a quien no lo estaba, con su prioridad de piso 1.
    expect(tx.matricula.createMany).toHaveBeenCalledWith({
      data: [{ alumnoId: 'al-2', seccionId: 'sec-lab', movilidadReducida: true }],
      skipDuplicates: true,
    });
    expect(tx.seccion.update).toHaveBeenCalledWith({
      where: { id: 'sec-teo' },
      data: { activa: false },
    });
    expect(tx.asignacion.updateMany).toHaveBeenCalledWith({
      where: { seccionId: 'sec-teo', estado: { in: ['VIGENTE', 'ESCALADA'] } },
      data: { estado: 'HISTORICA' },
    });
    expect(tx.registroAuditoria.create).toHaveBeenCalledTimes(2);
    expect(tx.registroAuditoria.create.mock.calls[0][0].data.cambios).toEqual([
      {
        campo: 'horarios',
        anterior: ['Jueves 20:00–22:00'],
        nuevo: ['Jueves 20:00–22:00', 'Jueves 18:00–20:00'],
      },
    ]);

    expect(ejecutar).toHaveBeenCalledWith('sec-lab', prisma);
    expect(dto.resultado).toBe('L-01 en todas sus franjas');
    expect(emitir).toHaveBeenCalledWith(
      'seccion.fusionada',
      expect.objectContaining({
        seccionTeoriaId: 'sec-teo',
        seccionLaboratorioId: 'sec-lab',
        grupo: '2',
        espacios: [{ id: 'esp-l01', identificador: 'L-01' }],
      }),
    );
  });

  it('si el laboratorio queda en revisión, lo dice en el resultado', async () => {
    ejecutar.mockResolvedValue({
      resultados: [
        {
          estado: EstadoAsignacion.ESCALADA,
          espacioIds: [],
          motivoEscalamiento: 'No hay laboratorio libre de 18:00 a 22:00',
        },
      ],
    });
    const { prisma } = prismaResolver();
    const dto = await resolverSolicitudFusion(
      'sol-1',
      COORDINACION,
      { decision: 'APROBAR' },
      prisma,
    );
    expect(dto.resultado).toBe('quedó en revisión: No hay laboratorio libre de 18:00 a 22:00');
  });

  it('si hay una corrida en curso, la fusión se guarda igual y avisa que falta reasignar', async () => {
    ejecutar.mockRejectedValue(new HttpError(409, 'Ya hay una corrida en curso'));
    const { prisma, tx } = prismaResolver();
    const dto = await resolverSolicitudFusion(
      'sol-1',
      COORDINACION,
      { decision: 'APROBAR' },
      prisma,
    );
    expect(tx.seccion.update).toHaveBeenCalled();
    expect(dto.resultado).toContain('falta reasignarla');
  });

  it('409 si la teoría y el laboratorio se cruzan: no toca nada', async () => {
    const { prisma, tx } = prismaResolver({
      lab: seccionLab({ horarios: [franja('JUEVES', '19:00', '21:00')] }),
    });
    await expect(
      resolverSolicitudFusion('sol-1', COORDINACION, { decision: 'APROBAR' }, prisma),
    ).rejects.toMatchObject({ status: 409 });
    expect(tx.horario.createMany).not.toHaveBeenCalled();
    expect(ejecutar).not.toHaveBeenCalled();
  });

  it('409 si alguna de las dos ya no está activa', async () => {
    const { prisma } = prismaResolver({ teoria: seccionTeoria({ activa: false }) });
    await expect(
      resolverSolicitudFusion('sol-1', COORDINACION, { decision: 'APROBAR' }, prisma),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('al rechazar guarda el motivo y no toca las secciones', async () => {
    const { prisma, tx } = prismaResolver();
    await resolverSolicitudFusion(
      'sol-1',
      COORDINACION,
      { decision: 'RECHAZAR', motivo: 'El laboratorio no está libre los jueves' },
      prisma,
    );
    expect(prisma.solicitudFusionLaboratorio.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          estado: 'RECHAZADA',
          motivoRechazo: 'El laboratorio no está libre los jueves',
          resueltaPorId: 'cuenta-coord',
        }),
      }),
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(emitir).not.toHaveBeenCalled();
  });

  it('404 si no existe y 409 si ya se resolvió', async () => {
    const noExiste = prismaResolver();
    noExiste.prisma.solicitudFusionLaboratorio.findUnique.mockResolvedValue(null);
    await expect(
      resolverSolicitudFusion('x', COORDINACION, { decision: 'APROBAR' }, noExiste.prisma),
    ).rejects.toMatchObject({ status: 404 });

    const resuelta = prismaResolver({ sol: solicitud({ estado: 'APROBADA' }) });
    await expect(
      resolverSolicitudFusion('sol-1', COORDINACION, { decision: 'APROBAR' }, resuelta.prisma),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('el listado trae pendientes y las últimas resueltas', async () => {
    const prisma = {
      solicitudFusionLaboratorio: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([solicitud()])
          .mockResolvedValueOnce([solicitud({ id: 'sol-0', estado: 'RECHAZADA' })]),
      },
    } as any;
    const r = await listarFusiones(prisma);
    expect(r.pendientes.map((s) => s.id)).toEqual(['sol-1']);
    expect(r.resueltas.map((s) => s.estado)).toEqual(['RECHAZADA']);
  });
});

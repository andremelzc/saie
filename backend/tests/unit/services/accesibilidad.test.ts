import { EstadoSolicitud } from '@prisma/client';
import { bus } from '../../../src/events/bus';
import { HttpError } from '../../../src/lib/http';
import { logger } from '../../../src/lib/logger';
import {
  declararAccesibilidad,
  listarAccesibilidad,
  resolverSolicitudAccesibilidad,
  ResolverAccesibilidadSchema,
  resumirResultado,
  SeccionAccesibilidadDTO,
} from '../../../src/services/accesibilidad.service';
import { ejecutarAsignacionADemanda } from '../../../src/services/asignacionDemanda.service';
import { obtenerPeriodoVigente } from '../../../src/services/periodo.service';

jest.mock('../../../src/services/asignacionDemanda.service', () => ({
  ejecutarAsignacionADemanda: jest.fn(),
}));
jest.mock('../../../src/services/periodo.service', () => ({
  obtenerPeriodoVigente: jest.fn(),
}));

const AUTH = { sub: 'cuenta-coord', rol: 'COORDINACION_ACADEMICA' } as never;
const FECHA = new Date('2026-11-24T10:00:00.000Z');

/** Una sección del alumno con su aula vigente en el piso indicado (o sin aula). */
function matricula(codigoCurso: string, periodo: string, piso: number | null) {
  return {
    seccion: {
      id: `sec-${codigoCurso}`,
      codigoSeccion: '1',
      periodo,
      curso: { codigo: codigoCurso, nombre: `Curso ${codigoCurso}` },
      asignaciones:
        piso === null
          ? []
          : [{ espacios: [{ espacio: { identificador: `A-${piso}01`, pabellon: 'A', piso } }] }],
    },
  };
}

function solicitud(estado: EstadoSolicitud, matriculas = [matricula('CC-101', '2026-2', 3)]) {
  return {
    id: 'sol-1',
    alumnoId: 'alu-1',
    estado,
    fechaSolicitud: FECHA,
    fechaResolucion: estado === EstadoSolicitud.PENDIENTE ? null : FECHA,
    motivoRechazo: null,
    resultado: null,
    resueltaPorId: null,
    alumno: { id: 'alu-1', codigo: '20231234', nombre: 'Ana Quispe', matriculas },
  };
}

function crearPrisma() {
  return {
    solicitudAccesibilidad: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)),
    },
    fichaMedica: { upsert: jest.fn().mockReturnValue('upsert-ficha') },
    matricula: {
      updateMany: jest.fn().mockReturnValue('marcar-matriculas'),
      findMany: jest.fn().mockResolvedValue([]),
    },
    $transaction: jest.fn().mockResolvedValue([]),
  };
}
type PrismaFalso = ReturnType<typeof crearPrisma>;
const comoPrisma = (p: PrismaFalso) => p as never;

describe('declaraciones de accesibilidad (Issue 3.60)', () => {
  let emitir: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(obtenerPeriodoVigente).mockResolvedValue('2026-2');
    emitir = jest.spyOn(bus, 'emitir').mockResolvedValue(undefined);
  });

  afterEach(() => emitir.mockRestore());

  describe('ResolverAccesibilidadSchema', () => {
    it('acepta aprobar sin motivo y exige motivo para rechazar', () => {
      expect(ResolverAccesibilidadSchema.safeParse({ decision: 'APROBAR' }).success).toBe(true);
      expect(ResolverAccesibilidadSchema.safeParse({ decision: 'RECHAZAR' }).success).toBe(false);
      expect(
        ResolverAccesibilidadSchema.safeParse({ decision: 'RECHAZAR', motivo: 'no' }).success,
      ).toBe(false);
      expect(
        ResolverAccesibilidadSchema.safeParse({ decision: 'RECHAZAR', motivo: 'Falta confirmar' })
          .success,
      ).toBe(true);
    });
  });

  describe('declararAccesibilidad', () => {
    const tx = () => ({
      solicitudAccesibilidad: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        delete: jest.fn(),
      },
      fichaMedica: { update: jest.fn() },
      matricula: { updateMany: jest.fn() },
    });

    it('sin cambio en la casilla no hace nada', async () => {
      const t = tx();
      await declararAccesibilidad('alu-1', undefined, false, t as never);
      expect(t.solicitudAccesibilidad.findFirst).not.toHaveBeenCalled();
    });

    it('marcar crea una solicitud pendiente', async () => {
      const t = tx();
      await declararAccesibilidad('alu-1', true, false, t as never);
      expect(t.solicitudAccesibilidad.create).toHaveBeenCalledWith({ data: { alumnoId: 'alu-1' } });
    });
  });

  describe('listarAccesibilidad', () => {
    it('devuelve pendientes y aprobadas con las secciones del periodo vigente y su piso', async () => {
      const prisma = crearPrisma();
      prisma.solicitudAccesibilidad.findMany
        .mockResolvedValueOnce([solicitud(EstadoSolicitud.PENDIENTE)])
        .mockResolvedValueOnce([
          solicitud(EstadoSolicitud.APROBADA, [
            matricula('CC-205', '2026-2', 1),
            matricula('CC-101', '2026-2', 3),
            matricula('CC-310', '2026-2', null),
            matricula('CC-900', '2026-1', 1),
          ]),
        ]);

      const vista = await listarAccesibilidad(comoPrisma(prisma));

      expect(vista.periodo).toBe('2026-2');
      expect(vista.pendientes).toHaveLength(1);
      expect(vista.pendientes[0]).toMatchObject({
        id: 'sol-1',
        estado: 'PENDIENTE',
        fechaResolucion: null,
        alumno: { codigo: '20231234', nombre: 'Ana Quispe' },
      });
      const secciones = vista.aprobadas[0].secciones;
      // Solo el periodo vigente, ordenadas por curso.
      expect(secciones.map((s) => s.codigoCurso)).toEqual(['CC-101', 'CC-205', 'CC-310']);
      expect(secciones[0]).toMatchObject({ fueraDePiso1: true, sinAula: false });
      expect(secciones[1]).toMatchObject({ fueraDePiso1: false, sinAula: false });
      expect(secciones[2]).toMatchObject({ fueraDePiso1: false, sinAula: true });
      expect(prisma.solicitudAccesibilidad.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: {
            estado: EstadoSolicitud.APROBADA,
            alumno: { fichaMedica: { condicionAccesible: true } },
          },
          distinct: ['alumnoId'],
        }),
      );
    });

    it('sin periodo vigente muestra todas las secciones del alumno', async () => {
      jest.mocked(obtenerPeriodoVigente).mockResolvedValue(null);
      const prisma = crearPrisma();
      prisma.solicitudAccesibilidad.findMany.mockResolvedValueOnce([
        solicitud(EstadoSolicitud.PENDIENTE, [
          matricula('CC-101', '2026-2', 1),
          matricula('CC-900', '2026-1', 1),
        ]),
      ]);
      const vista = await listarAccesibilidad(comoPrisma(prisma));
      expect(vista.pendientes[0].secciones).toHaveLength(2);
    });
  });

  describe('resumirResultado', () => {
    const seccion = (o: Partial<SeccionAccesibilidadDTO>): SeccionAccesibilidadDTO => ({
      seccionId: 's',
      codigoCurso: 'C',
      nombreCurso: 'C',
      codigoSeccion: '1',
      espacios: [],
      fueraDePiso1: false,
      sinAula: false,
      ...o,
    });

    it('cuenta las clases en el piso 1 y las que esperan revisión', () => {
      expect(
        resumirResultado([
          seccion({}),
          seccion({ fueraDePiso1: true }),
          seccion({ sinAula: true }),
          seccion({ sinAula: true }),
        ]),
      ).toBe('1 de 2 clases quedaron en el piso 1; 2 clases esperan revisión');
    });

    it('usa el singular', () => {
      expect(resumirResultado([seccion({}), seccion({ sinAula: true })])).toBe(
        '1 de 1 clase quedó en el piso 1; 1 clase espera revisión',
      );
    });
  });

  describe('resolverSolicitudAccesibilidad', () => {
    it('404 si la solicitud no existe', async () => {
      const prisma = crearPrisma();
      prisma.solicitudAccesibilidad.findUnique.mockResolvedValue(null);
      await expect(
        resolverSolicitudAccesibilidad('x', AUTH, { decision: 'APROBAR' }, comoPrisma(prisma)),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('409 si ya fue resuelta', async () => {
      const prisma = crearPrisma();
      prisma.solicitudAccesibilidad.findUnique.mockResolvedValue({
        estado: EstadoSolicitud.APROBADA,
      });
      const promesa = resolverSolicitudAccesibilidad(
        'sol-1',
        AUTH,
        { decision: 'APROBAR' },
        comoPrisma(prisma),
      );
      await expect(promesa).rejects.toBeInstanceOf(HttpError);
      await expect(promesa).rejects.toMatchObject({ status: 409 });
    });

    it('rechazar guarda el motivo, no toca matrículas y avisa al alumno', async () => {
      const prisma = crearPrisma();
      prisma.solicitudAccesibilidad.findUnique.mockResolvedValue({
        id: 'sol-1',
        alumnoId: 'alu-1',
        estado: EstadoSolicitud.PENDIENTE,
      });
      prisma.solicitudAccesibilidad.update.mockResolvedValue({
        ...solicitud(EstadoSolicitud.RECHAZADA),
        motivoRechazo: 'Falta confirmar',
      });

      const dto = await resolverSolicitudAccesibilidad(
        'sol-1',
        AUTH,
        { decision: 'RECHAZAR', motivo: 'Falta confirmar' },
        comoPrisma(prisma),
      );

      expect(prisma.solicitudAccesibilidad.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sol-1' },
          data: expect.objectContaining({
            estado: EstadoSolicitud.RECHAZADA,
            motivoRechazo: 'Falta confirmar',
            resueltaPorId: 'cuenta-coord',
          }),
        }),
      );
      expect(prisma.matricula.updateMany).not.toHaveBeenCalled();
      expect(dto.motivoRechazo).toBe('Falta confirmar');
      expect(emitir).toHaveBeenCalledWith('accesibilidad.resuelta', {
        alumnoId: 'alu-1',
        estado: EstadoSolicitud.RECHAZADA,
        resultado: null,
      });
    });

    it('aprobar marca la ficha y las matrículas, reasigna sus secciones y guarda el resultado', async () => {
      const prisma = crearPrisma();
      prisma.solicitudAccesibilidad.findUnique.mockResolvedValue({
        id: 'sol-1',
        alumnoId: 'alu-1',
        estado: EstadoSolicitud.PENDIENTE,
      });
      prisma.matricula.findMany.mockResolvedValue([{ seccionId: 'sec-1' }, { seccionId: 'sec-2' }]);
      prisma.solicitudAccesibilidad.findUniqueOrThrow.mockResolvedValue(
        solicitud(EstadoSolicitud.APROBADA, [
          matricula('CC-101', '2026-2', 1),
          matricula('CC-205', '2026-2', 2),
        ]),
      );
      const advertencia = jest.spyOn(logger, 'warn').mockImplementation(() => logger);
      jest
        .mocked(ejecutarAsignacionADemanda)
        .mockResolvedValueOnce({} as never)
        .mockRejectedValueOnce(new HttpError(409, 'Hay una corrida en curso'));

      const dto = await resolverSolicitudAccesibilidad(
        'sol-1',
        AUTH,
        { decision: 'APROBAR' },
        comoPrisma(prisma),
      );

      expect(prisma.$transaction).toHaveBeenCalledWith([
        expect.anything(),
        'upsert-ficha',
        'marcar-matriculas',
      ]);
      expect(prisma.fichaMedica.upsert).toHaveBeenCalledWith({
        where: { alumnoId: 'alu-1' },
        create: { alumnoId: 'alu-1', condicionAccesible: true },
        update: { condicionAccesible: true },
      });
      expect(prisma.matricula.updateMany).toHaveBeenCalledWith({
        where: { alumnoId: 'alu-1' },
        data: { movilidadReducida: true },
      });
      expect(prisma.matricula.findMany).toHaveBeenCalledWith({
        where: { alumnoId: 'alu-1', seccion: { periodo: '2026-2' } },
        select: { seccionId: true },
      });
      expect(ejecutarAsignacionADemanda).toHaveBeenCalledTimes(2);
      // Una sección que no se pudo reasignar no deshace la aprobación.
      expect(advertencia).toHaveBeenCalled();
      expect(dto.resultado).toBe('1 de 2 clases quedaron en el piso 1');
      expect(prisma.solicitudAccesibilidad.update).toHaveBeenLastCalledWith({
        where: { id: 'sol-1' },
        data: { resultado: '1 de 2 clases quedaron en el piso 1' },
      });
      expect(emitir).toHaveBeenCalledWith('accesibilidad.resuelta', {
        alumnoId: 'alu-1',
        estado: EstadoSolicitud.APROBADA,
        resultado: '1 de 2 clases quedaron en el piso 1',
      });
      advertencia.mockRestore();
    });

    it('sin periodo vigente reasigna todas las matrículas del alumno', async () => {
      jest.mocked(obtenerPeriodoVigente).mockResolvedValue(null);
      const prisma = crearPrisma();
      prisma.solicitudAccesibilidad.findUnique.mockResolvedValue({
        id: 'sol-1',
        alumnoId: 'alu-1',
        estado: EstadoSolicitud.PENDIENTE,
      });
      prisma.solicitudAccesibilidad.findUniqueOrThrow.mockResolvedValue(
        solicitud(EstadoSolicitud.APROBADA, []),
      );

      await resolverSolicitudAccesibilidad(
        'sol-1',
        AUTH,
        { decision: 'APROBAR' },
        comoPrisma(prisma),
      );

      expect(prisma.matricula.findMany).toHaveBeenCalledWith({
        where: { alumnoId: 'alu-1' },
        select: { seccionId: true },
      });
    });
  });
});

import { EstadoSolicitud } from '@prisma/client';
import { bus } from '../../../src/events/bus';
import {
  declararSolicitud,
  listarAccesibilidad,
  resolverSolicitudAccesibilidad,
} from '../../../src/services/accesibilidad.service';
import {
  DeclararAccesibilidadDocenteSchema,
  declararAccesibilidadDocente,
  obtenerAccesibilidadDocente,
  vencerCondicionesAccesibles,
} from '../../../src/services/accesibilidadDocente.service';
import { hoyEnLima } from '../../../src/lib/fechaFinCondicion';
import { ejecutarAsignacionADemanda } from '../../../src/services/asignacionDemanda.service';
import { requierePiso1 } from '../../../src/services/motor.service';
import { obtenerPeriodoVigente } from '../../../src/services/periodo.service';

jest.mock('../../../src/services/asignacionDemanda.service', () => ({
  ejecutarAsignacionADemanda: jest.fn(),
}));
jest.mock('../../../src/services/periodo.service', () => ({
  obtenerPeriodoVigente: jest.fn(),
  asegurarPeriodoEscribible: jest.fn(),
}));

const AUTH = { sub: 'cuenta-coord', rol: 'COORDINACION_ACADEMICA' } as never;
const FECHA = new Date('2026-11-24T10:00:00.000Z');
const FIN = new Date('2026-12-20T00:00:00.000Z');

const seccionDocente = (codigo: string, piso: number) => ({
  id: `sec-${codigo}`,
  codigoSeccion: '1',
  periodo: '2026-2',
  activa: true,
  curso: { codigo, nombre: `Curso ${codigo}` },
  asignaciones: [
    { espacios: [{ espacio: { identificador: `L-${piso}01`, pabellon: 'N', piso } }] },
  ],
});

function solicitudDocente(estado: EstadoSolicitud, fechaFin: Date | null = FIN) {
  return {
    id: 'sol-d',
    alumnoId: null,
    docenteId: 'doc-1',
    fechaFin,
    estado,
    fechaSolicitud: FECHA,
    fechaResolucion: estado === EstadoSolicitud.PENDIENTE ? null : FECHA,
    motivoRechazo: null,
    resultado: null,
    resueltaPorId: null,
    alumno: null,
    docente: {
      id: 'doc-1',
      codigoDocente: '0A0690',
      nombre: 'Dra. Rojas',
      secciones: [seccionDocente('IS101', 1), seccionDocente('IS202', 2)],
    },
  };
}

describe('Accesibilidad de docentes y condición temporal (Issue 3.61)', () => {
  let emitir: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(obtenerPeriodoVigente).mockResolvedValue('2026-2');
    jest.mocked(ejecutarAsignacionADemanda).mockResolvedValue({} as never);
    emitir = jest.spyOn(bus, 'emitir').mockResolvedValue(undefined);
  });

  afterEach(() => emitir.mockRestore());

  describe('motor', () => {
    it('pide el piso 1 si un alumno tiene movilidad reducida o el docente la condición', () => {
      const sin = { matriculas: [{ movilidadReducida: false }] };
      expect(requierePiso1(sin)).toBe(false);
      expect(requierePiso1({ ...sin, docente: { condicionAccesible: true } })).toBe(true);
      expect(requierePiso1({ ...sin, docente: null })).toBe(false);
      expect(requierePiso1({ matriculas: [{ movilidadReducida: true }] })).toBe(true);
    });
  });

  describe('declaración del docente', () => {
    function prismaDocente(docente: Record<string, unknown> = {}) {
      const tx = {
        solicitudAccesibilidad: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({}),
          update: jest.fn(),
          delete: jest.fn(),
        },
        docente: { update: jest.fn() },
      };
      const prisma = {
        docente: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'doc-1',
            condicionAccesible: false,
            condicionAccesibleHasta: null,
            ...docente,
          }),
        },
        solicitudAccesibilidad: { findFirst: jest.fn().mockResolvedValue(null) },
        $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
      } as any;
      return { prisma, tx };
    }

    it('valida la fecha de fin: formato AAAA-MM-DD y no un día que ya pasó', () => {
      const ok = (fechaFin: unknown) =>
        DeclararAccesibilidadDocenteSchema.safeParse({ declarado: true, fechaFin }).success;
      expect(ok(null)).toBe(true);
      expect(ok('2099-01-31')).toBe(true);
      expect(ok('31/01/2099')).toBe(false);
      expect(ok('2000-01-01')).toBe(false);
    });

    it('declarar crea una solicitud pendiente con su fecha de fin', async () => {
      const { prisma, tx } = prismaDocente();
      await declararAccesibilidadDocente(
        'cuenta-d',
        { declarado: true, fechaFin: '2099-12-20' },
        prisma,
      );
      expect(tx.solicitudAccesibilidad.create).toHaveBeenCalledWith({
        data: { docenteId: 'doc-1', fechaFin: new Date('2099-12-20T00:00:00.000Z') },
      });
      expect(tx.docente.update).not.toHaveBeenCalled();
    });

    it('retirar una condición aprobada la quita del docente sin verificación', async () => {
      const { prisma, tx } = prismaDocente({ condicionAccesible: true });
      await declararAccesibilidadDocente('cuenta-d', { declarado: false }, prisma);
      expect(tx.docente.update).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        data: { condicionAccesible: false, condicionAccesibleHasta: null },
      });
    });

    it('el estado dice si está aprobada, hasta cuándo y la última solicitud', async () => {
      const { prisma } = prismaDocente({ condicionAccesible: true, condicionAccesibleHasta: FIN });
      prisma.solicitudAccesibilidad.findFirst.mockResolvedValue(
        solicitudDocente(EstadoSolicitud.APROBADA),
      );
      const estado = await obtenerAccesibilidadDocente('cuenta-d', prisma);
      expect(estado).toMatchObject({
        aprobada: true,
        vigenteHasta: '2026-12-20',
        solicitud: { estado: 'APROBADA', fechaFin: '2026-12-20' },
      });
    });

    it('con una pendiente, volver a declarar solo actualiza su fecha de fin', async () => {
      const t = {
        solicitudAccesibilidad: {
          findFirst: jest.fn().mockResolvedValue({ id: 'pend' }),
          update: jest.fn(),
          create: jest.fn(),
        },
      };
      await declararSolicitud({ docenteId: 'doc-1' }, true, false, t as never, FIN);
      expect(t.solicitudAccesibilidad.update).toHaveBeenCalledWith({
        where: { id: 'pend' },
        data: { fechaFin: FIN },
      });
      expect(t.solicitudAccesibilidad.create).not.toHaveBeenCalled();
    });
  });

  describe('Coordinación aprueba la de un docente', () => {
    function prismaResolver() {
      return {
        solicitudAccesibilidad: {
          findUnique: jest.fn().mockResolvedValue(solicitudDocente(EstadoSolicitud.PENDIENTE)),
          findUniqueOrThrow: jest
            .fn()
            .mockResolvedValue(solicitudDocente(EstadoSolicitud.APROBADA)),
          findMany: jest.fn().mockResolvedValue([solicitudDocente(EstadoSolicitud.PENDIENTE)]),
          update: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)),
        },
        docente: { update: jest.fn().mockReturnValue('marcar-docente') },
        seccion: {
          findMany: jest.fn().mockResolvedValue([{ id: 'sec-IS101' }, { id: 'sec-IS202' }]),
        },
        $transaction: jest.fn().mockResolvedValue([]),
      } as any;
    }

    it('marca al docente con su fecha de fin y reasigna sus secciones del periodo', async () => {
      const prisma = prismaResolver();
      const dto = await resolverSolicitudAccesibilidad(
        'sol-d',
        AUTH,
        { decision: 'APROBAR' },
        prisma,
      );

      expect(prisma.docente.update).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        data: { condicionAccesible: true, condicionAccesibleHasta: FIN },
      });
      expect(prisma.seccion.findMany).toHaveBeenCalledWith({
        where: { docenteId: 'doc-1', activa: true, periodo: '2026-2' },
        select: { id: true },
      });
      expect(ejecutarAsignacionADemanda).toHaveBeenCalledTimes(2);
      expect(dto).toMatchObject({
        tipo: 'DOCENTE',
        alumno: { codigo: '0A0690', nombre: 'Dra. Rojas' },
        fechaFin: '2026-12-20',
        resultado: '1 de 2 clases quedaron en el piso 1',
      });
      // Los docentes no tienen Telegram vinculado: no se emite el aviso al alumno.
      expect(emitir).not.toHaveBeenCalled();
    });

    it('el listado muestra la solicitud del docente con sus secciones', async () => {
      const prisma = prismaResolver();
      const r = await listarAccesibilidad(prisma);
      expect(r.pendientes[0]).toMatchObject({
        tipo: 'DOCENTE',
        alumno: { nombre: 'Dra. Rojas' },
        secciones: [{ codigoCurso: 'IS101' }, { codigoCurso: 'IS202', fueraDePiso1: true }],
      });
    });
  });

  describe('vencimiento (R16)', () => {
    it('hoyEnLima usa el día de Lima', () => {
      // 03:00 UTC del 25 es todavía el 24 en Lima.
      expect(hoyEnLima(new Date('2026-11-25T03:00:00.000Z')).toISOString()).toBe(
        '2026-11-24T00:00:00.000Z',
      );
    });

    it('quita la condición vencida de alumnos (ficha y matrículas) y de docentes', async () => {
      const prisma = {
        fichaMedica: {
          findMany: jest.fn().mockResolvedValue([{ alumnoId: 'alu-1' }]),
          updateMany: jest.fn().mockReturnValue('fichas'),
        },
        matricula: { updateMany: jest.fn().mockReturnValue('matriculas') },
        docente: { updateMany: jest.fn().mockReturnValue('docentes') },
        $transaction: jest.fn().mockResolvedValue([{}, {}, { count: 2 }]),
      } as any;

      const r = await vencerCondicionesAccesibles(prisma, new Date('2026-11-24T15:00:00.000Z'));

      const vencida = {
        condicionAccesible: true,
        condicionAccesibleHasta: { lt: new Date('2026-11-24T00:00:00.000Z') },
      };
      const retirar = { condicionAccesible: false, condicionAccesibleHasta: null };
      expect(prisma.fichaMedica.findMany).toHaveBeenCalledWith({
        where: vencida,
        select: { alumnoId: true },
      });
      expect(prisma.fichaMedica.updateMany).toHaveBeenCalledWith({
        where: { alumnoId: { in: ['alu-1'] } },
        data: retirar,
      });
      expect(prisma.matricula.updateMany).toHaveBeenCalledWith({
        where: { alumnoId: { in: ['alu-1'] } },
        data: { movilidadReducida: false },
      });
      expect(prisma.docente.updateMany).toHaveBeenCalledWith({ where: vencida, data: retirar });
      expect(r).toEqual({ alumnos: 1, docentes: 2 });
    });
  });
});

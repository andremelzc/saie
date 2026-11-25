import { EstadoAsignacion, EstadoSolicitud, Prisma, PrismaClient } from '@prisma/client';
import { bus } from '../events/bus';
import { HttpError } from '../lib/http';
import { ResolverSolicitudInput, ResolverSolicitudSchema } from '../lib/resolucionSolicitud';
import { logger } from '../lib/logger';
import { TokenPayload } from '../types/auth';
import { ejecutarAsignacionADemanda } from './asignacionDemanda.service';
import { obtenerPeriodoVigente } from './periodo.service';

/**
 * Issue 3.60 (riesgos R12, R13 y R14): la declaración de accesibilidad del alumno («no puedo
 * subir a pisos superiores») ya no se aplica sola. Crea una solicitud que Coordinación Académica
 * aprueba o rechaza con motivo; solo al aprobarla se marca la movilidad reducida en sus
 * matrículas y se reasignan sus secciones. No se piden diagnósticos: es un requisito de acceso.
 */

/** Decisión de Coordinación: aprobar, o rechazar con un motivo que el alumno verá. */
export const ResolverAccesibilidadSchema = ResolverSolicitudSchema;

export type ResolverAccesibilidadInput = ResolverSolicitudInput;

/** Estado de la declaración que el alumno ve en su perfil. */
export interface EstadoAccesibilidadDTO {
  estado: EstadoSolicitud;
  fechaSolicitud: string;
  fechaResolucion: string | null;
  motivoRechazo: string | null;
}

export interface SeccionAccesibilidadDTO {
  seccionId: string;
  codigoCurso: string;
  nombreCurso: string;
  codigoSeccion: string;
  /** `null` si la sección no tiene aula vigente (escalada o sin asignar). */
  espacios: { identificador: string; pabellon: string; piso: number }[];
  /** `true` si tiene aula vigente y alguna de ellas no está en el piso 1. */
  fueraDePiso1: boolean;
  sinAula: boolean;
}

export interface SolicitudAccesibilidadAdminDTO {
  id: string;
  estado: EstadoSolicitud;
  fechaSolicitud: string;
  fechaResolucion: string | null;
  motivoRechazo: string | null;
  resultado: string | null;
  alumno: { codigo: string; nombre: string };
  secciones: SeccionAccesibilidadDTO[];
}

export interface AccesibilidadAdminDTO {
  periodo: string | null;
  pendientes: SolicitudAccesibilidadAdminDTO[];
  aprobadas: SolicitudAccesibilidadAdminDTO[];
}

export function aEstadoAccesibilidadDTO(s: {
  estado: EstadoSolicitud;
  fechaSolicitud: Date;
  fechaResolucion: Date | null;
  motivoRechazo: string | null;
}): EstadoAccesibilidadDTO {
  return {
    estado: s.estado,
    fechaSolicitud: s.fechaSolicitud.toISOString(),
    fechaResolucion: s.fechaResolucion?.toISOString() ?? null,
    motivoRechazo: s.motivoRechazo,
  };
}

/** La declaración más reciente del alumno (la que se muestra en su perfil), si existe. */
export async function ultimaSolicitudAccesibilidad(
  alumnoId: string,
  db: Pick<PrismaClient, 'solicitudAccesibilidad'> | Prisma.TransactionClient,
) {
  return db.solicitudAccesibilidad.findFirst({
    where: { alumnoId },
    orderBy: { fechaSolicitud: 'desc' },
  });
}

/**
 * Lo que hace la casilla del perfil. Marcarla crea una solicitud pendiente (si no hay una ya
 * pendiente ni la condición aprobada) y no toca ninguna matrícula. Desmarcarla retira la
 * solicitud pendiente y, si la condición estaba aprobada, la quita: el alumno puede dejar de
 * declararla sin verificación.
 */
export async function declararAccesibilidad(
  alumnoId: string,
  declarado: boolean | undefined,
  aprobadaAntes: boolean,
  tx: Prisma.TransactionClient,
): Promise<void> {
  if (declarado === undefined) return;

  const pendiente = await tx.solicitudAccesibilidad.findFirst({
    where: { alumnoId, estado: EstadoSolicitud.PENDIENTE },
  });

  if (declarado) {
    if (aprobadaAntes || pendiente) return;
    await tx.solicitudAccesibilidad.create({ data: { alumnoId } });
    return;
  }

  if (pendiente) {
    await tx.solicitudAccesibilidad.delete({ where: { id: pendiente.id } });
  }
  if (aprobadaAntes) {
    await tx.fichaMedica.update({ where: { alumnoId }, data: { condicionAccesible: false } });
    await tx.matricula.updateMany({ where: { alumnoId }, data: { movilidadReducida: false } });
  }
}

const INCLUIR_SOLICITUD = {
  alumno: {
    select: {
      id: true,
      codigo: true,
      nombre: true,
      matriculas: {
        select: {
          seccion: {
            select: {
              id: true,
              codigoSeccion: true,
              periodo: true,
              curso: { select: { codigo: true, nombre: true } },
              asignaciones: {
                where: { estado: EstadoAsignacion.VIGENTE },
                select: {
                  espacios: {
                    select: {
                      espacio: { select: { identificador: true, pabellon: true, piso: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.SolicitudAccesibilidadInclude;

type SolicitudConAlumno = Prisma.SolicitudAccesibilidadGetPayload<{
  include: typeof INCLUIR_SOLICITUD;
}>;

function aSeccionesDTO(s: SolicitudConAlumno, periodo: string | null): SeccionAccesibilidadDTO[] {
  return s.alumno.matriculas
    .map((m) => m.seccion)
    .filter((sec) => periodo === null || sec.periodo === periodo)
    .map((sec) => {
      const espacios = sec.asignaciones.flatMap((a) => a.espacios.map((e) => e.espacio));
      return {
        seccionId: sec.id,
        codigoCurso: sec.curso.codigo,
        nombreCurso: sec.curso.nombre,
        codigoSeccion: sec.codigoSeccion,
        espacios,
        sinAula: espacios.length === 0,
        fueraDePiso1: espacios.some((e) => e.piso !== 1),
      };
    })
    .sort((a, b) =>
      `${a.codigoCurso}${a.codigoSeccion}`.localeCompare(`${b.codigoCurso}${b.codigoSeccion}`),
    );
}

function aSolicitudAdminDTO(
  s: SolicitudConAlumno,
  periodo: string | null,
): SolicitudAccesibilidadAdminDTO {
  return {
    id: s.id,
    estado: s.estado,
    fechaSolicitud: s.fechaSolicitud.toISOString(),
    fechaResolucion: s.fechaResolucion?.toISOString() ?? null,
    motivoRechazo: s.motivoRechazo,
    resultado: s.resultado,
    alumno: { codigo: s.alumno.codigo, nombre: s.alumno.nombre },
    secciones: aSeccionesDTO(s, periodo),
  };
}

/**
 * Vista «Accesibilidad» de Coordinación: declaraciones pendientes y alumnos aprobados con sus
 * secciones del periodo vigente y el piso actual de cada una.
 */
export async function listarAccesibilidad(prisma: PrismaClient): Promise<AccesibilidadAdminDTO> {
  const periodo = await obtenerPeriodoVigente(prisma);
  const [pendientes, aprobadas] = await Promise.all([
    prisma.solicitudAccesibilidad.findMany({
      where: { estado: EstadoSolicitud.PENDIENTE },
      include: INCLUIR_SOLICITUD,
      orderBy: { fechaSolicitud: 'asc' },
    }),
    // De cada alumno solo cuenta su aprobación vigente: la ficha sigue marcada.
    prisma.solicitudAccesibilidad.findMany({
      where: {
        estado: EstadoSolicitud.APROBADA,
        alumno: { fichaMedica: { condicionAccesible: true } },
      },
      include: INCLUIR_SOLICITUD,
      orderBy: { fechaResolucion: 'desc' },
      distinct: ['alumnoId'],
    }),
  ]);
  return {
    periodo,
    pendientes: pendientes.map((s) => aSolicitudAdminDTO(s, periodo)),
    aprobadas: aprobadas.map((s) => aSolicitudAdminDTO(s, periodo)),
  };
}

/** «3 de 4 clases quedaron en el piso 1»: el resultado que se guarda y se le informa al alumno. */
export function resumirResultado(secciones: SeccionAccesibilidadDTO[]): string {
  const conAula = secciones.filter((s) => !s.sinAula);
  const enPiso1 = conAula.filter((s) => !s.fueraDePiso1).length;
  const sinAula = secciones.length - conAula.length;
  const partes = [
    `${enPiso1} de ${conAula.length} ${conAula.length === 1 ? 'clase quedó' : 'clases quedaron'} en el piso 1`,
  ];
  if (sinAula > 0) {
    partes.push(`${sinAula} ${sinAula === 1 ? 'clase espera' : 'clases esperan'} revisión`);
  }
  return partes.join('; ');
}

/**
 * Aprueba o rechaza una declaración pendiente. Al aprobarla marca la condición en la ficha y la
 * movilidad reducida en las matrículas, reasigna las secciones del alumno en el periodo vigente
 * (si alguna no consigue el piso 1, el motor registra la alerta de accesibilidad, Issue 3.59) y
 * guarda el resultado. En ambos casos se emite `accesibilidad.resuelta` para avisar al alumno.
 */
export async function resolverSolicitudAccesibilidad(
  id: string,
  auth: TokenPayload,
  entrada: ResolverAccesibilidadInput,
  prisma: PrismaClient,
): Promise<SolicitudAccesibilidadAdminDTO> {
  const solicitud = await prisma.solicitudAccesibilidad.findUnique({ where: { id } });
  if (!solicitud) {
    throw new HttpError(404, 'La solicitud de accesibilidad no existe');
  }
  if (solicitud.estado !== EstadoSolicitud.PENDIENTE) {
    throw new HttpError(409, 'La solicitud ya fue resuelta');
  }

  const resolucion = { resueltaPorId: auth.sub, fechaResolucion: new Date() };

  if (entrada.decision === 'RECHAZAR') {
    const rechazada = await prisma.solicitudAccesibilidad.update({
      where: { id },
      data: { ...resolucion, estado: EstadoSolicitud.RECHAZADA, motivoRechazo: entrada.motivo },
      include: INCLUIR_SOLICITUD,
    });
    void bus.emitir('accesibilidad.resuelta', {
      alumnoId: solicitud.alumnoId,
      estado: EstadoSolicitud.RECHAZADA,
      resultado: null,
    });
    return aSolicitudAdminDTO(rechazada, await obtenerPeriodoVigente(prisma));
  }

  await prisma.$transaction([
    prisma.solicitudAccesibilidad.update({
      where: { id },
      data: { ...resolucion, estado: EstadoSolicitud.APROBADA },
    }),
    prisma.fichaMedica.upsert({
      where: { alumnoId: solicitud.alumnoId },
      create: { alumnoId: solicitud.alumnoId, condicionAccesible: true },
      update: { condicionAccesible: true },
    }),
    prisma.matricula.updateMany({
      where: { alumnoId: solicitud.alumnoId },
      data: { movilidadReducida: true },
    }),
  ]);

  const periodo = await obtenerPeriodoVigente(prisma);
  const matriculas = await prisma.matricula.findMany({
    where: { alumnoId: solicitud.alumnoId, ...(periodo ? { seccion: { periodo } } : {}) },
    select: { seccionId: true },
  });
  for (const { seccionId } of matriculas) {
    try {
      await ejecutarAsignacionADemanda(seccionId, prisma);
    } catch (error: unknown) {
      // Una sección que no se pudo reasignar (por ejemplo, corrida en curso) no deshace la
      // aprobación: queda con la prioridad marcada para la próxima corrida.
      logger.warn(
        { seccionId, causa: error instanceof Error ? error.name : 'desconocido' },
        'No se pudo reasignar una sección tras aprobar la accesibilidad',
      );
    }
  }

  const leida = await prisma.solicitudAccesibilidad.findUniqueOrThrow({
    where: { id },
    include: INCLUIR_SOLICITUD,
  });
  const resultado = resumirResultado(aSeccionesDTO(leida, periodo));
  await prisma.solicitudAccesibilidad.update({ where: { id }, data: { resultado } });
  void bus.emitir('accesibilidad.resuelta', {
    alumnoId: solicitud.alumnoId,
    estado: EstadoSolicitud.APROBADA,
    resultado,
  });
  return aSolicitudAdminDTO({ ...leida, resultado }, periodo);
}

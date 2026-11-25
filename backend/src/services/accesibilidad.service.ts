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
  /** Issue 3.61 (R16): último día de una condición temporal (`AAAA-MM-DD`); `null` = no vence. */
  fechaFin: string | null;
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
  /** Issue 3.61 (R15): quién la declara. `alumno` guarda el código y nombre de cualquiera de los dos. */
  tipo: 'ALUMNO' | 'DOCENTE';
  alumno: { codigo: string; nombre: string };
  /** Issue 3.61 (R16): `AAAA-MM-DD` o `null` si la condición no vence. */
  fechaFin: string | null;
  secciones: SeccionAccesibilidadDTO[];
}

export interface AccesibilidadAdminDTO {
  periodo: string | null;
  pendientes: SolicitudAccesibilidadAdminDTO[];
  aprobadas: SolicitudAccesibilidadAdminDTO[];
}

/** Una fecha `@db.Date` como `AAAA-MM-DD` (o `null`). */
export function aFechaISO(fecha: Date | null | undefined): string | null {
  return fecha ? fecha.toISOString().slice(0, 10) : null;
}

export function aEstadoAccesibilidadDTO(s: {
  estado: EstadoSolicitud;
  fechaSolicitud: Date;
  fechaResolucion: Date | null;
  motivoRechazo: string | null;
  fechaFin?: Date | null;
}): EstadoAccesibilidadDTO {
  return {
    estado: s.estado,
    fechaSolicitud: s.fechaSolicitud.toISOString(),
    fechaResolucion: s.fechaResolucion?.toISOString() ?? null,
    motivoRechazo: s.motivoRechazo,
    fechaFin: aFechaISO(s.fechaFin),
  };
}

/** Quien declara la condición (Issue 3.61): un alumno o un docente. */
export type Solicitante = { alumnoId: string } | { docenteId: string };

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
 * declararla sin verificación. Issue 3.61: `fechaFin` (opcional) se guarda en la solicitud; si
 * ya hay una pendiente, se actualiza. Una condición ya aprobada conserva su fecha: para cambiarla
 * se desmarca y se vuelve a declarar.
 */
export async function declararAccesibilidad(
  alumnoId: string,
  declarado: boolean | undefined,
  aprobadaAntes: boolean,
  tx: Prisma.TransactionClient,
  fechaFin?: Date | null,
): Promise<void> {
  const cambio = await declararSolicitud({ alumnoId }, declarado, aprobadaAntes, tx, fechaFin);
  if (cambio === 'RETIRADA_APROBADA') {
    await tx.fichaMedica.update({
      where: { alumnoId },
      data: { condicionAccesible: false, condicionAccesibleHasta: null },
    });
    await tx.matricula.updateMany({ where: { alumnoId }, data: { movilidadReducida: false } });
  }
}

/**
 * Parte común a alumnos y docentes (Issue 3.61): crea, actualiza o retira la solicitud.
 * Devuelve `RETIRADA_APROBADA` si se desmarcó una condición aprobada: quien llama quita la marca.
 */
export async function declararSolicitud(
  solicitante: Solicitante,
  declarado: boolean | undefined,
  aprobadaAntes: boolean,
  tx: Prisma.TransactionClient,
  fechaFin?: Date | null,
): Promise<'SIN_CAMBIOS' | 'PENDIENTE' | 'RETIRADA_APROBADA'> {
  if (declarado === undefined) return 'SIN_CAMBIOS';

  const pendiente = await tx.solicitudAccesibilidad.findFirst({
    where: { ...solicitante, estado: EstadoSolicitud.PENDIENTE },
  });

  if (declarado) {
    if (aprobadaAntes) return 'SIN_CAMBIOS';
    if (pendiente) {
      if (fechaFin !== undefined) {
        await tx.solicitudAccesibilidad.update({ where: { id: pendiente.id }, data: { fechaFin } });
      }
      return 'PENDIENTE';
    }
    await tx.solicitudAccesibilidad.create({
      data: { ...solicitante, fechaFin: fechaFin ?? null },
    });
    return 'PENDIENTE';
  }

  if (pendiente) {
    await tx.solicitudAccesibilidad.delete({ where: { id: pendiente.id } });
  }
  return aprobadaAntes ? 'RETIRADA_APROBADA' : 'SIN_CAMBIOS';
}

const SECCION_CON_AULA = {
  select: {
    id: true,
    codigoSeccion: true,
    periodo: true,
    activa: true,
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
} satisfies Prisma.SeccionDefaultArgs;

const INCLUIR_SOLICITUD = {
  alumno: {
    select: {
      id: true,
      codigo: true,
      nombre: true,
      matriculas: { select: { seccion: SECCION_CON_AULA } },
    },
  },
  // Issue 3.61 (R15): las secciones del docente son las que dicta.
  docente: {
    select: { id: true, codigoDocente: true, nombre: true, secciones: SECCION_CON_AULA },
  },
} satisfies Prisma.SolicitudAccesibilidadInclude;

type SolicitudConAlumno = Prisma.SolicitudAccesibilidadGetPayload<{
  include: typeof INCLUIR_SOLICITUD;
}>;

function seccionesDeSolicitante(s: SolicitudConAlumno) {
  if (s.alumno) return s.alumno.matriculas.map((m) => m.seccion);
  return s.docente?.secciones ?? [];
}

function aSeccionesDTO(s: SolicitudConAlumno, periodo: string | null): SeccionAccesibilidadDTO[] {
  return seccionesDeSolicitante(s)
    .filter((sec) => sec.activa !== false && (periodo === null || sec.periodo === periodo))
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
    tipo: s.alumno ? 'ALUMNO' : 'DOCENTE',
    alumno: s.alumno
      ? { codigo: s.alumno.codigo, nombre: s.alumno.nombre }
      : { codigo: s.docente?.codigoDocente ?? '', nombre: s.docente?.nombre ?? '' },
    fechaFin: aFechaISO(s.fechaFin),
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
    // De cada persona solo cuenta su aprobación vigente: la condición sigue marcada.
    prisma.solicitudAccesibilidad.findMany({
      where: {
        estado: EstadoSolicitud.APROBADA,
        OR: [
          { alumno: { fichaMedica: { condicionAccesible: true } } },
          { docente: { condicionAccesible: true } },
        ],
      },
      include: INCLUIR_SOLICITUD,
      orderBy: { fechaResolucion: 'desc' },
      distinct: ['alumnoId', 'docenteId'],
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
 * Aprobación: marca la condición (con su fecha de fin) y la movilidad reducida. Para un alumno,
 * en su ficha y sus matrículas; para un docente (Issue 3.61), en el docente: el motor la lee en
 * sus secciones. Devuelve las secciones del periodo vigente que hay que reasignar.
 */
async function marcarCondicionAprobada(
  solicitud: {
    id: string;
    alumnoId: string | null;
    docenteId: string | null;
    fechaFin: Date | null;
  },
  resolucion: { resueltaPorId: string; fechaResolucion: Date },
  prisma: PrismaClient,
): Promise<string[]> {
  const aprobar = prisma.solicitudAccesibilidad.update({
    where: { id: solicitud.id },
    data: { ...resolucion, estado: EstadoSolicitud.APROBADA },
  });
  const marca = { condicionAccesible: true, condicionAccesibleHasta: solicitud.fechaFin };
  const periodo = await obtenerPeriodoVigente(prisma);
  const delPeriodo = { activa: true, ...(periodo ? { periodo } : {}) };

  if (solicitud.alumnoId) {
    const alumnoId = solicitud.alumnoId;
    await prisma.$transaction([
      aprobar,
      prisma.fichaMedica.upsert({
        where: { alumnoId },
        create: { alumnoId, ...marca },
        update: marca,
      }),
      prisma.matricula.updateMany({ where: { alumnoId }, data: { movilidadReducida: true } }),
    ]);
    const matriculas = await prisma.matricula.findMany({
      where: { alumnoId, seccion: delPeriodo },
      select: { seccionId: true },
    });
    return matriculas.map((m) => m.seccionId);
  }

  const docenteId = solicitud.docenteId ?? '';
  await prisma.$transaction([
    aprobar,
    prisma.docente.update({ where: { id: docenteId }, data: marca }),
  ]);
  const secciones = await prisma.seccion.findMany({
    where: { docenteId, ...delPeriodo },
    select: { id: true },
  });
  return secciones.map((s) => s.id);
}

/**
 * Reasigna cada sección. Una que no se pudo reasignar (por ejemplo, corrida en curso) no deshace
 * nada: queda con la prioridad marcada para la próxima corrida.
 */
export async function reasignarSecciones(
  seccionIds: string[],
  prisma: PrismaClient,
): Promise<void> {
  for (const seccionId of seccionIds) {
    try {
      await ejecutarAsignacionADemanda(seccionId, prisma);
    } catch (error: unknown) {
      logger.warn(
        { seccionId, causa: error instanceof Error ? error.name : 'desconocido' },
        'No se pudo reasignar una sección tras cambiar la accesibilidad',
      );
    }
  }
}

/**
 * Aprueba o rechaza una declaración pendiente. Al aprobarla marca la condición con su fecha de
 * fin (en la ficha y las matrículas del alumno, o en el docente, Issue 3.61), reasigna sus
 * secciones del periodo vigente (si alguna no consigue el piso 1, el motor registra la alerta de
 * accesibilidad, Issue 3.59) y guarda el resultado. Si la declaró un alumno, en ambos casos se
 * emite `accesibilidad.resuelta` para avisarle por Telegram (los docentes no tienen vinculación).
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
    if (solicitud.alumnoId) {
      void bus.emitir('accesibilidad.resuelta', {
        alumnoId: solicitud.alumnoId,
        estado: EstadoSolicitud.RECHAZADA,
        resultado: null,
      });
    }
    return aSolicitudAdminDTO(rechazada, await obtenerPeriodoVigente(prisma));
  }

  const seccionIds = await marcarCondicionAprobada(solicitud, resolucion, prisma);
  await reasignarSecciones(seccionIds, prisma);

  const periodo = await obtenerPeriodoVigente(prisma);
  const leida = await prisma.solicitudAccesibilidad.findUniqueOrThrow({
    where: { id },
    include: INCLUIR_SOLICITUD,
  });
  const resultado = resumirResultado(aSeccionesDTO(leida, periodo));
  await prisma.solicitudAccesibilidad.update({ where: { id }, data: { resultado } });
  if (solicitud.alumnoId) {
    void bus.emitir('accesibilidad.resuelta', {
      alumnoId: solicitud.alumnoId,
      estado: EstadoSolicitud.APROBADA,
      resultado,
    });
  }
  return aSolicitudAdminDTO({ ...leida, resultado }, periodo);
}

import {
  EstadoAsignacion,
  EstadoSolicitud,
  Prisma,
  PrismaClient,
  TipoEspacio,
  TipoEventoAuditoria,
} from '@prisma/client';
import { z } from 'zod';
import { bus } from '../events/bus';
import { grupoDeSeccion } from '../lib/clasesAgrupadas';
import { HttpError } from '../lib/http';
import { logger } from '../lib/logger';
import { ResolverSolicitudInput, ResolverSolicitudSchema } from '../lib/resolucionSolicitud';
import { TokenPayload } from '../types/auth';
import { ejecutarAsignacionADemanda } from './asignacionDemanda.service';
import { registrarAccionDePersona } from './auditoriaAcciones.service';
import { haySolapamientoHorario, HorarioSlot } from './disponibilidad.service';
import { obtenerDocenteDeCuenta } from './docente.service';
import { asegurarPeriodoEscribible } from './periodo.service';

/**
 * Issue 7.17 (riesgo R22): «dictar todo en laboratorio».
 *
 * Cada grupo de un curso son dos secciones: la de teoría (`2`) y su laboratorio (`2-LAB`). Si el
 * docente dicta todas las horas en laboratorio, cambiar el tipo de la teoría deja dos secciones
 * de laboratorio que el motor asigna por separado y pueden caer en laboratorios distintos a mitad
 * de la clase. Aquí el docente lo pide con una justificación y Coordinación lo aprueba o rechaza
 * con motivo. Al aprobarlo, las franjas de la teoría pasan al laboratorio, la teoría se retira
 * (conserva su historial) y libera su aula, y el laboratorio se reasigna: como el motor busca un
 * espacio libre en todas las franjas de una sección, le toca el mismo laboratorio en todas.
 */

const SUFIJO_LABORATORIO = '-LAB';

export const CrearFusionSchema = z
  .object({
    seccionTeoriaId: z.string().uuid('La sección indicada no es válida'),
    justificacion: z
      .string({ error: 'La justificación es obligatoria' })
      .trim()
      .min(10, 'Explica por qué necesitas dictar todo en laboratorio (al menos 10 caracteres)')
      .max(500, 'La justificación no puede superar 500 caracteres'),
  })
  .strict();

/** Decisión de Coordinación: aprobar, o rechazar con un motivo que el docente verá. */
export const ResolverFusionSchema = ResolverSolicitudSchema;

export type CrearFusionInput = z.infer<typeof CrearFusionSchema>;
export type ResolverFusionInput = ResolverSolicitudInput;

export interface SeccionFusionDTO {
  id: string;
  codigoSeccion: string;
  horarios: HorarioSlot[];
}

export interface SolicitudFusionDTO {
  id: string;
  estado: EstadoSolicitud;
  justificacion: string;
  fechaSolicitud: string;
  fechaResolucion: string | null;
  motivoRechazo: string | null;
  /** Al aprobarla: dónde quedó la sección fusionada. */
  resultado: string | null;
  periodo: string;
  curso: { codigo: string; nombre: string };
  grupo: string;
  docente: { codigoDocente: string; nombre: string };
  seccionTeoria: SeccionFusionDTO;
  seccionLaboratorio: SeccionFusionDTO;
}

export interface FusionesAdminDTO {
  pendientes: SolicitudFusionDTO[];
  /** Las últimas resueltas, de la más reciente a la más antigua. */
  resueltas: SolicitudFusionDTO[];
}

const MAX_RESUELTAS = 30;

const SECCION_FUSION = {
  select: {
    id: true,
    codigoSeccion: true,
    periodo: true,
    curso: { select: { codigo: true, nombre: true } },
    horarios: {
      select: { diaSemana: true, horaInicio: true, horaFin: true },
      orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
    },
  },
} satisfies Prisma.SeccionDefaultArgs;

const INCLUIR_FUSION = {
  docente: { select: { codigoDocente: true, nombre: true } },
  seccionTeoria: SECCION_FUSION,
  seccionLaboratorio: SECCION_FUSION,
} satisfies Prisma.SolicitudFusionLaboratorioInclude;

type FusionConDetalle = Prisma.SolicitudFusionLaboratorioGetPayload<{
  include: typeof INCLUIR_FUSION;
}>;

function aSeccionFusionDTO(s: FusionConDetalle['seccionTeoria']): SeccionFusionDTO {
  return { id: s.id, codigoSeccion: s.codigoSeccion, horarios: s.horarios };
}

export function aSolicitudFusionDTO(s: FusionConDetalle): SolicitudFusionDTO {
  return {
    id: s.id,
    estado: s.estado,
    justificacion: s.justificacion,
    fechaSolicitud: s.fechaSolicitud.toISOString(),
    fechaResolucion: s.fechaResolucion?.toISOString() ?? null,
    motivoRechazo: s.motivoRechazo,
    resultado: s.resultado,
    periodo: s.seccionTeoria.periodo,
    curso: s.seccionTeoria.curso,
    grupo: grupoDeSeccion(s.seccionTeoria.codigoSeccion),
    docente: s.docente,
    seccionTeoria: aSeccionFusionDTO(s.seccionTeoria),
    seccionLaboratorio: aSeccionFusionDTO(s.seccionLaboratorio),
  };
}

/** La sección de laboratorio del mismo grupo (`2` → `2-LAB`), activa y del mismo periodo. */
export async function buscarLaboratorioDelGrupo(
  teoria: { cursoId: string; periodo: string; codigoSeccion: string },
  db: Pick<PrismaClient, 'seccion'> | Prisma.TransactionClient,
) {
  return db.seccion.findFirst({
    where: {
      cursoId: teoria.cursoId,
      periodo: teoria.periodo,
      activa: true,
      tipoEspacioRequerido: TipoEspacio.LABORATORIO,
      codigoSeccion: {
        equals: `${grupoDeSeccion(teoria.codigoSeccion)}${SUFIJO_LABORATORIO}`,
        mode: 'insensitive',
      },
    },
  });
}

/**
 * POST /api/v1/docente/solicitudes-laboratorio — el docente pide dictar todo en laboratorio para
 * una de sus secciones de teoría. Debe tener un laboratorio en el mismo grupo y no puede haber
 * otra solicitud pendiente para la misma sección.
 */
export async function crearSolicitudFusion(
  cuentaId: string,
  entrada: CrearFusionInput,
  prisma: PrismaClient,
): Promise<SolicitudFusionDTO> {
  const docente = await obtenerDocenteDeCuenta(cuentaId, prisma);
  const teoria = await prisma.seccion.findUnique({ where: { id: entrada.seccionTeoriaId } });
  // Una sección ajena responde igual que una inexistente: no se revela qué secciones existen.
  if (!teoria || teoria.docenteId !== docente.id) {
    throw new HttpError(404, 'No encontramos esa sección entre las tuyas');
  }
  if (!teoria.activa) {
    throw new HttpError(409, 'La sección ya no está activa');
  }
  if (
    teoria.tipoEspacioRequerido !== TipoEspacio.AULA_TEORICA ||
    teoria.codigoSeccion.toUpperCase().endsWith(SUFIJO_LABORATORIO)
  ) {
    throw new HttpError(422, 'Solo se puede pedir para una sección de teoría');
  }
  await asegurarPeriodoEscribible(prisma, teoria.periodo);

  const laboratorio = await buscarLaboratorioDelGrupo(teoria, prisma);
  if (!laboratorio) {
    throw new HttpError(
      422,
      'Esta sección no tiene un laboratorio en su grupo: pide a Coordinación que cambie su tipo de aula',
    );
  }

  const pendiente = await prisma.solicitudFusionLaboratorio.findFirst({
    where: { seccionTeoriaId: teoria.id, estado: EstadoSolicitud.PENDIENTE },
  });
  if (pendiente) {
    throw new HttpError(409, 'Ya tienes una solicitud pendiente para esta sección');
  }

  const creada = await prisma.solicitudFusionLaboratorio.create({
    data: {
      docenteId: docente.id,
      seccionTeoriaId: teoria.id,
      seccionLaboratorioId: laboratorio.id,
      justificacion: entrada.justificacion,
    },
    include: INCLUIR_FUSION,
  });
  return aSolicitudFusionDTO(creada);
}

/** GET /api/v1/docente/solicitudes-laboratorio — las solicitudes del docente, recientes primero. */
export async function listarFusionesDeDocente(
  cuentaId: string,
  prisma: PrismaClient,
): Promise<SolicitudFusionDTO[]> {
  const docente = await obtenerDocenteDeCuenta(cuentaId, prisma);
  const filas = await prisma.solicitudFusionLaboratorio.findMany({
    where: { docenteId: docente.id },
    include: INCLUIR_FUSION,
    orderBy: { fechaSolicitud: 'desc' },
  });
  return filas.map(aSolicitudFusionDTO);
}

/** GET /api/v1/admin/solicitudes-laboratorio — pendientes y las últimas resueltas. */
export async function listarFusiones(prisma: PrismaClient): Promise<FusionesAdminDTO> {
  const [pendientes, resueltas] = await Promise.all([
    prisma.solicitudFusionLaboratorio.findMany({
      where: { estado: EstadoSolicitud.PENDIENTE },
      include: INCLUIR_FUSION,
      orderBy: { fechaSolicitud: 'asc' },
    }),
    prisma.solicitudFusionLaboratorio.findMany({
      where: { estado: { not: EstadoSolicitud.PENDIENTE } },
      include: INCLUIR_FUSION,
      orderBy: { fechaResolucion: 'desc' },
      take: MAX_RESUELTAS,
    }),
  ]);
  return {
    pendientes: pendientes.map(aSolicitudFusionDTO),
    resueltas: resueltas.map(aSolicitudFusionDTO),
  };
}

const NOMBRE_DIA: Record<string, string> = {
  LUNES: 'Lunes',
  MARTES: 'Martes',
  MIERCOLES: 'Miércoles',
  JUEVES: 'Jueves',
  VIERNES: 'Viernes',
  SABADO: 'Sábado',
  DOMINGO: 'Domingo',
};

function textoFranjas(franjas: HorarioSlot[]): string[] {
  return franjas.map((f) => `${NOMBRE_DIA[f.diaSemana]} ${f.horaInicio}–${f.horaFin}`);
}

/** Franjas de la teoría que se cruzan con las del laboratorio: no se pueden juntar. */
function franjasQueSeCruzan(teoria: HorarioSlot[], laboratorio: HorarioSlot[]): HorarioSlot[] {
  return teoria.filter((t) => laboratorio.some((l) => haySolapamientoHorario(t, l)));
}

/**
 * Resultado de la reasignación, en lenguaje llano: «Laboratorio L-01 en todas sus franjas» o «quedó
 * en revisión: motivo». Si no se pudo reasignar ahora (corrida en curso), se dice.
 */
async function reasignarFusionada(
  seccionId: string,
  prisma: PrismaClient,
): Promise<{ resultado: string; espacios: { id: string; identificador: string }[] }> {
  try {
    const resumen = await ejecutarAsignacionADemanda(seccionId, prisma);
    const r = resumen.resultados[0];
    if (r?.estado === EstadoAsignacion.VIGENTE) {
      const espacios = await prisma.espacio.findMany({
        where: { id: { in: r.espacioIds } },
        select: { id: true, identificador: true },
      });
      const nombres = espacios.map((e) => e.identificador).join(', ');
      return { resultado: `${nombres} en todas sus franjas`, espacios };
    }
    return {
      resultado: `quedó en revisión: ${r?.motivoEscalamiento ?? 'no se encontró un laboratorio libre'}`,
      espacios: [],
    };
  } catch (error: unknown) {
    logger.warn(
      { seccionId, causa: error instanceof Error ? error.name : 'desconocido' },
      'No se pudo reasignar la sección fusionada',
    );
    return {
      resultado: 'falta reasignarla: había una corrida de asignación en curso',
      espacios: [],
    };
  }
}

/** La solicitud a resolver: 404 si no existe, 409 si ya no está pendiente. */
async function solicitudPendiente(id: string, prisma: PrismaClient): Promise<FusionConDetalle> {
  const solicitud = await prisma.solicitudFusionLaboratorio.findUnique({
    where: { id },
    include: INCLUIR_FUSION,
  });
  if (!solicitud) throw new HttpError(404, 'La solicitud no existe');
  if (solicitud.estado !== EstadoSolicitud.PENDIENTE) {
    throw new HttpError(409, 'La solicitud ya fue resuelta');
  }
  return solicitud;
}

/**
 * PATCH /api/v1/admin/solicitudes-laboratorio/:id/resolver (solo Coordinación).
 *
 * Rechazar guarda el motivo. Aprobar, en una transacción: copia las franjas de la teoría al
 * laboratorio, matricula en el laboratorio a los alumnos de la teoría que no lo estaban, retira
 * la teoría (`activa = false`) y deja su asignación como HISTORICA (libera el aula), y registra
 * ambos cambios en la auditoría. Después reasigna el laboratorio y avisa a los alumnos.
 */
export async function resolverSolicitudFusion(
  id: string,
  auth: TokenPayload,
  entrada: ResolverFusionInput,
  prisma: PrismaClient,
): Promise<SolicitudFusionDTO> {
  const solicitud = await solicitudPendiente(id, prisma);
  const resolucion = { resueltaPorId: auth.sub, fechaResolucion: new Date() };

  if (entrada.decision === 'RECHAZAR') {
    return aSolicitudFusionDTO(
      await prisma.solicitudFusionLaboratorio.update({
        include: INCLUIR_FUSION,
        where: { id },
        data: { estado: EstadoSolicitud.RECHAZADA, motivoRechazo: entrada.motivo, ...resolucion },
      }),
    );
  }

  const [teoria, laboratorio] = await Promise.all([
    prisma.seccion.findUnique({
      where: { id: solicitud.seccionTeoriaId },
      include: { horarios: true, matriculas: true },
    }),
    prisma.seccion.findUnique({
      where: { id: solicitud.seccionLaboratorioId },
      include: { horarios: true, matriculas: { select: { alumnoId: true } } },
    }),
  ]);
  if (!teoria?.activa || !laboratorio?.activa) {
    throw new HttpError(409, 'La sección de teoría o la de laboratorio ya no está activa');
  }
  await asegurarPeriodoEscribible(prisma, teoria.periodo);

  const cruces = franjasQueSeCruzan(teoria.horarios, laboratorio.horarios);
  if (cruces.length > 0) {
    throw new HttpError(
      409,
      `No se pueden juntar: la teoría y el laboratorio se cruzan (${textoFranjas(cruces).join(', ')})`,
    );
  }

  const enLaboratorio = new Set(laboratorio.matriculas.map((m) => m.alumnoId));
  const nuevasMatriculas = teoria.matriculas.filter((m) => !enLaboratorio.has(m.alumnoId));
  const franjasAntes = textoFranjas(laboratorio.horarios);
  const franjasDespues = textoFranjas([...laboratorio.horarios, ...teoria.horarios]);
  const nombre = `${solicitud.seccionTeoria.curso.codigo}-${teoria.codigoSeccion}`;
  const nombreLab = `${solicitud.seccionTeoria.curso.codigo}-${laboratorio.codigoSeccion}`;

  await prisma.$transaction(async (tx) => {
    await tx.horario.createMany({
      data: teoria.horarios.map((h) => ({
        seccionId: laboratorio.id,
        diaSemana: h.diaSemana,
        horaInicio: h.horaInicio,
        horaFin: h.horaFin,
      })),
    });
    if (nuevasMatriculas.length > 0) {
      await tx.matricula.createMany({
        data: nuevasMatriculas.map((m) => ({
          alumnoId: m.alumnoId,
          seccionId: laboratorio.id,
          movilidadReducida: m.movilidadReducida,
        })),
        skipDuplicates: true,
      });
    }
    await tx.seccion.update({ where: { id: teoria.id }, data: { activa: false } });
    await tx.asignacion.updateMany({
      where: {
        seccionId: teoria.id,
        estado: { in: [EstadoAsignacion.VIGENTE, EstadoAsignacion.ESCALADA] },
      },
      data: { estado: EstadoAsignacion.HISTORICA },
    });
    await tx.solicitudFusionLaboratorio.update({
      where: { id },
      data: { ...resolucion, estado: EstadoSolicitud.APROBADA },
    });
    await registrarAccionDePersona(tx, {
      tipoEvento: TipoEventoAuditoria.EDICION_SECCION,
      cuentaId: auth.sub,
      seccionId: laboratorio.id,
      descripcion: `Sección ${nombreLab} recibe las franjas de ${nombre} (dictar todo en laboratorio)`,
      cambios: [{ campo: 'horarios', anterior: franjasAntes, nuevo: franjasDespues }],
    });
    await registrarAccionDePersona(tx, {
      tipoEvento: TipoEventoAuditoria.EDICION_SECCION,
      cuentaId: auth.sub,
      seccionId: teoria.id,
      descripcion: `Sección ${nombre} retirada: se dicta todo en ${nombreLab}`,
      cambios: [{ campo: 'activa', anterior: true, nuevo: false }],
    });
  });

  const { resultado, espacios } = await reasignarFusionada(laboratorio.id, prisma);
  const aprobada = await prisma.solicitudFusionLaboratorio.update({
    where: { id },
    data: { resultado },
    include: INCLUIR_FUSION,
  });

  void bus.emitir('seccion.fusionada', {
    seccionTeoriaId: teoria.id,
    seccionLaboratorioId: laboratorio.id,
    codigoCurso: solicitud.seccionTeoria.curso.codigo,
    nombreCurso: solicitud.seccionTeoria.curso.nombre,
    grupo: grupoDeSeccion(teoria.codigoSeccion),
    horarios: aprobada.seccionLaboratorio.horarios,
    espacios,
  });

  return aSolicitudFusionDTO(aprobada);
}

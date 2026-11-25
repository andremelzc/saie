import { randomUUID } from 'crypto';
import { EstadoAsignacion, PrismaClient, TipoEventoAuditoria } from '@prisma/client';
import { HttpError } from '../lib/http';
import { EspacioConexo } from '../rules/buscarBloqueContiguo';
import {
  construirEventoCambio,
  detectarCambioDeEspacios,
  emitirCambiosDeAsignacion,
} from '../events/emisores';
import { construirGrafoContiguedad, obtenerEspaciosContiguos } from './contiguedad.service';
import { mapearSoftwareInstalado, mapearSoftwareRequerido } from './software.service';
import { orquestarAsignacionSeccion } from '../rules/orquestadorAsignacion';
import { ejecutarCorridaBatch } from '../rules/corridaBatch';
import { consultarUbicacionesSeccionesParalelas } from '../rules/cercaniaParalelas';
import {
  AsignacionExistenteContexto,
  ResultadoCorridaBatch,
  ResultadoOrquestacion,
  SeccionInputMotor,
} from '../types/asignacion';
import { OrigenCorrida } from '../types/asignacionDemanda';
import { AsignacionFueraDePiso1, registrarAlertaAccesibilidad } from './alerta.service';

/**
 * Carga los espacios habilitados y construye la función de vecinos contiguos desde Prisma.
 * Un espacio deshabilitado no entra al grafo, así que tampoco forma parte de un bloque contiguo.
 */
export async function cargarContextoEspacios(prisma: PrismaClient): Promise<{
  todosLosEspacios: EspacioConexo[];
  obtenerVecinos: (espacioId: string) => string[];
}> {
  const [espaciosDb, contiguosDb] = await Promise.all([
    prisma.espacio.findMany({
      where: { habilitado: true },
      include: { softwareInstaladoCatalogo: { include: { software: true } } },
    }),
    prisma.espacioContiguo.findMany(),
  ]);

  const todosLosEspacios: EspacioConexo[] = espaciosDb.map((e) => ({
    id: e.id,
    identificador: e.identificador,
    tipo: e.tipo,
    pabellon: e.pabellon,
    piso: e.piso,
    aforoNominal: e.aforoNominal,
    pcsMalogradas: e.pcsMalogradas,
    softwareInstalado: mapearSoftwareInstalado(e.softwareInstaladoCatalogo),
    distanciaAscensor: e.distanciaAscensor,
  }));

  const grafo = construirGrafoContiguedad(
    espaciosDb.map((e) => ({ id: e.id, tipo: e.tipo, identificador: e.identificador })),
    contiguosDb.map((c) => ({ idA: c.espacioIdA, idB: c.espacioIdB })),
  );

  const obtenerVecinos = (espacioId: string) => {
    try {
      return obtenerEspaciosContiguos(espacioId, grafo);
    } catch {
      return [];
    }
  };

  return { todosLosEspacios, obtenerVecinos };
}

/**
 * Carga los datos de una sección con sus matrículas, horarios y requerimientos.
 */
export async function cargarSeccionInputPorId(
  seccionId: string,
  prisma: PrismaClient,
): Promise<SeccionInputMotor | null> {
  const seccion = await prisma.seccion.findUnique({
    where: { id: seccionId },
    include: {
      curso: true,
      horarios: true,
      matriculas: true,
      softwareRequerido: { include: { software: true } },
    },
  });

  if (!seccion) {
    return null;
  }
  // Issue 1.17 (R35): una sección que dejó de figurar en el CSV de su curso no se asigna.
  if (seccion.activa === false) {
    throw new HttpError(
      409,
      'La sección está inactiva: ya no figura en el último archivo de cursos y secciones de su curso',
    );
  }

  const tieneMovilidad = seccion.matriculas.some((m) => m.movilidadReducida === true);

  return {
    id: seccion.id,
    cursoId: seccion.cursoId,
    codigoCurso: seccion.curso?.codigo,
    nombreCurso: seccion.curso?.nombre,
    codigoSeccion: seccion.codigoSeccion,
    periodo: seccion.periodo,
    tipoEspacioRequerido: seccion.tipoEspacioRequerido,
    softwareRequerido: mapearSoftwareRequerido(seccion.softwareRequerido),
    alumnosMatriculados: seccion.matriculas.length,
    movilidadReducida: tieneMovilidad,
    horarios: seccion.horarios.map((h) => ({
      diaSemana: h.diaSemana,
      horaInicio: h.horaInicio,
      horaFin: h.horaFin,
    })),
  };
}

/**
 * Issue 2.10 & 2.15: Ejecuta la orquestación para una sección individual y persiste el resultado en la BD.
 */
export async function procesarAsignacionSeccionIndividual(
  seccionId: string,
  prisma: PrismaClient,
): Promise<ResultadoOrquestacion> {
  const seccionInput = await cargarSeccionInputPorId(seccionId, prisma);
  if (!seccionInput) {
    throw new Error(`Sección con ID ${seccionId} no encontrada`);
  }

  const { todosLosEspacios, obtenerVecinos } = await cargarContextoEspacios(prisma);

  // Consultar asignaciones vigentes activas para disponibilidad
  const asignacionesVigentesDb = await prisma.asignacion.findMany({
    where: {
      estado: EstadoAsignacion.VIGENTE,
      seccionId: { not: seccionId },
      // Issue 4.64 (R52): solo cuentan las asignaciones del mismo periodo.
      seccion: { periodo: seccionInput.periodo },
    },
    include: {
      espacios: true,
      seccion: {
        include: { horarios: true },
      },
    },
  });

  const ocupacionesVigentes = asignacionesVigentesDb.map((asig) => ({
    id: asig.id,
    estado: asig.estado,
    espacioIds: asig.espacios.map((e) => e.espacioId),
    horarios: asig.seccion.horarios.map((h) => ({
      diaSemana: h.diaSemana,
      horaInicio: h.horaInicio,
      horaFin: h.horaFin,
    })),
  }));

  // Consultar ubicación de secciones paralelas del mismo curso
  const paralelas = await consultarUbicacionesSeccionesParalelas(
    seccionInput.cursoId,
    seccionId,
    seccionInput.periodo,
    prisma,
  );

  // Consultar asignación previa de esta sección
  const asignacionPreviaDb = await prisma.asignacion.findFirst({
    where: { seccionId },
    orderBy: { fechaAsignacion: 'desc' },
    include: {
      espacios: true,
      seccion: { include: { horarios: true } },
    },
  });

  const asignacionPrevia: AsignacionExistenteContexto | null = asignacionPreviaDb
    ? {
        id: asignacionPreviaDb.id,
        seccionId: asignacionPreviaDb.seccionId,
        estado: asignacionPreviaDb.estado,
        espacioIds: asignacionPreviaDb.espacios.map((e) => e.espacioId),
        horarios: asignacionPreviaDb.seccion.horarios.map((h) => ({
          diaSemana: h.diaSemana,
          horaInicio: h.horaInicio,
          horaFin: h.horaFin,
        })),
        huellaEntrada: asignacionPreviaDb.huellaEntrada,
        motivoEscalamiento: asignacionPreviaDb.motivoEscalamiento,
      }
    : null;

  const resultado = orquestarAsignacionSeccion({
    seccion: seccionInput,
    todosLosEspacios,
    asignacionesVigentes: ocupacionesVigentes,
    obtenerVecinosContiguos: obtenerVecinos,
    paralelasAsignadas: paralelas,
    asignacionPrevia,
  });

  // Si no fue conservada por idempotencia, persistir en base de datos
  if (!resultado.conservadaPorIdempotencia) {
    await prisma.$transaction(async (tx) => {
      // Marcar asignaciones previas como HISTORICA
      await tx.asignacion.updateMany({
        where: { seccionId, estado: { in: [EstadoAsignacion.VIGENTE, EstadoAsignacion.ESCALADA] } },
        data: { estado: EstadoAsignacion.HISTORICA },
      });

      // Crear nueva asignación
      const nuevaAsignacion = await tx.asignacion.create({
        data: {
          seccionId,
          estado: resultado.estado,
          motivoEscalamiento: resultado.motivoEscalamiento || null,
          huellaEntrada: resultado.huellaEntrada,
          espacios: {
            create: resultado.espacioIds.map((espId) => ({
              espacioId: espId,
            })),
          },
        },
      });

      // Registrar auditoría
      await tx.registroAuditoria.create({
        data: {
          tipoEvento:
            resultado.estado === EstadoAsignacion.VIGENTE
              ? TipoEventoAuditoria.ASIGNACION
              : TipoEventoAuditoria.ESCALAMIENTO,
          asignacionId: nuevaAsignacion.id,
          origen: 'SECCION',
          espaciosIds: resultado.espacioIds,
          puntaje: resultado.puntajeCercania ?? null,
          detalle:
            resultado.estado === EstadoAsignacion.VIGENTE
              ? `Asignación automática exitosa a espacios: [${resultado.espacioIds.join(', ')}] (Puntaje cercanía: ${resultado.puntajeCercania ?? 'N/A'})`
              : `Sección escalada a revisión manual: ${resultado.motivoEscalamiento}`,
        },
      });

      // Issue 3.59 (riesgo R10): el plan B de accesibilidad no pasa en silencio.
      const fueraDePiso1 = asignacionFueraDePiso1(
        resultado,
        nuevaAsignacion.id,
        seccionInput,
        todosLosEspacios,
      );
      if (fueraDePiso1) await registrarAlertaAccesibilidad(fueraDePiso1, tx);
    });

    // Issue 2.16: el aviso sale una vez confirmada la transacción, nunca dentro de ella.
    const cambio = detectarCambioDeEspacios(
      asignacionPrevia,
      resultado.estado,
      resultado.espacioIds,
    );
    if (cambio) {
      emitirCambiosDeAsignacion([construirEventoCambio(seccionInput, cambio, todosLosEspacios)]);
    }
  }

  return resultado;
}

/** Opciones de la corrida del periodo. */
export interface OpcionesCorrida {
  /** Issue 2.26: «Reorganizar con prioridad» (escaladas primero, sin conservar asignaciones). */
  priorizarEscaladas?: boolean;
}

/**
 * Datos que necesita la corrida de un periodo: secciones, asignaciones previas y espacios. Lo usan
 * la corrida y la simulación de la reorganización (Issue 2.26), para que calculen lo mismo.
 */
export async function cargarEntradaCorridaPeriodo(periodo: string, prisma: PrismaClient) {
  const { todosLosEspacios, obtenerVecinos } = await cargarContextoEspacios(prisma);

  // Obtener todas las secciones activas del periodo con sus datos (Issue 1.17: las inactivas ya
  // no figuran en el CSV de su curso y no se asignan).
  const seccionesDb = await prisma.seccion.findMany({
    where: { periodo, activa: true },
    include: {
      curso: true,
      horarios: true,
      matriculas: true,
      softwareRequerido: { include: { software: true } },
    },
  });

  const seccionesInput: SeccionInputMotor[] = seccionesDb.map((s) => ({
    id: s.id,
    cursoId: s.cursoId,
    codigoCurso: s.curso?.codigo,
    nombreCurso: s.curso?.nombre,
    codigoSeccion: s.codigoSeccion,
    periodo: s.periodo,
    tipoEspacioRequerido: s.tipoEspacioRequerido,
    softwareRequerido: mapearSoftwareRequerido(s.softwareRequerido),
    alumnosMatriculados: s.matriculas.length,
    movilidadReducida: s.matriculas.some((m) => m.movilidadReducida === true),
    horarios: s.horarios.map((h) => ({
      diaSemana: h.diaSemana,
      horaInicio: h.horaInicio,
      horaFin: h.horaFin,
    })),
  }));

  // Obtener asignaciones existentes del periodo
  const asignacionesExistentesDb = await prisma.asignacion.findMany({
    where: {
      seccion: { periodo },
      estado: { in: [EstadoAsignacion.VIGENTE, EstadoAsignacion.ESCALADA] },
    },
    include: {
      espacios: true,
      seccion: { include: { horarios: true } },
    },
  });

  const asignacionesPrevias: AsignacionExistenteContexto[] = asignacionesExistentesDb.map((a) => ({
    id: a.id,
    seccionId: a.seccionId,
    estado: a.estado,
    espacioIds: a.espacios.map((e) => e.espacioId),
    horarios: a.seccion.horarios.map((h) => ({
      diaSemana: h.diaSemana,
      horaInicio: h.horaInicio,
      horaFin: h.horaFin,
    })),
    huellaEntrada: a.huellaEntrada,
    motivoEscalamiento: a.motivoEscalamiento,
  }));

  return { seccionesInput, asignacionesPrevias, todosLosEspacios, obtenerVecinos };
}

/**
 * Issue 2.26: en la reorganización también se avisa a quien pasa de escalada a tener aula y a quien
 * pierde la suya (`detectarCambioDeEspacios` solo cubre el cambio entre dos aulas).
 */
export function cambioPorReorganizacion(
  previa: { estado: EstadoAsignacion; espacioIds: string[] } | undefined,
  estado: EstadoAsignacion,
  espacioIds: string[],
): { anteriores: string[]; nuevos: string[] } | null {
  if (!previa || previa.estado === estado) return null;
  return {
    anteriores: previa.estado === EstadoAsignacion.VIGENTE ? previa.espacioIds : [],
    nuevos: estado === EstadoAsignacion.VIGENTE ? espacioIds : [],
  };
}

/** Lo que cambiaría «Reorganizar con prioridad» (Issue 2.26), sin guardar nada. */
export interface SimulacionReorganizacion {
  /** Secciones que hoy están escaladas. */
  totalEscaladas: number;
  /** De esas, cuántas conseguirían aula. */
  escaladasConAula: number;
  /** Secciones con aula que pasarían a otra. */
  cambianDeAula: number;
  /** Secciones con aula que quedarían escaladas. */
  pierdenAula: number;
}

/** Compara la reorganización con las asignaciones actuales. */
export function compararReorganizacion(
  previas: AsignacionExistenteContexto[],
  resultados: ResultadoOrquestacion[],
): SimulacionReorganizacion {
  const previaPorSeccion = new Map(previas.map((a) => [a.seccionId, a]));
  const simulacion: SimulacionReorganizacion = {
    totalEscaladas: previas.filter((a) => a.estado === EstadoAsignacion.ESCALADA).length,
    escaladasConAula: 0,
    cambianDeAula: 0,
    pierdenAula: 0,
  };
  for (const res of resultados) {
    const previa = previaPorSeccion.get(res.seccionId);
    if (!previa) continue;
    const ahoraTieneAula = res.estado === EstadoAsignacion.VIGENTE;
    if (previa.estado === EstadoAsignacion.ESCALADA && ahoraTieneAula) {
      simulacion.escaladasConAula++;
    } else if (previa.estado === EstadoAsignacion.VIGENTE && !ahoraTieneAula) {
      simulacion.pierdenAula++;
    } else if (detectarCambioDeEspacios(previa, res.estado, res.espacioIds)) {
      simulacion.cambianDeAula++;
    }
  }
  return simulacion;
}

/**
 * Issue 2.26: calcula en memoria la reorganización con prioridad del periodo (el motor es puro) y
 * la compara con lo actual, para que Coordinación vea cuántas secciones cambiarían antes de
 * confirmar. No escribe nada.
 */
export async function simularReorganizacion(
  periodo: string,
  prisma: PrismaClient,
): Promise<SimulacionReorganizacion> {
  const { seccionesInput, asignacionesPrevias, todosLosEspacios, obtenerVecinos } =
    await cargarEntradaCorridaPeriodo(periodo, prisma);
  const resultado = ejecutarCorridaBatch({
    periodo,
    secciones: seccionesInput,
    todosLosEspacios,
    obtenerVecinosContiguos: obtenerVecinos,
    asignacionesPrevias,
    priorizarEscaladas: true,
  });
  return compararReorganizacion(asignacionesPrevias, resultado.resultados);
}

/**
 * Issue 2.11: Ejecuta la corrida batch para todas las secciones de un periodo en Prisma.
 * `origen` distingue la corrida pedida por Coordinación de la programada por tiempo (Issue 2.18).
 */
export async function procesarCorridaBatchPeriodo(
  periodo: string,
  prisma: PrismaClient,
  origen: OrigenCorrida = 'DEMANDA',
  opciones: OpcionesCorrida = {},
): Promise<ResultadoCorridaBatch> {
  const { seccionesInput, asignacionesPrevias, todosLosEspacios, obtenerVecinos } =
    await cargarEntradaCorridaPeriodo(periodo, prisma);

  // Ejecutar motor de corrida batch puro
  const resultadoBatch = ejecutarCorridaBatch({
    periodo,
    secciones: seccionesInput,
    todosLosEspacios,
    obtenerVecinosContiguos: obtenerVecinos,
    asignacionesPrevias,
    priorizarEscaladas: opciones.priorizarEscaladas,
  });

  // Issue 2.16: qué secciones cambiaron de espacios respecto de su asignación VIGENTE previa.
  const previaPorSeccion = new Map(asignacionesPrevias.map((a) => [a.seccionId, a]));
  const seccionPorId = new Map(seccionesInput.map((s) => [s.id, s]));
  const eventosCambio = resultadoBatch.resultados.flatMap((res) => {
    if (res.conservadaPorIdempotencia) return [];
    const previa = previaPorSeccion.get(res.seccionId);
    const cambio =
      detectarCambioDeEspacios(previa, res.estado, res.espacioIds) ??
      (opciones.priorizarEscaladas
        ? cambioPorReorganizacion(previa, res.estado, res.espacioIds)
        : null);
    const seccion = seccionPorId.get(res.seccionId);
    return cambio && seccion ? [construirEventoCambio(seccion, cambio, todosLosEspacios)] : [];
  });

  // Persistir los resultados no conservados. Se escribe con 4 consultas masivas dentro de una sola
  // transacción (no una consulta por sección): contra una base remota, cientos de consultas
  // secuenciales superan cualquier tiempo máximo razonable de transacción.
  const nuevos = resultadoBatch.resultados.filter((res) => !res.conservadaPorIdempotencia);
  const ids = nuevos.map(() => randomUUID());
  if (nuevos.length > 0) {
    await prisma.$transaction([
      // Marcar previas como HISTORICA
      prisma.asignacion.updateMany({
        where: {
          seccionId: { in: nuevos.map((res) => res.seccionId) },
          estado: { in: [EstadoAsignacion.VIGENTE, EstadoAsignacion.ESCALADA] },
        },
        data: { estado: EstadoAsignacion.HISTORICA },
      }),
      // Crear las nuevas asignaciones de la corrida batch
      prisma.asignacion.createMany({
        data: nuevos.map((res, i) => ({
          id: ids[i],
          seccionId: res.seccionId,
          estado: res.estado,
          motivoEscalamiento: res.motivoEscalamiento || null,
          corridaId: resultadoBatch.corridaId,
          huellaEntrada: res.huellaEntrada,
        })),
      }),
      prisma.asignacionEspacio.createMany({
        data: nuevos.flatMap((res, i) =>
          res.espacioIds.map((espacioId) => ({ asignacionId: ids[i], espacioId })),
        ),
      }),
      // Auditoría
      prisma.registroAuditoria.createMany({
        data: nuevos.map((res, i) => ({
          tipoEvento:
            res.estado === EstadoAsignacion.VIGENTE
              ? TipoEventoAuditoria.ASIGNACION
              : TipoEventoAuditoria.ESCALAMIENTO,
          asignacionId: ids[i],
          corridaId: resultadoBatch.corridaId,
          origen,
          espaciosIds: res.espacioIds,
          puntaje: res.puntajeCercania ?? null,
          detalle: `[Origen: ${origen}] Corrida Batch [${resultadoBatch.corridaId}] - ${
            res.estado === EstadoAsignacion.VIGENTE
              ? `Asignada a: [${res.espacioIds.join(', ')}]`
              : `Escalada: ${res.motivoEscalamiento}`
          }`,
        })),
      }),
    ]);
  }

  // Issue 3.59 (riesgo R10): alerta para cada sección nueva que quedó fuera del piso 1 teniendo
  // alumnos con movilidad reducida. Va después de guardar la corrida, que ya es atómica.
  const fueraDePiso1 = nuevos
    .map((res, i) =>
      asignacionFueraDePiso1(res, ids[i], seccionPorId.get(res.seccionId), todosLosEspacios),
    )
    .filter((a): a is AsignacionFueraDePiso1 => a !== null);
  if (fueraDePiso1.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const afectada of fueraDePiso1) await registrarAlertaAccesibilidad(afectada, tx);
    });
  }

  // Los avisos salen una vez confirmada la transacción completa.
  emitirCambiosDeAsignacion(eventosCambio);

  return resultadoBatch;
}

/**
 * Issue 3.59 (riesgo R10): si una asignación vigente aplicó el plan B de accesibilidad (no había
 * lugar en el piso 1 para una sección con alumnos con movilidad reducida), devuelve los datos para
 * su alerta. En cualquier otro caso, `null`.
 */
export function asignacionFueraDePiso1(
  resultado: ResultadoOrquestacion,
  asignacionId: string,
  seccion: SeccionInputMotor | undefined,
  espacios: EspacioConexo[],
): AsignacionFueraDePiso1 | null {
  if (resultado.estado !== EstadoAsignacion.VIGENTE || !resultado.fallbackPiso1Aplicado) {
    return null;
  }
  const espacio = espacios.find((e) => e.id === resultado.espacioIds[0]);
  if (!espacio || !seccion) return null;
  return {
    asignacionId,
    codigoCurso: seccion.codigoCurso ?? '',
    codigoSeccion: seccion.codigoSeccion,
    espacio: { id: espacio.id, identificador: espacio.identificador, piso: espacio.piso },
  };
}

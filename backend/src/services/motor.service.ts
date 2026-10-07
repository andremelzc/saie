import {
  EstadoAsignacion,
  PrismaClient,
  TipoEventoAuditoria,
} from '@prisma/client';
import { EspacioConexo } from '../rules/buscarBloqueContiguo';
import { construirGrafoContiguedad, obtenerEspaciosContiguos } from './contiguedad.service';
import { orquestarAsignacionSeccion } from '../rules/orquestadorAsignacion';
import { ejecutarCorridaBatch } from '../rules/corridaBatch';
import { consultarUbicacionesSeccionesParalelas } from '../rules/cercaniaParalelas';
import {
  AsignacionExistenteContexto,
  ResultadoCorridaBatch,
  ResultadoOrquestacion,
  SeccionInputMotor,
} from '../types/asignacion';

/**
 * Carga todos los espacios y construye la función de vecinos contiguos desde Prisma.
 */
export async function cargarContextoEspacios(prisma: PrismaClient): Promise<{
  todosLosEspacios: EspacioConexo[];
  obtenerVecinos: (espacioId: string) => string[];
}> {
  const [espaciosDb, contiguosDb] = await Promise.all([
    prisma.espacio.findMany(),
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
    softwareInstalado: e.softwareInstalado,
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
    },
  });

  if (!seccion) {
    return null;
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
    stackSoftwareRequerido: seccion.stackSoftwareRequerido,
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
          detalle:
            resultado.estado === EstadoAsignacion.VIGENTE
              ? `Asignación automática exitosa a espacios: [${resultado.espacioIds.join(', ')}] (Puntaje cercanía: ${resultado.puntajeCercania ?? 'N/A'})`
              : `Sección escalada a revisión manual: ${resultado.motivoEscalamiento}`,
        },
      });
    });
  }

  return resultado;
}

/**
 * Issue 2.11: Ejecuta la corrida batch para todas las secciones de un periodo en Prisma.
 */
export async function procesarCorridaBatchPeriodo(
  periodo: string,
  prisma: PrismaClient,
): Promise<ResultadoCorridaBatch> {
  const { todosLosEspacios, obtenerVecinos } = await cargarContextoEspacios(prisma);

  // Obtener todas las secciones del periodo con sus datos
  const seccionesDb = await prisma.seccion.findMany({
    where: { periodo },
    include: {
      curso: true,
      horarios: true,
      matriculas: true,
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
    stackSoftwareRequerido: s.stackSoftwareRequerido,
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

  // Ejecutar motor de corrida batch puro
  const resultadoBatch = ejecutarCorridaBatch({
    periodo,
    secciones: seccionesInput,
    todosLosEspacios,
    obtenerVecinosContiguos: obtenerVecinos,
    asignacionesPrevias,
  });

  // Persistir en transacción los resultados no conservados
  await prisma.$transaction(async (tx) => {
    for (const res of resultadoBatch.resultados) {
      if (res.conservadaPorIdempotencia) {
        continue;
      }

      // Marcar previas como HISTORICA
      await tx.asignacion.updateMany({
        where: {
          seccionId: res.seccionId,
          estado: { in: [EstadoAsignacion.VIGENTE, EstadoAsignacion.ESCALADA] },
        },
        data: { estado: EstadoAsignacion.HISTORICA },
      });

      // Crear nueva asignación de la corrida batch
      const nueva = await tx.asignacion.create({
        data: {
          seccionId: res.seccionId,
          estado: res.estado,
          motivoEscalamiento: res.motivoEscalamiento || null,
          corridaId: resultadoBatch.corridaId,
          huellaEntrada: res.huellaEntrada,
          espacios: {
            create: res.espacioIds.map((espId) => ({
              espacioId: espId,
            })),
          },
        },
      });

      // Auditoría
      await tx.registroAuditoria.create({
        data: {
          tipoEvento:
            res.estado === EstadoAsignacion.VIGENTE
              ? TipoEventoAuditoria.ASIGNACION
              : TipoEventoAuditoria.ESCALAMIENTO,
          asignacionId: nueva.id,
          detalle: `Corrida Batch [${resultadoBatch.corridaId}] - ${
            res.estado === EstadoAsignacion.VIGENTE
              ? `Asignada a: [${res.espacioIds.join(', ')}]`
              : `Escalada: ${res.motivoEscalamiento}`
          }`,
        },
      });
    }
  });

  return resultadoBatch;
}

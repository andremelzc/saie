import { EstadoAsignacion, PrismaClient } from '@prisma/client';
import { HttpError } from '../lib/http';
import { ResultadoVerificacion } from '../rules/verificadorCorrida';
import { ResultadoOrquestacion } from '../types/asignacion';
import {
  ResumenAsignacionDTO,
  ResultadoSeccionDTO,
  OrigenCorrida,
} from '../types/asignacionDemanda';
import { procesarAsignacionSeccionIndividual, procesarCorridaBatchPeriodo } from './motor.service';
import { obtenerPeriodoVigente } from './periodo.service';
import { verificarCorridaPeriodo } from './verificador.service';

// El motor corre en el mismo proceso, sin colas (Issue 2.15): un candado en memoria basta para
// que una corrida no se pise con otra. Cubre tanto la corrida completa como la de una sección.
let corridaEnCurso = false;

export function hayCorridaEnCurso(): boolean {
  return corridaEnCurso;
}

function mapearResultado(r: ResultadoOrquestacion): ResultadoSeccionDTO {
  return {
    seccionId: r.seccionId,
    codigoSeccion: r.codigoSeccion,
    estado: r.estado,
    espacioIds: r.espacioIds,
    motivoEscalamiento: r.motivoEscalamiento ?? null,
    conservada: Boolean(r.conservadaPorIdempotencia),
  };
}

function resumir(
  modo: ResumenAsignacionDTO['modo'],
  periodo: string | null,
  corridaId: string | null,
  resultados: ResultadoOrquestacion[],
  verificacion: ResultadoVerificacion | null,
): ResumenAsignacionDTO {
  const mapeados = resultados.map(mapearResultado);
  const vigentes = mapeados.filter((r) => r.estado === EstadoAsignacion.VIGENTE);

  return {
    modo,
    periodo,
    corridaId,
    totalSecciones: mapeados.length,
    asignadas: vigentes.filter((r) => !r.conservada).length,
    mantenidas: vigentes.filter((r) => r.conservada).length,
    escaladas: mapeados.filter((r) => r.estado === EstadoAsignacion.ESCALADA).length,
    verificacion,
    resultados: mapeados,
  };
}

/**
 * Issue 2.15: dispara el motor a demanda para Coordinación Académica.
 *
 * - Con `seccionId` ejecuta solo esa sección (Issue 2.10). Si estaba ESCALADA se reevalúa con
 *   los datos actuales: el motor solo conserva asignaciones VIGENTES sin cambios.
 * - Sin `seccionId` ejecuta la corrida completa del periodo vigente (Issue 2.11).
 * - Si ya hay una corrida en curso responde 409 y no lanza otra.
 * - Sección inexistente: 404.
 * - `origen` (Issue 2.18) marca en la auditoría si la corrida vino de Coordinación o de la
 *   tarea programada por tiempo.
 */
export async function ejecutarAsignacionADemanda(
  seccionId: string | undefined,
  prisma: PrismaClient,
  origen: OrigenCorrida = 'DEMANDA',
): Promise<ResumenAsignacionDTO> {
  if (corridaEnCurso) {
    throw new HttpError(
      409,
      'Ya hay una corrida de asignación en curso. Intenta de nuevo al terminar.',
    );
  }

  corridaEnCurso = true;
  try {
    if (seccionId) {
      const seccion = await prisma.seccion.findUnique({
        where: { id: seccionId },
        select: { id: true, periodo: true },
      });
      if (!seccion) {
        throw new HttpError(404, `La sección con ID '${seccionId}' no existe`);
      }

      const resultado = await procesarAsignacionSeccionIndividual(seccionId, prisma);
      // Issue 2.17: la verificación cubre el periodo completo para detectar dobles reservas
      // cruzadas con otras secciones, además de revisar la asignación recién recalculada.
      const verificacion = await verificarCorridaPeriodo(seccion.periodo, prisma);
      return resumir('seccion', seccion.periodo, null, [resultado], verificacion);
    }

    const periodo = await obtenerPeriodoVigente(prisma);
    if (!periodo) {
      // Periodo sin datos: no hay nada que asignar ni que verificar.
      return resumir('periodo', null, null, [], null);
    }

    const batch = await procesarCorridaBatchPeriodo(periodo, prisma, origen);
    const verificacion = await verificarCorridaPeriodo(periodo, prisma, batch.corridaId);
    return resumir('periodo', periodo, batch.corridaId, batch.resultados, verificacion);
  } finally {
    corridaEnCurso = false;
  }
}

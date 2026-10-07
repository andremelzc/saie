import { EstadoAsignacion, PrismaClient } from '@prisma/client';
import { HttpError } from '../lib/http';
import { ResultadoOrquestacion } from '../types/asignacion';
import { ResumenAsignacionDTO, ResultadoSeccionDTO } from '../types/asignacionDemanda';
import { procesarAsignacionSeccionIndividual, procesarCorridaBatchPeriodo } from './motor.service';
import { obtenerPeriodoVigente } from './periodo.service';

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
 */
export async function ejecutarAsignacionADemanda(
  seccionId: string | undefined,
  prisma: PrismaClient,
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
      return resumir('seccion', seccion.periodo, null, [resultado]);
    }

    const periodo = await obtenerPeriodoVigente(prisma);
    if (!periodo) {
      // Periodo sin datos: no hay nada que asignar.
      return resumir('periodo', null, null, []);
    }

    const batch = await procesarCorridaBatchPeriodo(periodo, prisma);
    return resumir('periodo', periodo, batch.corridaId, batch.resultados);
  } finally {
    corridaEnCurso = false;
  }
}

import { EstadoAlerta, PrismaClient } from '@prisma/client';
import { HttpError } from '../lib/http';
import { TokenPayload } from '../types/auth';
import { ejecutarAsignacionADemanda } from './asignacionDemanda.service';
import { resolverAlerta } from './alerta.service';
import { ResultadoSeccionDTO } from '../types/asignacionDemanda';

export interface SeccionReubicadaDTO extends ResultadoSeccionDTO {
  codigoCurso: string;
}

export interface ResultadoReubicacionDTO {
  alertaId: string;
  /** La alerta queda resuelta al terminar: cada sección afectada se reevaluó. */
  alertaResuelta: boolean;
  secciones: SeccionReubicadaDTO[];
}

/**
 * Issue 2.22 (riesgo R3 de la auditoría): «Reubicar secciones» desde una alerta.
 *
 * Reevalúa con el motor cada sección afectada por la alerta. Como el motor ya no conserva una
 * asignación cuyo espacio dejó de servir, cada sección termina en un espacio válido (otro, o el
 * mismo si en realidad sigue sirviendo) o queda ESCALADA con su motivo para que Coordinación
 * decida. En cualquiera de los casos la alerta ya no tiene nada pendiente y se marca resuelta.
 */
export async function reubicarSeccionesDeAlerta(
  alertaId: string,
  auth: TokenPayload,
  prisma: PrismaClient,
): Promise<ResultadoReubicacionDTO> {
  const alerta = await prisma.alerta.findUnique({
    where: { id: alertaId },
    include: {
      asignacionesAfectadas: {
        include: { asignacion: { include: { seccion: { include: { curso: true } } } } },
      },
    },
  });
  if (!alerta) {
    throw new HttpError(404, `La alerta con ID '${alertaId}' no existe`);
  }
  if (alerta.estado === EstadoAlerta.RESUELTA) {
    throw new HttpError(409, 'La alerta ya fue resuelta');
  }

  // Una sección puede figurar con varias asignaciones (históricas); se reevalúa una sola vez.
  const secciones = new Map<string, string>();
  for (const afectada of alerta.asignacionesAfectadas) {
    const { seccion } = afectada.asignacion;
    secciones.set(seccion.id, seccion.curso.codigo);
  }

  const resultados: SeccionReubicadaDTO[] = [];
  for (const [seccionId, codigoCurso] of secciones) {
    const resumen = await ejecutarAsignacionADemanda(seccionId, prisma);
    for (const r of resumen.resultados) resultados.push({ ...r, codigoCurso });
  }

  await resolverAlerta(alerta.id, auth, prisma);

  return { alertaId: alerta.id, alertaResuelta: true, secciones: resultados };
}

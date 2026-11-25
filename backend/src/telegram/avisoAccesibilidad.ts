import { EstadoSolicitud, PrismaClient } from '@prisma/client';
import { AccesibilidadResueltaEvento } from '../events/tipos';
import { logger } from '../lib/logger';
import { ClienteTelegram } from './cliente';
import { ColaEnvios, colaEnvios } from './cola';
import { enviarConReintentos } from './notificador';

export interface DependenciasAvisoAccesibilidad {
  prisma: Pick<PrismaClient, 'vinculacionTelegram'>;
  cliente: ClienteTelegram;
  cola?: ColaEnvios;
  esperar?: (ms: number) => Promise<void>;
}

/**
 * Texto del aviso al alumno (Issue 3.60). Habla de «aulas accesibles en el piso 1», nunca de la
 * condición del alumno (RNF-11), y no incluye el motivo de un rechazo: puede traer datos
 * personales y el alumno lo ve en su perfil.
 */
export function formatearAvisoAccesibilidad(evento: AccesibilidadResueltaEvento): string {
  if (evento.estado === EstadoSolicitud.APROBADA) {
    return [
      'Coordinación aprobó tu solicitud de aulas en el piso 1.',
      evento.resultado ? `Resultado: ${evento.resultado}.` : '',
      'Revisa tu horario en SAIE.',
    ]
      .filter(Boolean)
      .join('\n');
  }
  return [
    'Coordinación no aprobó tu solicitud de aulas en el piso 1.',
    'Revisa el motivo en tu perfil de SAIE.',
  ].join('\n');
}

/** Manejador de `accesibilidad.resuelta`: avisa al alumno si tiene Telegram vinculado. */
export async function avisarAccesibilidadAlAlumno(
  evento: AccesibilidadResueltaEvento,
  { prisma, cliente, cola = colaEnvios, esperar }: DependenciasAvisoAccesibilidad,
): Promise<boolean> {
  const vinculacion = await prisma.vinculacionTelegram.findFirst({
    where: { alumnoId: evento.alumnoId, activo: true },
    select: { id: true, chatId: true },
  });
  if (!vinculacion) return false;

  const resultado = await enviarConReintentos(
    cliente,
    vinculacion.chatId,
    formatearAvisoAccesibilidad(evento),
    cola,
    esperar,
  );
  if (resultado !== 'ENVIADO') {
    logger.warn(
      { vinculacionId: vinculacion.id, resultado },
      'No se pudo avisar al alumno la resolución de su accesibilidad',
    );
  }
  return resultado === 'ENVIADO';
}

import { DiaSemana, PrismaClient } from '@prisma/client';
import { SeccionFusionadaEvento } from '../events/tipos';
import { logger } from '../lib/logger';
import { ClienteTelegram } from './cliente';
import { ColaEnvios, colaEnvios } from './cola';
import { enviarConReintentos } from './notificador';

const NOMBRE_DIA: Record<DiaSemana, string> = {
  LUNES: 'Lunes',
  MARTES: 'Martes',
  MIERCOLES: 'Miércoles',
  JUEVES: 'Jueves',
  VIERNES: 'Viernes',
  SABADO: 'Sábado',
  DOMINGO: 'Domingo',
};

export interface DependenciasAvisoFusion {
  prisma: Pick<PrismaClient, 'vinculacionTelegram'>;
  cliente: ClienteTelegram;
  cola?: ColaEnvios;
  esperar?: (ms: number) => Promise<void>;
}

export interface ResumenAvisoFusion {
  destinatarios: number;
  enviados: number;
  fallidos: number;
}

/**
 * Texto del aviso (Issue 7.17): el curso y grupo, que ahora todo se dicta en laboratorio, el
 * horario y el laboratorio. Solo clases y aulas: nunca datos de salud (RNF-11).
 */
export function formatearAvisoFusion(evento: SeccionFusionadaEvento): string {
  const horario = evento.horarios
    .map((h) => `${NOMBRE_DIA[h.diaSemana]} ${h.horaInicio}-${h.horaFin}`)
    .join('; ');
  const lugar =
    evento.espacios.length > 0
      ? evento.espacios.map((e) => e.identificador).join(', ')
      : 'por confirmar';
  return [
    'Cambio en tu curso',
    '',
    `${evento.codigoCurso} - ${evento.nombreCurso} (Grupo ${evento.grupo})`,
    'Desde ahora todas las clases se dictan en laboratorio.',
    `Horario: ${horario || 'sin horario registrado'}`,
    `Laboratorio: ${lugar}`,
  ].join('\n');
}

/**
 * Manejador de `seccion.fusionada`: avisa a los alumnos matriculados en la teoría o en el
 * laboratorio que tienen Telegram vinculado. Un fallo de envío no afecta a los demás.
 */
export async function avisarFusionALosAlumnos(
  evento: SeccionFusionadaEvento,
  { prisma, cliente, cola = colaEnvios, esperar }: DependenciasAvisoFusion,
): Promise<ResumenAvisoFusion> {
  const vinculaciones = await prisma.vinculacionTelegram.findMany({
    where: {
      activo: true,
      alumno: {
        matriculas: {
          some: { seccionId: { in: [evento.seccionTeoriaId, evento.seccionLaboratorioId] } },
        },
      },
    },
    select: { id: true, chatId: true },
  });

  const texto = formatearAvisoFusion(evento);
  const resultados = [];
  for (const { id, chatId } of vinculaciones) {
    const resultado = await enviarConReintentos(cliente, chatId, texto, cola, esperar);
    if (resultado !== 'ENVIADO') {
      logger.warn(
        { vinculacionId: id, resultado },
        'No se pudo avisar por Telegram que el curso se dicta todo en laboratorio',
      );
    }
    resultados.push(resultado);
  }
  const enviados = resultados.filter((r) => r === 'ENVIADO').length;
  const resumen: ResumenAvisoFusion = {
    destinatarios: vinculaciones.length,
    enviados,
    fallidos: resultados.length - enviados,
  };
  return resumen;
}

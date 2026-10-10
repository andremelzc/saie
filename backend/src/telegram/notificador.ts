import { DiaSemana, PrismaClient } from '@prisma/client';
import { AsignacionCambiadaEvento } from '../events/tipos';
import { ClienteTelegram, ErrorTelegram } from './cliente';
import { ColaEnvios, colaEnvios } from './cola';

const NOMBRE_DIA: Record<DiaSemana, string> = {
  LUNES: 'Lunes',
  MARTES: 'Martes',
  MIERCOLES: 'Miércoles',
  JUEVES: 'Jueves',
  VIERNES: 'Viernes',
  SABADO: 'Sábado',
  DOMINGO: 'Domingo',
};

const MAX_INTENTOS = 3;

export interface DependenciasNotificador {
  prisma: Pick<PrismaClient, 'vinculacionTelegram'>;
  cliente: ClienteTelegram;
  cola?: ColaEnvios;
  /** Espera entre reintentos; se puede sustituir para no esperar de verdad. */
  esperar?: (ms: number) => Promise<void>;
}

export interface ResumenEnvio {
  destinatarios: number;
  enviados: number;
  /** Vinculaciones desactivadas porque el alumno bloqueó el bot (403). */
  desactivados: number;
  fallidos: number;
}

/**
 * Texto del aviso. Solo curso, sección, aulas y horario: nunca datos de salud ni la condición
 * de movilidad reducida (RNF-11), aunque la corrida haya usado esa regla para elegir el aula.
 */
export function formatearAvisoCambioAula(evento: AsignacionCambiadaEvento): string {
  const aulas = (lista: { identificador: string }[]) =>
    lista.map((e) => e.identificador).join(', ') || 'sin aula';
  const horario = evento.horarios
    .map((h) => `${NOMBRE_DIA[h.diaSemana]} ${h.horaInicio}-${h.horaFin}`)
    .join('; ');

  return [
    'Cambio de aula',
    '',
    `Curso: ${evento.codigoCurso} - ${evento.nombreCurso}`,
    `Sección: ${evento.codigoSeccion}`,
    `Antes: ${aulas(evento.espaciosAnteriores)}`,
    `Ahora: ${aulas(evento.espaciosNuevos)}`,
    `Horario: ${horario || 'sin horario registrado'}`,
  ].join('\n');
}

/** Errores que merecen reintento: de red (código 0), límite de Telegram (429) y de servidor. */
function esTransitorio(error: unknown): boolean {
  return (
    error instanceof ErrorTelegram &&
    (error.codigo === 0 || error.codigo === 429 || error.codigo >= 500)
  );
}

type ResultadoEnvio = 'ENVIADO' | 'BLOQUEADO' | 'FALLIDO';

/** Envía un mensaje con reintentos acotados. Un 403 no se reintenta: el alumno bloqueó el bot. */
export async function enviarConReintentos(
  cliente: ClienteTelegram,
  chatId: string,
  texto: string,
  cola: ColaEnvios = colaEnvios,
  esperar: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<ResultadoEnvio> {
  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    try {
      await cola.encolar(() => cliente.enviarMensaje(chatId, texto));
      return 'ENVIADO';
    } catch (error: unknown) {
      if (error instanceof ErrorTelegram && error.bloqueadoPorUsuario) return 'BLOQUEADO';
      if (!esTransitorio(error) || intento === MAX_INTENTOS) return 'FALLIDO';
      await esperar(1000 * intento);
    }
  }
  return 'FALLIDO';
}

/**
 * Issue 3.26: manejador de `asignacion.cambiada`. Avisa a los alumnos matriculados en la
 * sección que tienen una vinculación activa; los demás no reciben nada.
 *
 * Los fallos de envío no se propagan: un alumno que no recibe el aviso no afecta a los demás ni
 * a la corrida de asignación. Si Telegram responde 403, la vinculación se desactiva y se registra
 * (solo su id interno, nunca el chat ni datos del alumno).
 */
export async function avisarCambioDeAsignacion(
  evento: AsignacionCambiadaEvento,
  { prisma, cliente, cola = colaEnvios, esperar }: DependenciasNotificador,
): Promise<ResumenEnvio> {
  const vinculaciones = await prisma.vinculacionTelegram.findMany({
    where: { activo: true, alumno: { matriculas: { some: { seccionId: evento.seccionId } } } },
    select: { id: true, chatId: true },
  });

  const texto = formatearAvisoCambioAula(evento);
  const resumen: ResumenEnvio = {
    destinatarios: vinculaciones.length,
    enviados: 0,
    desactivados: 0,
    fallidos: 0,
  };

  for (const vinculacion of vinculaciones) {
    const resultado = await enviarConReintentos(cliente, vinculacion.chatId, texto, cola, esperar);

    if (resultado === 'ENVIADO') {
      resumen.enviados++;
    } else if (resultado === 'BLOQUEADO') {
      await prisma.vinculacionTelegram.updateMany({
        where: { id: vinculacion.id },
        data: { activo: false, fechaBaja: new Date() },
      });
      resumen.desactivados++;
      console.warn(
        `[telegram] Vinculación ${vinculacion.id} desactivada: el alumno bloqueó el bot`,
      );
    } else {
      resumen.fallidos++;
      console.error(`[telegram] No se pudo avisar a la vinculación ${vinculacion.id}`);
    }
  }

  return resumen;
}

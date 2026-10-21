import { PrismaClient } from '@prisma/client';
import { ClienteTelegram } from './cliente';
import { LimitadorIntentos } from './limitador';
import { desvincularChat, vincularChat } from './vinculacion.service';
import {
  consultarClaseActual,
  consultarClasesHoy,
  consultarHorarioSemanal,
} from './consultasBot.service';

/** Lo mínimo que SAIE lee de una actualización de Telegram. */
export interface ActualizacionTelegram {
  update_id: number;
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number; type: string };
  };
}

export interface DependenciasBot {
  prisma: PrismaClient;
  cliente: ClienteTelegram;
  limitador: LimitadorIntentos;
}

export const MENSAJES = {
  bienvenida:
    'Hola, soy el bot de avisos de SAIE.\n\n' +
    'Para vincular tu cuenta, envíame en un solo mensaje tu código de alumno y tu clave de SAIE, separados por un espacio. Por ejemplo:\n\n' +
    '22200101 miClave\n\n' +
    'Una vez vinculado, podrás consultar:\n' +
    '• /hoy — Tus clases de hoy\n' +
    '• /ahora — Tu clase actual o la siguiente\n' +
    '• /horario — Tu horario semanal completo\n' +
    '• /baja — Dejar de recibir avisos\n\n' +
    'Borraré el mensaje con tu clave apenas lo reciba.',
  vinculado: (nombre: string) =>
    `Listo, ${nombre}. Tu Telegram quedó vinculado con éxito.\n\n` +
    'Puedes consultar:\n' +
    '• /hoy — Tus clases de hoy\n' +
    '• /ahora — Tu clase en este momento\n' +
    '• /horario — Tu horario semanal\n' +
    '• /baja — Desvincular tu cuenta',
  // Mismo texto para cualquier fallo: no revela si el código existe ni cuál dato falló.
  credencialesInvalidas:
    'No pudimos verificar tus datos. Revisa tu código y tu clave e inténtalo de nuevo.',
  bloqueado: (segundos: number) =>
    `Demasiados intentos. Vuelve a intentarlo en ${Math.ceil(segundos / 60)} minuto(s).`,
  chatEnUso:
    'Este Telegram ya está vinculado a una cuenta. Envía /baja para desvincularla y luego ' +
    'vuelve a enviar tu código y tu clave.',
  baja: 'Listo, ya no recibirás avisos. Puedes volver a vincularte cuando quieras.',
  sinVinculacion: 'No tenías una vinculación activa en este chat.',
  noEntendido:
    'No entendí ese mensaje.\n\n' +
    'Comandos disponibles:\n' +
    '• /hoy — Clases de hoy\n' +
    '• /ahora — Clase en curso o siguiente\n' +
    '• /horario — Horario de la semana\n' +
    '• /baja — Desvincularte\n\n' +
    'Si aún no te has vinculado, envía tu código y tu clave separados por un espacio.',
};

/** `/baja@mi_bot argumentos` -> `/baja` */
function comandoDe(texto: string): string | null {
  if (!texto.startsWith('/')) return null;
  return texto.split(/\s/)[0].split('@')[0].toLowerCase();
}

/** Un mensaje de credenciales son exactamente dos palabras: código y clave. */
function credencialesDe(texto: string): { codigo: string; clave: string } | null {
  const partes = texto.trim().split(/\s+/);
  return partes.length === 2 && !texto.startsWith('/')
    ? { codigo: partes[0], clave: partes[1] }
    : null;
}

/** Un fallo al borrar o responder no debe tumbar el procesamiento: se ignora. */
async function ignorandoErrores(tarea: Promise<void>): Promise<void> {
  try {
    await tarea;
  } catch {
    /* sin acción: ver comentario de la función */
  }
}

/**
 * Issue 3.25: procesa una actualización del webhook de Telegram. Atiende `/start`, `/ayuda`,
 * `/baja`, `/hoy`, `/ahora`, `/horario` y el mensaje de credenciales ("código clave"). Solo conversaciones privadas.
 *
 * - El mensaje con la clave se borra del chat apenas se recibe, haya o no éxito.
 * - Credenciales inválidas: respuesta genérica y se cuenta el fallo; tras varios, el chat se
 *   bloquea un tiempo (el bloqueo se informa sin verificar nada más).
 */
export async function procesarActualizacion(
  actualizacion: ActualizacionTelegram,
  { prisma, cliente, limitador }: DependenciasBot,
): Promise<void> {
  const mensaje = actualizacion.message;
  if (!mensaje?.text || mensaje.chat.type !== 'private') return;

  const chatId = String(mensaje.chat.id);
  const responder = (texto: string) => ignorandoErrores(cliente.enviarMensaje(chatId, texto));

  const comando = comandoDe(mensaje.text);
  if (comando === '/start' || comando === '/ayuda' || comando === '/help') {
    await responder(MENSAJES.bienvenida);
    return;
  }
  if (comando === '/baja' || comando === '/stop') {
    const habia = await desvincularChat(chatId, prisma);
    await responder(habia ? MENSAJES.baja : MENSAJES.sinVinculacion);
    return;
  }
  if (comando === '/hoy') {
    const respuesta = await consultarClasesHoy(chatId, prisma);
    await responder(respuesta);
    return;
  }
  if (comando === '/ahora') {
    const respuesta = await consultarClaseActual(chatId, prisma);
    await responder(respuesta);
    return;
  }
  if (comando === '/horario') {
    const respuesta = await consultarHorarioSemanal(chatId, prisma);
    await responder(respuesta);
    return;
  }

  const credenciales = credencialesDe(mensaje.text);
  if (!credenciales) {
    await responder(MENSAJES.noEntendido);
    return;
  }

  // La clave no debe quedar en el chat: se borra antes de cualquier otra cosa.
  await ignorandoErrores(cliente.borrarMensaje(chatId, mensaje.message_id));

  const espera = limitador.segundosDeBloqueo(chatId);
  if (espera !== null) {
    await responder(MENSAJES.bloqueado(espera));
    return;
  }

  const vinculacion = await vincularChat(chatId, credenciales.codigo, credenciales.clave, prisma);

  if (vinculacion.resultado === 'VINCULADO') {
    limitador.limpiar(chatId);
    await responder(MENSAJES.vinculado(vinculacion.nombre));
  } else if (vinculacion.resultado === 'CHAT_EN_USO') {
    await responder(MENSAJES.chatEnUso);
  } else {
    limitador.registrarFallo(chatId);
    await responder(MENSAJES.credencialesInvalidas);
  }
}

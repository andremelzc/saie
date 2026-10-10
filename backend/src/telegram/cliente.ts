const API_TELEGRAM = 'https://api.telegram.org';
const TIEMPO_MAXIMO_MS = 10_000;

/** Error devuelto por la API de Telegram. 403 significa que el usuario bloqueó el bot. */
export class ErrorTelegram extends Error {
  constructor(
    public readonly codigo: number,
    descripcion: string,
  ) {
    super(descripcion);
    this.name = 'ErrorTelegram';
  }

  get bloqueadoPorUsuario(): boolean {
    return this.codigo === 403;
  }
}

/** Lo mínimo que SAIE necesita de Telegram; permite sustituirlo por un doble en las pruebas. */
export interface ClienteTelegram {
  enviarMensaje(chatId: string, texto: string): Promise<void>;
  borrarMensaje(chatId: string, mensajeId: number): Promise<void>;
}

interface RespuestaTelegram {
  ok: boolean;
  description?: string;
  error_code?: number;
}

/**
 * Cliente de la Bot API de Telegram sobre `fetch` (sin dependencias). El token nunca se escribe
 * en registros ni en mensajes de error: forma parte de la URL y quedaría expuesto.
 */
export function crearClienteTelegram(token = process.env.TELEGRAM_BOT_TOKEN): ClienteTelegram {
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN no está configurado');
  }

  async function llamar(metodo: string, cuerpo: Record<string, unknown>): Promise<void> {
    let respuesta: Response;
    try {
      respuesta = await fetch(`${API_TELEGRAM}/bot${token}/${metodo}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
      });
    } catch (error: unknown) {
      // El mensaje de un error de red puede contener la URL (y con ella el token).
      const tipo = error instanceof Error ? error.name : 'desconocido';
      throw new ErrorTelegram(0, `No se pudo contactar con Telegram (${tipo})`);
    }

    const datos = (await respuesta.json().catch(() => ({ ok: false }))) as RespuestaTelegram;
    if (!datos.ok) {
      throw new ErrorTelegram(
        datos.error_code ?? respuesta.status,
        datos.description ?? 'Error desconocido de Telegram',
      );
    }
  }

  return {
    enviarMensaje: (chatId, texto) => llamar('sendMessage', { chat_id: chatId, text: texto }),
    borrarMensaje: (chatId, mensajeId) =>
      llamar('deleteMessage', { chat_id: chatId, message_id: mensajeId }),
  };
}

import { timingSafeEqual } from 'crypto';
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ActualizacionTelegram, procesarActualizacion } from '../telegram/bot.service';
import { ClienteTelegram, crearClienteTelegram } from '../telegram/cliente';
import { limitadorIntentos } from '../telegram/limitador';

/** Comparación en tiempo constante; si la longitud difiere ya no son iguales. */
function igualesEnTiempoConstante(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

let cliente: ClienteTelegram | null = null;

/**
 * Issue 3.25 — POST /api/v1/telegram/webhook
 *
 * Telegram envía aquí cada actualización con el encabezado `X-Telegram-Bot-Api-Secret-Token`
 * (el secreto se fija al registrar el webhook). Sin el secreto correcto se responde 401; si el
 * secreto no está configurado, se rechaza todo (falla cerrado).
 *
 * Tras validar el secreto siempre se responde 200: Telegram reintenta las entregas que no
 * reciben 2xx y un error nuestro provocaría una avalancha de reintentos.
 */
export async function recibirActualizacion(req: Request, res: Response): Promise<void> {
  const secreto = process.env.TELEGRAM_WEBHOOK_SECRET;
  const recibido = req.header('x-telegram-bot-api-secret-token') ?? '';

  if (!secreto || !igualesEnTiempoConstante(recibido, secreto)) {
    res.status(401).json({ success: false, message: 'No autorizado' });
    return;
  }

  try {
    cliente ??= crearClienteTelegram();
    await procesarActualizacion(req.body as ActualizacionTelegram, {
      prisma,
      cliente,
      limitador: limitadorIntentos,
    });
  } catch (error: unknown) {
    // Solo el tipo: el mensaje podría incluir datos del alumno o el token.
    console.error(
      'Error procesando actualización de Telegram:',
      error instanceof Error ? error.name : 'desconocido',
    );
  }

  res.status(200).json({ success: true });
}

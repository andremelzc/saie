import { Request, Response } from 'express';
import { responderError } from '../lib/http';
import { igualesEnTiempoConstante } from '../lib/comparacion';
import { prisma } from '../lib/prisma';
import { ActualizacionTelegram, procesarActualizacion } from '../telegram/bot.service';
import { ClienteTelegram, crearClienteTelegram } from '../telegram/cliente';
import { limitadorIntentos } from '../telegram/limitador';
import { enviarResumenesDiarios } from '../telegram/resumenDiario.service';

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

/**
 * Issue 3.27 — POST /api/v1/telegram/resumen-diario
 *
 * Lo invoca la tarea programada de GitHub Actions cada mañana, autenticada con el token de
 * servicio (no con un JWT de usuario). Responde con el resumen de lo enviado.
 */
export async function enviarResumenDiario(_req: Request, res: Response): Promise<void> {
  try {
    cliente ??= crearClienteTelegram();
    const data = await enviarResumenesDiarios({ prisma, cliente });
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

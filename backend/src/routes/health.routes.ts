import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

export const healthRouter = Router();

const TIEMPO_POR_DEFECTO_MS = 3000;

function tiempoMaximoMs(): number {
  const n = Number(process.env.HEALTH_DB_TIMEOUT_MS);
  return Number.isInteger(n) && n > 0 ? n : TIEMPO_POR_DEFECTO_MS;
}

/** `SELECT 1` con tiempo máximo: una base que no responde cuenta como caída. */
async function verificarBase(): Promise<void> {
  let temporizador: NodeJS.Timeout | undefined;
  const limite = new Promise<never>((_resolve, reject) => {
    temporizador = setTimeout(() => reject(new Error('timeout')), tiempoMaximoMs());
  });
  try {
    await Promise.race([prisma.$queryRaw`SELECT 1`, limite]);
  } finally {
    clearTimeout(temporizador);
  }
}

/**
 * GET /api/health (Issue 1.15): 200 si el servicio y la base responden; 503 si la base falla
 * o no contesta a tiempo. No expone el motivo técnico, solo se registra en el log.
 */
healthRouter.get('/health', async (_req: Request, res: Response) => {
  const base = {
    timestamp: new Date().toISOString(),
    service: 'saie-backend',
    environment: process.env.NODE_ENV || 'development',
  };
  try {
    await verificarBase();
    res.status(200).json({ status: 'ok', database: 'ok', ...base });
  } catch (error: unknown) {
    logger.error(
      {
        requestId: res.locals.requestId,
        tipo: error instanceof Error ? error.name : 'desconocido',
      },
      'La verificación de la base de datos falló',
    );
    res.status(503).json({ status: 'error', database: 'unavailable', ...base });
  }
});

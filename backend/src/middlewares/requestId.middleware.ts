import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';
import { logger } from '../lib/logger';

export const CABECERA_REQUEST_ID = 'X-Request-Id';

/** Solo se reutiliza un id entrante con forma segura (evita inyectar saltos de línea o ruido). */
const ID_VALIDO = /^[A-Za-z0-9._-]{8,64}$/;

export function idDePeticion(entrante: unknown): string {
  return typeof entrante === 'string' && ID_VALIDO.test(entrante) ? entrante : randomUUID();
}

/**
 * Issue 1.15 — Asigna un `X-Request-Id` a cada petición (reutiliza el que envía el cliente si es
 * válido), lo devuelve en la respuesta, lo deja en `res.locals.requestId` para los errores 500 y
 * registra una línea por petición al terminar (método, ruta sin query, estado y duración).
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = idDePeticion(req.get(CABECERA_REQUEST_ID));
  res.locals.requestId = id;
  res.setHeader(CABECERA_REQUEST_ID, id);

  const inicio = process.hrtime.bigint();
  res.on('finish', () => {
    const duracionMs = Number((process.hrtime.bigint() - inicio) / 1_000_000n);
    const estado = res.statusCode;
    const nivel = estado >= 500 ? 'error' : estado >= 400 ? 'warn' : 'info';
    logger[nivel]({
      requestId: id,
      metodo: req.method,
      ruta: req.baseUrl + req.path,
      estado,
      duracionMs,
    });
  });

  next();
}

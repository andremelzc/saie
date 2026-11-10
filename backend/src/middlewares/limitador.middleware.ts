import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

/**
 * Issue 1.12 — Límite de intentos. Se configura por variables de entorno y se desactiva en pruebas:
 *
 * | Variable                          | Por defecto | Efecto                                          |
 * | --------------------------------- | ----------- | ----------------------------------------------- |
 * | `RATE_LIMIT_DISABLED`             | `false`     | `true` apaga todos los límites (k6, desarrollo) |
 * | `RATE_LIMIT_LOGIN_VENTANA_MS`     | `600000`    | Ventana de los logins (10 min)                  |
 * | `RATE_LIMIT_LOGIN_MAX_USUARIO`    | `5`         | Intentos fallidos por usuario en la ventana     |
 * | `RATE_LIMIT_LOGIN_MAX_IP`         | `20`        | Intentos fallidos por IP en la ventana          |
 * | `RATE_LIMIT_CONSULTA_VENTANA_MS`  | `60000`     | Ventana de la consulta pública (1 min)          |
 * | `RATE_LIMIT_CONSULTA_MAX`         | `120`       | Peticiones por IP en la ventana                 |
 *
 * Con `NODE_ENV=test` los límites están apagados salvo que `RATE_LIMIT_DISABLED=false` lo pida
 * de forma explícita (así las pruebas del propio límite pueden activarlo).
 */

export const MENSAJE_DEMASIADOS_INTENTOS =
  'Demasiados intentos. Espera un momento e inténtalo de nuevo.';

/** Entero positivo de una variable de entorno; el valor por defecto si falta o no es válido. */
export function enteroDeEntorno(nombre: string, porDefecto: number): number {
  const n = Number(process.env[nombre]);
  return Number.isInteger(n) && n > 0 ? n : porDefecto;
}

export function limitesDesactivados(): boolean {
  const valor = process.env.RATE_LIMIT_DISABLED?.trim().toLowerCase();
  if (valor === 'true') return true;
  if (valor === 'false') return false;
  return process.env.NODE_ENV === 'test';
}

const pasar: RequestHandler = (_req: Request, _res: Response, next: NextFunction) => next();

/** 429 con la forma uniforme `{ success:false, message }` y la cabecera `Retry-After` (segundos). */
function responderLimiteExcedido(req: Request, res: Response): void {
  const info = (req as Request & { rateLimit?: { resetTime?: Date } }).rateLimit;
  const restanteMs = info?.resetTime ? info.resetTime.getTime() - Date.now() : 1000;
  res.setHeader('Retry-After', String(Math.max(1, Math.ceil(restanteMs / 1000))));
  res.status(429).json({ success: false, message: MENSAJE_DEMASIADOS_INTENTOS });
}

function clavePorIp(req: Request): string {
  return ipKeyGenerator(req.ip ?? '0.0.0.0');
}

/** Usuario o código del cuerpo del login; si no viene, se limita por IP. */
function clavePorUsuario(req: Request): string {
  const cuerpo = (req.body ?? {}) as { usuario?: unknown; codigo?: unknown };
  const dato = typeof cuerpo.usuario === 'string' ? cuerpo.usuario : cuerpo.codigo;
  const usuario = typeof dato === 'string' ? dato.trim().toLowerCase() : '';
  return usuario ? `u:${usuario}` : `ip:${clavePorIp(req)}`;
}

/**
 * Límite de los tres logins: por IP y por usuario. Solo cuentan los intentos fallidos
 * (`skipSuccessfulRequests`), de modo que iniciar sesión bien no consume el cupo.
 */
export function crearLimitadoresLogin(): RequestHandler[] {
  if (limitesDesactivados()) return [pasar];
  const comunes = {
    windowMs: enteroDeEntorno('RATE_LIMIT_LOGIN_VENTANA_MS', 10 * 60 * 1000),
    standardHeaders: false,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: responderLimiteExcedido,
  } as const;
  return [
    rateLimit({
      ...comunes,
      limit: enteroDeEntorno('RATE_LIMIT_LOGIN_MAX_IP', 20),
      keyGenerator: clavePorIp,
    }),
    rateLimit({
      ...comunes,
      limit: enteroDeEntorno('RATE_LIMIT_LOGIN_MAX_USUARIO', 5),
      keyGenerator: clavePorUsuario,
    }),
  ];
}

/** Límite por IP de la consulta pública: holgado, no afecta el uso normal. */
export function crearLimitadorConsulta(): RequestHandler {
  if (limitesDesactivados()) return pasar;
  return rateLimit({
    windowMs: enteroDeEntorno('RATE_LIMIT_CONSULTA_VENTANA_MS', 60 * 1000),
    limit: enteroDeEntorno('RATE_LIMIT_CONSULTA_MAX', 120),
    standardHeaders: false,
    legacyHeaders: false,
    keyGenerator: clavePorIp,
    handler: responderLimiteExcedido,
  });
}

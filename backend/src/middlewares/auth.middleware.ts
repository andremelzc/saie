import { NextFunction, Request, Response } from 'express';
import { RolCuenta } from '@prisma/client';
import { verificarToken } from '../services/auth.service';
import '../types/auth';

/** Código que el frontend reconoce para llevar a la pantalla de cambio de clave (Issue 4.45). */
export const CODIGO_CLAVE_DEBE_CAMBIARSE = 'CLAVE_DEBE_CAMBIARSE';

/**
 * Exige un JWT Bearer válido y deja el payload en `req.auth`.
 *
 * Mientras la cuenta deba cambiar su clave inicial (`debeCambiarClave` en el token), responde 403
 * con `code: CLAVE_DEBE_CAMBIARSE`. Solo `POST /auth/cambiar-clave` usa `authGuardCambioClave`,
 * que no aplica esa restricción (Issue 4.45).
 */
export function authGuard(req: Request, res: Response, next: NextFunction): void {
  autenticar(req, res, next, false);
}

/** Igual que `authGuard`, pero deja pasar a la cuenta que aún debe cambiar su clave. */
export function authGuardCambioClave(req: Request, res: Response, next: NextFunction): void {
  autenticar(req, res, next, true);
}

function autenticar(
  req: Request,
  res: Response,
  next: NextFunction,
  permitirCambioClavePendiente: boolean,
): void {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : null;
  const payload = token ? verificarToken(token) : null;

  if (!payload) {
    res.status(401).json({ success: false, message: 'Token ausente, inválido o expirado' });
    return;
  }

  if (payload.debeCambiarClave && !permitirCambioClavePendiente) {
    res.status(403).json({
      success: false,
      code: CODIGO_CLAVE_DEBE_CAMBIARSE,
      message: 'Debes cambiar tu clave inicial antes de continuar',
    });
    return;
  }

  req.auth = payload;
  next();
}

/** Control simple por rol (sin permisos granulares). Debe ir después de `authGuard`. */
export function roleGuard(...rolesPermitidos: RolCuenta[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ success: false, message: 'Token ausente, inválido o expirado' });
      return;
    }

    if (!rolesPermitidos.includes(req.auth.rol)) {
      res
        .status(403)
        .json({ success: false, message: 'No tienes permisos para realizar esta acción' });
      return;
    }

    next();
  };
}

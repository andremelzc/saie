import { NextFunction, Request, Response } from 'express';
import { RolCuenta } from '@prisma/client';
import { verificarToken } from '../services/auth.service';
import '../types/auth';

/** Exige un JWT Bearer válido y deja el payload en `req.auth`. */
export function authGuard(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : null;
  const payload = token ? verificarToken(token) : null;

  if (!payload) {
    res.status(401).json({ success: false, message: 'Token ausente, inválido o expirado' });
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

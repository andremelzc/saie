import { NextFunction, Request, Response } from 'express';
import { igualesEnTiempoConstante } from '../lib/comparacion';

/**
 * Autentica llamadas de servicio a servicio (p. ej. la tarea programada de GitHub Actions) con
 * un token propio, distinto del JWT de los usuarios: `Authorization: Bearer <token>`.
 *
 * - Sin token: 401. Token incorrecto: 403. Variable sin configurar: 503 (falla cerrado, nunca
 *   deja pasar por no haber secreto).
 * - La comparación es en tiempo constante.
 */
export function tokenServicioGuard(nombreVariable: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const esperado = process.env[nombreVariable];
    if (!esperado) {
      res.status(503).json({ success: false, message: 'El servicio no está configurado' });
      return;
    }

    const cabecera = req.headers.authorization;
    const token = cabecera?.startsWith('Bearer ') ? cabecera.slice('Bearer '.length).trim() : '';
    if (!token) {
      res.status(401).json({ success: false, message: 'Token de servicio ausente' });
      return;
    }

    if (!igualesEnTiempoConstante(token, esperado)) {
      res.status(403).json({ success: false, message: 'Token de servicio incorrecto' });
      return;
    }

    next();
  };
}

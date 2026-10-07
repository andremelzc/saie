import { Response } from 'express';
import { ZodError } from 'zod';

/**
 * Error de dominio con código HTTP asociado. Los servicios lo lanzan y los controladores
 * lo traducen a una respuesta JSON uniforme `{ success: false, message }`.
 */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors?: string[],
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function responderError(res: Response, error: unknown): void {
  if (error instanceof HttpError) {
    res.status(error.status).json({
      success: false,
      message: error.message,
      ...(error.errors ? { errors: error.errors } : {}),
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Parámetros inválidos',
      errors: error.issues.map((i) => i.message),
    });
    return;
  }

  // Nunca se devuelve el detalle del error interno: puede contener datos sensibles (RNF-09).
  console.error('Error no controlado:', error instanceof Error ? error.name : 'desconocido');
  res.status(500).json({ success: false, message: 'Error interno del servidor' });
}

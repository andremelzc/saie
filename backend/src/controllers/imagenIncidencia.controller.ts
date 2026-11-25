import express, { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { responderError } from '../lib/http';
import { MAX_BYTES_IMAGEN, TIPOS_IMAGEN_EVIDENCIA } from '../lib/imagenEvidencia';
import { prisma } from '../lib/prisma';
import {
  guardarImagenIncidencia,
  ImagenDTO,
  obtenerImagenParaAdmin,
  obtenerImagenParaDocente,
} from '../services/imagenIncidencia.service';

const ParamSchema = z.object({ id: z.string().min(1, 'El id de la incidencia es requerido') });

const parserImagen = express.raw({
  type: [...TIPOS_IMAGEN_EVIDENCIA],
  // Un poco más que el máximo: el servicio da el mensaje claro; lo que exceda esto es abuso.
  limit: MAX_BYTES_IMAGEN + 64 * 1024,
});

/**
 * Issue 7.19: lee el cuerpo como bytes solo si es JPEG, PNG o WebP. Un cuerpo demasiado grande
 * responde 413 con el mensaje de siempre, no el error genérico del servidor.
 */
export function leerCuerpoImagen(req: Request, res: Response, next: NextFunction): void {
  if (!req.is(TIPOS_IMAGEN_EVIDENCIA as unknown as string[])) {
    res.status(415).json({ success: false, message: 'Solo se aceptan imágenes JPEG, PNG o WebP' });
    return;
  }
  parserImagen(req, res, (error?: unknown) => {
    if (error) {
      res.status(413).json({ success: false, message: 'La imagen no puede superar 2 MB' });
      return;
    }
    next();
  });
}

function enviarImagen(res: Response, imagen: ImagenDTO): void {
  res
    .status(200)
    .set({
      'Content-Type': imagen.tipoMime,
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    })
    .send(imagen.datos);
}

/** Issue 7.19 — POST /api/v1/docente/incidencias/:id/imagen (cuerpo: la imagen). */
export async function subirImagenIncidencia(req: Request, res: Response): Promise<void> {
  try {
    const { id } = ParamSchema.parse(req.params);
    const cuerpo = Buffer.isBuffer(req.body) ? req.body : undefined;
    const data = await guardarImagenIncidencia(req.auth!.sub, id, cuerpo, prisma);
    res.status(201).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 7.19 — GET /api/v1/docente/incidencias/:id/imagen */
export async function verImagenIncidenciaDocente(req: Request, res: Response): Promise<void> {
  try {
    const { id } = ParamSchema.parse(req.params);
    enviarImagen(res, await obtenerImagenParaDocente(req.auth!.sub, id, prisma));
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 7.19 — GET /api/v1/admin/incidencias/:id/imagen */
export async function verImagenIncidenciaAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { id } = ParamSchema.parse(req.params);
    enviarImagen(res, await obtenerImagenParaAdmin(req.auth!, id, prisma));
  } catch (error: unknown) {
    responderError(res, error);
  }
}

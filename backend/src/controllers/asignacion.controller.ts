import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { responderError } from '../lib/http';
import { ejecutarAsignacionADemanda } from '../services/asignacionDemanda.service';

const SeccionParamSchema = z.object({
  id: z.string().min(1, 'El id de la sección es requerido'),
});

/** Issue 2.15 — POST /api/v1/asignaciones/batch: corrida completa del periodo vigente. */
export async function ejecutarBatch(_req: Request, res: Response): Promise<void> {
  try {
    const data = await ejecutarAsignacionADemanda(undefined, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 2.15 — POST /api/v1/asignaciones/seccion/:id: una sola sección (alta tardía o reintento). */
export async function ejecutarSeccion(req: Request, res: Response): Promise<void> {
  try {
    const { id } = SeccionParamSchema.parse(req.params);
    const data = await ejecutarAsignacionADemanda(id, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

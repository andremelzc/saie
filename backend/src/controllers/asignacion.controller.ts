import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { responderError } from '../lib/http';
import { vencerCondicionesAccesibles } from '../services/accesibilidadDocente.service';
import { ejecutarAsignacionADemanda } from '../services/asignacionDemanda.service';
import {
  reorganizarConPrioridad,
  vistaPreviaReorganizacion,
} from '../services/reorganizacion.service';

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

/** Issue 2.26 — GET /api/v1/asignaciones/reorganizacion: ventana y cuántas secciones cambiarían. */
export async function consultarReorganizacion(_req: Request, res: Response): Promise<void> {
  try {
    const data = await vistaPreviaReorganizacion(prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 2.26 — POST /api/v1/asignaciones/reorganizacion: escaladas primero (409 fuera de la ventana). */
export async function ejecutarReorganizacion(_req: Request, res: Response): Promise<void> {
  try {
    const data = await reorganizarConPrioridad(prisma);
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

/**
 * Issue 2.18 — POST /api/v1/asignaciones/programada: corrida desatendida del periodo vigente.
 *
 * La autentica el token de servicio en la ruta (no un JWT de usuario). Registra el origen
 * "TIEMPO" en la auditoría para distinguirla de la corrida pedida por Coordinación.
 */
export async function ejecutarProgramada(_req: Request, res: Response): Promise<void> {
  try {
    // Issue 3.61 (R16): antes de la corrida se quitan las condiciones de accesibilidad vencidas;
    // la corrida reasigna así las secciones que dejaron de necesitar el piso 1.
    await vencerCondicionesAccesibles(prisma);
    const data = await ejecutarAsignacionADemanda(undefined, prisma, 'TIEMPO');
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

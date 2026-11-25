import { Request, Response } from 'express';
import { z } from 'zod';
import { responderError } from '../lib/http';
import { prisma } from '../lib/prisma';
import {
  listarAccesibilidad,
  resolverSolicitudAccesibilidad,
  ResolverAccesibilidadSchema,
} from '../services/accesibilidad.service';
import {
  DeclararAccesibilidadDocenteSchema,
  declararAccesibilidadDocente,
  obtenerAccesibilidadDocente,
} from '../services/accesibilidadDocente.service';

const ParamSchema = z.object({
  id: z.string().min(1, 'El id de la solicitud es requerido'),
});

/** Issue 3.60 — GET /api/v1/admin/accesibilidad: pendientes y aprobadas con sus secciones. */
export async function listarAccesibilidadAdmin(_req: Request, res: Response): Promise<void> {
  try {
    const data = await listarAccesibilidad(prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 3.60 — PATCH /api/v1/admin/accesibilidad/:id/resolver { decision, motivo? } */
export async function resolverAccesibilidadAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { id } = ParamSchema.parse(req.params);
    const entrada = ResolverAccesibilidadSchema.parse(req.body);
    const data = await resolverSolicitudAccesibilidad(id, req.auth!, entrada, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 3.61 — GET /api/v1/docente/accesibilidad: el estado de la declaración del docente. */
export async function obtenerAccesibilidadDelDocente(req: Request, res: Response): Promise<void> {
  try {
    const data = await obtenerAccesibilidadDocente(req.auth!.sub, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 3.61 — PUT /api/v1/docente/accesibilidad { declarado, fechaFin? } */
export async function declararAccesibilidadDelDocente(req: Request, res: Response): Promise<void> {
  try {
    const entrada = DeclararAccesibilidadDocenteSchema.parse(req.body);
    const data = await declararAccesibilidadDocente(req.auth!.sub, entrada, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

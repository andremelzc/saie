import { Request, Response } from 'express';
import { z } from 'zod';
import { responderError } from '../lib/http';
import { prisma } from '../lib/prisma';
import {
  CrearFusionSchema,
  crearSolicitudFusion,
  listarFusiones,
  listarFusionesDeDocente,
  ResolverFusionSchema,
  resolverSolicitudFusion,
} from '../services/fusionLaboratorio.service';

const ParamSchema = z.object({
  id: z.string().min(1, 'El id de la solicitud es requerido'),
});

/** Issue 7.17 — POST /api/v1/docente/solicitudes-laboratorio { seccionTeoriaId, justificacion } */
export async function crearSolicitudLaboratorio(req: Request, res: Response): Promise<void> {
  try {
    const entrada = CrearFusionSchema.parse(req.body);
    const data = await crearSolicitudFusion(req.auth!.sub, entrada, prisma);
    res.status(201).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 7.17 — GET /api/v1/docente/solicitudes-laboratorio: las del docente autenticado. */
export async function listarMisSolicitudesLaboratorio(req: Request, res: Response): Promise<void> {
  try {
    const data = await listarFusionesDeDocente(req.auth!.sub, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 7.17 — GET /api/v1/admin/solicitudes-laboratorio: pendientes y últimas resueltas. */
export async function listarSolicitudesLaboratorioAdmin(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const data = await listarFusiones(prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 7.17 — PATCH /api/v1/admin/solicitudes-laboratorio/:id/resolver { decision, motivo? } */
export async function resolverSolicitudLaboratorioAdmin(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { id } = ParamSchema.parse(req.params);
    const entrada = ResolverFusionSchema.parse(req.body);
    const data = await resolverSolicitudFusion(id, req.auth!, entrada, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

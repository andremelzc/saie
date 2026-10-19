import { Request, Response } from 'express';
import { z } from 'zod';
import { responderError } from '../lib/http';
import { prisma } from '../lib/prisma';
import {
  aprobarSolicitud,
  crearSolicitud,
  listarSolicitudes,
  listarSolicitudesDeDocente,
  rechazarSolicitud,
  SolicitudAprobarSchema,
  SolicitudCrearSchema,
  SolicitudListadoQuerySchema,
  SolicitudRechazarSchema,
} from '../services/solicitudSoftware.service';

const SolicitudParamSchema = z.object({
  id: z.string().min(1, 'El id de la solicitud es requerido'),
});

/** Issue 4.29 — POST /api/v1/docente/solicitudes-software */
export async function crearSolicitudSoftware(req: Request, res: Response): Promise<void> {
  try {
    const entrada = SolicitudCrearSchema.parse(req.body);
    const data = await crearSolicitud(req.auth!.sub, entrada, prisma);
    res.status(201).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 4.29 — GET /api/v1/docente/solicitudes-software (solo las propias) */
export async function listarMisSolicitudesSoftware(req: Request, res: Response): Promise<void> {
  try {
    const data = await listarSolicitudesDeDocente(req.auth!.sub, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 4.29 — GET /api/v1/admin/solicitudes-software[?estado=&page=&limit=] */
export async function listarSolicitudesSoftware(req: Request, res: Response): Promise<void> {
  try {
    const filtros = SolicitudListadoQuerySchema.parse(req.query);
    const data = await listarSolicitudes(filtros, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 4.29 — PATCH /api/v1/admin/solicitudes-software/:id/aprobar */
export async function aprobarSolicitudSoftware(req: Request, res: Response): Promise<void> {
  try {
    const { id } = SolicitudParamSchema.parse(req.params);
    const entrada = SolicitudAprobarSchema.parse(req.body);
    const data = await aprobarSolicitud(id, req.auth!, entrada, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 4.29 — PATCH /api/v1/admin/solicitudes-software/:id/rechazar */
export async function rechazarSolicitudSoftware(req: Request, res: Response): Promise<void> {
  try {
    const { id } = SolicitudParamSchema.parse(req.params);
    const entrada = SolicitudRechazarSchema.parse(req.body);
    const data = await rechazarSolicitud(id, req.auth!, entrada, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

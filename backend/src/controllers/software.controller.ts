import { Request, Response } from 'express';
import { z } from 'zod';
import { responderError } from '../lib/http';
import { prisma } from '../lib/prisma';
import {
  cambiarEstadoSoftware,
  crearSoftware,
  editarSoftware,
  listarSoftware,
  obtenerSoftwarePorId,
  SoftwareCrearSchema,
  SoftwareEditarSchema,
  SoftwareEstadoSchema,
  SoftwareListadoQuerySchema,
} from '../services/software.service';

const SoftwareParamSchema = z.object({
  id: z.string().min(1, 'El id del software es requerido'),
});

/** Issue 4.28 — GET /api/v1/admin/software[?q=&categoria=&activo=&page=&limit=] */
export async function listarCatalogoSoftware(req: Request, res: Response): Promise<void> {
  try {
    const filtros = SoftwareListadoQuerySchema.parse(req.query);
    const data = await listarSoftware(filtros, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 4.28 — GET /api/v1/admin/software/:id (detalle con uso en laboratorios y secciones) */
export async function obtenerSoftware(req: Request, res: Response): Promise<void> {
  try {
    const { id } = SoftwareParamSchema.parse(req.params);
    const data = await obtenerSoftwarePorId(id, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 4.28 — POST /api/v1/admin/software (solo Coordinación). `409` si está duplicado. */
export async function altaSoftware(req: Request, res: Response): Promise<void> {
  try {
    const entrada = SoftwareCrearSchema.parse(req.body);
    const data = await crearSoftware(entrada, req.auth!, prisma);
    res.status(201).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 4.28 — PATCH /api/v1/admin/software/:id (no permite cambiar la versión) */
export async function editarSoftwareCatalogo(req: Request, res: Response): Promise<void> {
  try {
    const { id } = SoftwareParamSchema.parse(req.params);
    const entrada = SoftwareEditarSchema.parse(req.body);
    const data = await editarSoftware(id, entrada, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 4.28 — PATCH /api/v1/admin/software/:id/estado (alta/baja lógica) */
export async function cambiarEstadoCatalogo(req: Request, res: Response): Promise<void> {
  try {
    const { id } = SoftwareParamSchema.parse(req.params);
    const { activo } = SoftwareEstadoSchema.parse(req.body);
    const data = await cambiarEstadoSoftware(id, activo, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

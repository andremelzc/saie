import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { responderError } from '../lib/http';
import {
  registrarCambioPcsMalogradas,
  registrarCambioSoftware,
} from '../services/laboratorio.service';

const LaboratorioParamSchema = z.object({
  id: z.string().min(1, 'El id del laboratorio es requerido'),
});

const CambioSoftwareSchema = z.object({
  softwareInstalado: z
    .array(z.string().trim().min(1, 'El nombre del software no puede estar vacío').max(120))
    .max(200, 'Demasiados programas en la lista'),
});

const CambioPcsSchema = z.object({
  pcsMalogradas: z
    .number({ error: 'pcsMalogradas debe ser un número entero' })
    .int('pcsMalogradas debe ser un número entero')
    .min(0, 'pcsMalogradas no puede ser negativo'),
});

/**
 * Issue 4.1 — POST /api/v1/admin/laboratorios/:id/software
 * Coordinación (cualquier laboratorio) o Jefatura (solo los suyos).
 */
export async function registrarSoftwareLaboratorio(req: Request, res: Response): Promise<void> {
  try {
    const { id } = LaboratorioParamSchema.parse(req.params);
    const { softwareInstalado } = CambioSoftwareSchema.parse(req.body);
    const resultado = await registrarCambioSoftware(id, softwareInstalado, req.auth!, prisma);
    res.status(200).json({ success: true, data: resultado });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/**
 * Issue 4.2 — POST /api/v1/admin/laboratorios/:id/pcs-malogradas
 * Coordinación (cualquier laboratorio) o Jefatura (solo los suyos).
 */
export async function registrarPcsMalogradasLaboratorio(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { id } = LaboratorioParamSchema.parse(req.params);
    const { pcsMalogradas } = CambioPcsSchema.parse(req.body);
    const resultado = await registrarCambioPcsMalogradas(id, pcsMalogradas, req.auth!, prisma);
    res.status(200).json({ success: true, data: resultado });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

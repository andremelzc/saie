import { Request, Response } from 'express';
import { TipoAlerta } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { responderError } from '../lib/http';
import { filtrosDeMapa, MapaOcupacionQuerySchema } from '../lib/franja';
import { obtenerOcupacionPorPiso } from '../services/ocupacion.service';
import { listarAlertasActivas, resolverAlerta } from '../services/alerta.service';
import {
  registrarCambioPcsMalogradas,
  registrarCambioSoftware,
} from '../services/laboratorio.service';

const LaboratorioParamSchema = z.object({
  id: z.string().min(1, 'El id del laboratorio es requerido'),
});

const AlertaParamSchema = z.object({
  id: z.string().min(1, 'El id de la alerta es requerido'),
});

const AlertasQuerySchema = z.object({
  tipo: z.enum(TipoAlerta, { error: 'El tipo de alerta no es válido' }).optional(),
  espacioId: z.string().trim().min(1).optional(),
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

/** Issue 4.6 — GET /api/v1/admin/alertas[?tipo=SOFTWARE|CAPACIDAD&espacioId=...] */
export async function listarAlertas(req: Request, res: Response): Promise<void> {
  try {
    const filtros = AlertasQuerySchema.parse(req.query);
    const data = await listarAlertasActivas(filtros, req.auth!, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 4.7 — PATCH /api/v1/admin/alertas/:id/resolver */
export async function resolverAlertaPendiente(req: Request, res: Response): Promise<void> {
  try {
    const { id } = AlertaParamSchema.parse(req.params);
    const data = await resolverAlerta(id, req.auth!, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/**
 * Issue 4.12 — GET /api/v1/admin/mapa-ocupacion?pabellon=A&piso=1[&dia=&horaInicio=&horaFin=]
 * Sin franja se usa el momento actual (hora de Lima).
 */
export async function consultarMapaOcupacion(req: Request, res: Response): Promise<void> {
  try {
    const q = MapaOcupacionQuerySchema.parse(req.query);
    const data = await obtenerOcupacionPorPiso(filtrosDeMapa(q), prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

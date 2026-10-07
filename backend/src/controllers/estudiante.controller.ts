import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { responderError } from '../lib/http';
import { normalizarDia } from '../lib/horario';
import {
  ActualizarPerfilSchema,
  actualizarPerfilAlumno,
  listarCursosAlumno,
  obtenerHorarioAlumno,
  obtenerPerfilAlumno,
} from '../services/alumno.service';

const HorarioQuerySchema = z.object({
  dia: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (v === undefined) return undefined;
      const dia = normalizarDia(v);
      if (!dia) {
        ctx.addIssue({ code: 'custom', message: 'El día indicado no es válido' });
        return z.NEVER;
      }
      return dia;
    }),
});

/** Issue 3.10 — GET /api/v1/estudiante/horario[?dia=LUNES] */
export async function obtenerHorario(req: Request, res: Response): Promise<void> {
  try {
    const { dia } = HorarioQuerySchema.parse(req.query);
    const data = await obtenerHorarioAlumno(req.auth!.sub, dia, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 3.11 — GET /api/v1/estudiante/cursos */
export async function listarCursos(req: Request, res: Response): Promise<void> {
  try {
    const data = await listarCursosAlumno(req.auth!.sub, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

// Datos sensibles (DNI, ficha médica): nunca deben quedar en cachés intermedias.
function sinCache(res: Response): void {
  res.setHeader('Cache-Control', 'no-store');
}

/** Issue 3.12 — GET /api/v1/estudiante/perfil */
export async function obtenerPerfil(req: Request, res: Response): Promise<void> {
  try {
    const data = await obtenerPerfilAlumno(req.auth!.sub, prisma);
    sinCache(res);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 3.12 — PATCH /api/v1/estudiante/perfil */
export async function actualizarPerfil(req: Request, res: Response): Promise<void> {
  try {
    const entrada = ActualizarPerfilSchema.parse(req.body);
    const data = await actualizarPerfilAlumno(req.auth!.sub, entrada, prisma);
    sinCache(res);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

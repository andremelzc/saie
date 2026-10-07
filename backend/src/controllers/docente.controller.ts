import { Request, Response } from 'express';
import { TipoEspacio } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { responderError } from '../lib/http';
import { normalizarDia } from '../lib/horario';
import {
  CrearIncidenciaSchema,
  explorarEspacios,
  obtenerHorarioDocente,
  registrarIncidencia,
} from '../services/docente.service';

const diaOpcional = z
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
  });

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'La hora debe tener formato HH:mm');

const HorarioQuerySchema = z.object({ dia: diaOpcional });

const ExploradorQuerySchema = z
  .object({
    tipo: z.enum(TipoEspacio, { error: 'El tipo de espacio no es válido' }).optional(),
    pabellon: z.string().trim().min(1).optional(),
    piso: z.coerce.number().int('El piso debe ser un entero').optional(),
    capacidadMinima: z.coerce
      .number()
      .int('La capacidad debe ser un entero')
      .min(0, 'La capacidad no puede ser negativa')
      .optional(),
    soloDisponibles: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => v === 'true'),
    dia: diaOpcional,
    horaInicio: hora.optional(),
    horaFin: hora.optional(),
  })
  .refine((q) => (q.dia && q.horaInicio && q.horaFin) || (!q.dia && !q.horaInicio && !q.horaFin), {
    message: 'Para consultar una franja indica dia, horaInicio y horaFin juntos',
  })
  .refine((q) => !q.horaInicio || !q.horaFin || q.horaInicio < q.horaFin, {
    message: 'horaInicio debe ser anterior a horaFin',
  });

/** Issue 7.2 — GET /api/v1/docente/horario[?dia=LUNES] */
export async function obtenerHorario(req: Request, res: Response): Promise<void> {
  try {
    const { dia } = HorarioQuerySchema.parse(req.query);
    const data = await obtenerHorarioDocente(req.auth!.sub, dia, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/**
 * Issue 7.3 — GET /api/v1/docente/espacios/explorador
 * Filtros: tipo, pabellon, piso, capacidadMinima, soloDisponibles y (opcional) la franja
 * dia + horaInicio + horaFin. Sin franja se usa el momento actual.
 */
export async function explorarEspaciosDocente(req: Request, res: Response): Promise<void> {
  try {
    const q = ExploradorQuerySchema.parse(req.query);
    const data = await explorarEspacios(
      {
        tipo: q.tipo,
        pabellon: q.pabellon,
        piso: q.piso,
        capacidadMinima: q.capacidadMinima,
        soloDisponibles: q.soloDisponibles,
        franja:
          q.dia && q.horaInicio && q.horaFin
            ? { diaSemana: q.dia, horaInicio: q.horaInicio, horaFin: q.horaFin }
            : undefined,
      },
      prisma,
    );
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 7.5 — POST /api/v1/docente/incidencias */
export async function crearIncidencia(req: Request, res: Response): Promise<void> {
  try {
    const entrada = CrearIncidenciaSchema.parse(req.body);
    const data = await registrarIncidencia(req.auth!.sub, entrada, prisma);
    res.status(201).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

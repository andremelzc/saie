import { z } from 'zod';
import { DiaSemana } from '@prisma/client';
import { normalizarDia } from './horario';

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'La hora debe tener formato HH:mm');

/** Campos de una consulta por franja: `dia`, `horaInicio` y `horaFin` (los tres o ninguno). */
export const franjaShape = {
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
  horaInicio: hora.optional(),
  horaFin: hora.optional(),
};

interface FranjaQuery {
  dia?: DiaSemana;
  horaInicio?: string;
  horaFin?: string;
}

export const franjaCompleta = (q: FranjaQuery): boolean =>
  Boolean(q.dia && q.horaInicio && q.horaFin) || (!q.dia && !q.horaInicio && !q.horaFin);

export const franjaOrdenada = (q: FranjaQuery): boolean =>
  !q.horaInicio || !q.horaFin || q.horaInicio < q.horaFin;

export const MENSAJE_FRANJA_INCOMPLETA =
  'Para consultar una franja indica dia, horaInicio y horaFin juntos';
export const MENSAJE_FRANJA_DESORDENADA = 'horaInicio debe ser anterior a horaFin';

/** Schema de consulta de mapa por piso, compartido por el panel (4.12) y el alumno (3.13). */
export const MapaOcupacionQuerySchema = z
  .object({
    pabellon: z.string().trim().min(1, 'El pabellón es requerido'),
    piso: z.coerce
      .number({ error: 'El piso debe ser un entero' })
      .int('El piso debe ser un entero'),
    ...franjaShape,
  })
  .refine(franjaCompleta, { message: MENSAJE_FRANJA_INCOMPLETA })
  .refine(franjaOrdenada, { message: MENSAJE_FRANJA_DESORDENADA });

export function filtrosDeMapa(q: z.infer<typeof MapaOcupacionQuerySchema>) {
  return {
    pabellon: q.pabellon,
    piso: q.piso,
    franja:
      q.dia && q.horaInicio && q.horaFin
        ? { diaSemana: q.dia, horaInicio: q.horaInicio, horaFin: q.horaFin }
        : undefined,
  };
}

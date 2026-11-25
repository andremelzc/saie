import { z } from 'zod';

/**
 * Decisión de Coordinación sobre una solicitud (Issues 3.60 y 7.17): aprobar, o rechazar con un
 * motivo que verá quien la pidió.
 */
export const ResolverSolicitudSchema = z.discriminatedUnion('decision', [
  z.object({ decision: z.literal('APROBAR') }),
  z.object({
    decision: z.literal('RECHAZAR'),
    motivo: z
      .string({ error: 'El motivo del rechazo es obligatorio' })
      .trim()
      .min(5, 'Explica el motivo del rechazo (al menos 5 caracteres)')
      .max(500, 'El motivo no puede superar 500 caracteres'),
  }),
]);

export type ResolverSolicitudInput = z.infer<typeof ResolverSolicitudSchema>;

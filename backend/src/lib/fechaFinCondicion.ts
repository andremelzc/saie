import { z } from 'zod';
import { fechaEnLima } from '../telegram/resumenDiario.service';

/**
 * Issue 3.61 (R16): fecha de fin de una condición de accesibilidad temporal (alumnos y docentes).
 */

/** «Hoy» en Lima como fecha `@db.Date` (medianoche UTC de ese día). */
export function hoyEnLima(ahora: Date = new Date()): Date {
  return new Date(`${fechaEnLima(ahora)}T00:00:00.000Z`);
}

/**
 * Fecha de fin opcional (`AAAA-MM-DD`): el último día en que rige la condición. No puede ser un
 * día que ya pasó. `null` = no vence.
 */
export const FechaFinCondicionSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha de fin debe tener formato AAAA-MM-DD')
  .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00.000Z`).getTime()), 'La fecha no es válida')
  .refine((v) => v >= fechaEnLima(new Date()), 'La fecha de fin no puede ser un día que ya pasó')
  .nullable();

/** `AAAA-MM-DD` → fecha `@db.Date`; `null` y `undefined` se mantienen. */
export function aFechaFin(valor: string | null | undefined): Date | null | undefined {
  if (valor === undefined || valor === null) return valor;
  return new Date(`${valor}T00:00:00.000Z`);
}

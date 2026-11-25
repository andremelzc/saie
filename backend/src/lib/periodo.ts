import { z } from 'zod';

/**
 * Issue 4.64 (riesgo R49 de la auditoría): el periodo se guarda como texto y el «más reciente»
 * se elige ordenando ese texto. Si un CSV trae «2026-II» (forma habitual en Perú), se creaba un
 * periodo distinto de «2026-2» que además quedaba por encima al ordenar y pasaba a ser el vigente.
 *
 * Por eso todo periodo que entra al sistema se normaliza a una sola forma, `AAAA-N`:
 * - acepta números («2026-1», «2026-2») y romanos («2026-I», «2026-II»), sin importar
 *   mayúsculas ni espacios;
 * - `0` se reserva para un ciclo de verano (AAAA-0);
 * - cualquier otra forma se rechaza.
 */
const SEMESTRE: Record<string, string> = { '0': '0', '1': '1', '2': '2', I: '1', II: '2' };

export const MENSAJE_PERIODO_INVALIDO =
  'El periodo debe tener el formato 2026-1 o 2026-2 (también se acepta 2026-I o 2026-II)';

/** Devuelve el periodo en la forma `AAAA-N`, o `null` si no es un periodo válido. */
export function normalizarPeriodo(valor: string): string | null {
  const compacto = valor.replace(/\s+/g, '').toUpperCase();
  const m = /^(\d{4})-(0|1|2|I|II)$/.exec(compacto);
  if (!m) return null;
  return `${m[1]}-${SEMESTRE[m[2]]}`;
}

/** Esquema Zod de un periodo: normaliza a `AAAA-N` y rechaza cualquier otra forma. */
export const periodoSchema = z
  .string({ error: 'El periodo es requerido' })
  .min(1, 'El periodo es requerido')
  .transform((valor, ctx) => {
    const normalizado = normalizarPeriodo(valor);
    if (!normalizado) {
      ctx.addIssue({ code: 'custom', message: MENSAJE_PERIODO_INVALIDO });
      return z.NEVER;
    }
    return normalizado;
  });

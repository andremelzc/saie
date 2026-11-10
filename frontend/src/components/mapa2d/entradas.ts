import type { Pabellon } from './plano';

/**
 * Puertas del piso 1 (ids de `assets/planos/piso-1.svg`; el plano no lleva prefijo de pabellón en
 * las puertas). La facultad tiene una sola entrada desde la calle y dos puertas al patio:
 *
 * - `entrada-1`: la entrada principal, en el pabellón antiguo.
 * - `entrada-3`: puerta del pabellón antiguo al patio.
 * - `entrada-2`: puerta del patio al pabellón nuevo (no se entra a la facultad por ella).
 */
export const ENTRADA_PRINCIPAL = 'entrada-1';

/** Puerta de cada pabellón hacia el patio. */
export const PUERTA_AL_PATIO: Record<Pabellon, string> = { ANT: 'entrada-3', NUE: 'entrada-2' };

export const IDS_ENTRADAS = new Set([ENTRADA_PRINCIPAL, ...Object.values(PUERTA_AL_PATIO)]);

/** Rótulo de cada puerta sobre el plano. */
export const ETIQUETA_PUERTA: Record<string, string> = {
  'entrada-1': 'Entrada principal',
  'entrada-2': 'Patio (nuevo)',
  'entrada-3': 'Patio (antiguo)',
};

/** Giro del norte respecto de la parte de arriba del plano, en grados (0 = el norte está arriba). */
export const NORTE_GRADOS = 0;

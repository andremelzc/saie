import type { Pabellon } from './plano';

/**
 * Figura `puerta` del piso 1 que es la entrada de cada pabellón (ids de `assets/planos/piso-1.svg`).
 * El plano no lleva prefijo de pabellón en las puertas.
 */
export const ENTRADA_PABELLON: Record<Pabellon, string> = { NUE: 'entrada-2', ANT: 'entrada-1' };
export const IDS_ENTRADAS = new Set(Object.values(ENTRADA_PABELLON));

/**
 * Escala aproximada del plano: metros por unidad del dibujo. Es una estimación (un aula de 43
 * unidades ≈ 8,5 m); se ajusta aquí cuando se midan los pabellones. La barra de escala dice «aprox.».
 */
export const METROS_POR_UNIDAD = 0.2;
/** Giro del norte respecto de la parte de arriba del plano, en grados (0 = el norte está arriba). */
export const NORTE_GRADOS = 0;

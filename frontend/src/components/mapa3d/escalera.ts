/**
 * Forma de las escaleras de la maqueta: dos tramos con descanso (ver `ORIENTACION_ESCALERA`).
 * Es geometría pura, sin three, para poder probarla.
 */

/** Peldaños de cada tramo. */
const PELDANOS_POR_TRAMO = 5;

export interface Bloque {
  /** Distancia del centro al arranque, a lo largo del sentido de subida. */
  u: number;
  /** Desplazamiento lateral del centro (positivo hacia la izquierda de quien sube). */
  v: number;
  largo: number;
  ancho: number;
  alto: number;
}

/**
 * Bloques de una escalera de dos tramos con descanso, en coordenadas de la escalera: `u` crece en
 * el sentido en que sube el primer tramo y `v` hacia la izquierda de quien sube. El primer tramo
 * sube hasta la mitad de la altura por el lado izquierdo, el descanso ocupa el extremo y el segundo
 * tramo regresa por el lado derecho hasta la altura total.
 */
export function bloquesDeEscalera(largo: number, ancho: number, altura: number): Bloque[] {
  const descanso = Math.min(ancho / 2, largo / 2);
  const tramo = largo - descanso;
  const paso = tramo / PELDANOS_POR_TRAMO;
  const mitad = altura / 2;
  const carril = (ancho / 2) * 0.94;
  const bloques: Bloque[] = [];

  for (let i = 0; i < PELDANOS_POR_TRAMO; i++) {
    // Ida: del arranque hacia el descanso, por la izquierda.
    bloques.push({
      u: paso * (i + 0.5),
      v: ancho / 4,
      largo: paso,
      ancho: carril,
      alto: (mitad * (i + 1)) / PELDANOS_POR_TRAMO,
    });
  }
  bloques.push({
    u: tramo + descanso / 2,
    v: 0,
    largo: descanso,
    ancho: ancho * 0.94,
    alto: mitad,
  });
  for (let i = 0; i < PELDANOS_POR_TRAMO; i++) {
    // Vuelta: del descanso hacia el arranque, por la derecha, sigue subiendo.
    bloques.push({
      u: tramo - paso * (i + 0.5),
      v: -ancho / 4,
      largo: paso,
      ancho: carril,
      alto: mitad + (mitad * (i + 1)) / PELDANOS_POR_TRAMO,
    });
  }
  return bloques;
}

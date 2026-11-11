/**
 * Teclado de la maqueta 3D (Issue 4.24): las mismas teclas que el plano 2D donde coinciden
 * (flechas, `+`, `−` y `0`). No depende de three: traduce una tecla en una acción.
 */

/** Cuánto se mueve la cámara con cada pulsación. Los ángulos están en radianes. */
export interface MovimientoCamara {
  /** Giro alrededor del edificio (positivo, a la derecha). */
  girar?: number;
  /** Inclinación (positivo, hacia el horizonte; negativo, hacia arriba del todo). */
  inclinar?: number;
  /** Factor de la distancia: menor que 1 acerca, mayor que 1 aleja. */
  zoom?: number;
  /** Desplazamiento lateral, en fracciones del tamaño del edificio. */
  derecha?: number;
  /** Desplazamiento hacia delante, en fracciones del tamaño del edificio. */
  adelante?: number;
}

export type AccionTeclado = { tipo: 'mover'; movimiento: MovimientoCamara } | { tipo: 'reiniciar' };

export const PASO_GIRO = Math.PI / 12;
export const PASO_INCLINACION = Math.PI / 36;
export const FACTOR_ZOOM = 0.85;
export const PASO_DESPLAZAMIENTO = 0.05;

/**
 * La acción de una tecla, o `null` si no es de la maqueta (o lleva Ctrl, Alt o Cmd, que son
 * atajos del navegador, como Ctrl y `+` para acercar la página).
 */
export function accionDeTecla(
  tecla: string,
  mayus: boolean,
  otrosModificadores = false,
): AccionTeclado | null {
  if (otrosModificadores) return null;
  const mover = (movimiento: MovimientoCamara): AccionTeclado => ({ tipo: 'mover', movimiento });

  switch (tecla) {
    case 'ArrowLeft':
      return mover(mayus ? { derecha: -PASO_DESPLAZAMIENTO } : { girar: -PASO_GIRO });
    case 'ArrowRight':
      return mover(mayus ? { derecha: PASO_DESPLAZAMIENTO } : { girar: PASO_GIRO });
    case 'ArrowUp':
      return mover(mayus ? { adelante: PASO_DESPLAZAMIENTO } : { inclinar: -PASO_INCLINACION });
    case 'ArrowDown':
      return mover(mayus ? { adelante: -PASO_DESPLAZAMIENTO } : { inclinar: PASO_INCLINACION });
    case '+':
    case '=':
      return mover({ zoom: FACTOR_ZOOM });
    case '-':
    case '_':
      return mover({ zoom: 1 / FACTOR_ZOOM });
    case '0':
      return { tipo: 'reiniciar' };
    default:
      return null;
  }
}

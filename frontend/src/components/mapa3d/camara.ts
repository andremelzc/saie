import { Spherical, Vector3 } from 'three';
import type { MovimientoCamara } from './teclado';

export interface LimitesCamara {
  anguloMinimo: number;
  anguloMaximo: number;
  distanciaMinima: number;
  distanciaMaxima: number;
}

const acotar = (valor: number, minimo: number, maximo: number) =>
  Math.min(maximo, Math.max(minimo, valor));

/**
 * Mueve la cámara según el teclado: gira e inclina alrededor del objetivo, acerca o aleja, y
 * desplaza el objetivo por el suelo (sin cambiar la altura). Modifica `posicion` y `objetivo`.
 * Respeta los mismos límites que la cámara orbital: no pasa del suelo ni se aleja de más.
 */
export function aplicarMovimiento(
  posicion: Vector3,
  objetivo: Vector3,
  movimiento: MovimientoCamara,
  limites: LimitesCamara,
  tamano: number,
): void {
  const esferica = new Spherical().setFromVector3(posicion.clone().sub(objetivo));
  esferica.theta += movimiento.girar ?? 0;
  esferica.phi = acotar(
    esferica.phi + (movimiento.inclinar ?? 0),
    limites.anguloMinimo,
    limites.anguloMaximo,
  );
  esferica.radius = acotar(
    esferica.radius * (movimiento.zoom ?? 1),
    limites.distanciaMinima,
    limites.distanciaMaxima,
  );

  // «Adelante» es hacia donde mira la cámara, sobre el suelo; «derecha», su perpendicular.
  const adelante = objetivo.clone().sub(posicion).setY(0);
  if (adelante.lengthSq() < 1e-9) adelante.set(0, 0, -1);
  adelante.normalize();
  const derecha = new Vector3(-adelante.z, 0, adelante.x);
  objetivo
    .addScaledVector(derecha, (movimiento.derecha ?? 0) * tamano)
    .addScaledVector(adelante, (movimiento.adelante ?? 0) * tamano);

  posicion.copy(objetivo).add(new Vector3().setFromSpherical(esferica));
}

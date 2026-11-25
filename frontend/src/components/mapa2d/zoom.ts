import type { CajaPlano, Punto } from './plano';

/** Cuánto se puede acercar (veces) y alejar (veces respecto de la vista completa). */
export const ZOOM_MAXIMO = 8;
export const ZOOM_MINIMO = 1;
export const PASO_ZOOM = 1.4;

/** Tamaño en píxeles del elemento que contiene el SVG. */
export interface Pantalla {
  ancho: number;
  alto: number;
}

/** Escala (píxeles por unidad del plano) y desplazamiento del dibujo centrado (`meet`). */
function ajuste(vista: CajaPlano, pantalla: Pantalla) {
  const escala = Math.min(pantalla.ancho / vista.ancho, pantalla.alto / vista.alto) || 1;
  return {
    escala,
    dx: (pantalla.ancho - vista.ancho * escala) / 2,
    dy: (pantalla.alto - vista.alto * escala) / 2,
  };
}

/** Punto del plano que hay bajo un punto de la pantalla (relativo al elemento). */
export function pantallaAPlano(
  vista: CajaPlano,
  pantalla: Pantalla,
  px: number,
  py: number,
): Punto {
  const { escala, dx, dy } = ajuste(vista, pantalla);
  return { x: vista.x + (px - dx) / escala, y: vista.y + (py - dy) / escala };
}

/** Acerca o aleja la vista manteniendo quieto el punto `ancla` (en coordenadas del plano). */
export function acercar(
  base: CajaPlano,
  vista: CajaPlano,
  factor: number,
  ancla: Punto,
): CajaPlano {
  const ancho = Math.min(
    base.ancho / ZOOM_MINIMO,
    Math.max(base.ancho / ZOOM_MAXIMO, vista.ancho / factor),
  );
  const k = ancho / vista.ancho;
  const alto = vista.alto * k;
  return limitar(base, {
    x: ancla.x - (ancla.x - vista.x) * k,
    y: ancla.y - (ancla.y - vista.y) * k,
    ancho,
    alto,
  });
}

/** Desplaza la vista un vector dado en unidades del plano. */
export function desplazar(base: CajaPlano, vista: CajaPlano, dx: number, dy: number): CajaPlano {
  return limitar(base, { ...vista, x: vista.x + dx, y: vista.y + dy });
}

/** La vista no puede alejarse de la caja del plano: su centro se queda dentro de ella. */
export function limitar(base: CajaPlano, vista: CajaPlano): CajaPlano {
  const cx = Math.min(base.x + base.ancho, Math.max(base.x, vista.x + vista.ancho / 2));
  const cy = Math.min(base.y + base.alto, Math.max(base.y, vista.y + vista.alto / 2));
  return { ...vista, x: cx - vista.ancho / 2, y: cy - vista.alto / 2 };
}

/** Vista centrada en un punto con un nivel de zoom dado (1 = el plano completo). */
export function centrarEn(base: CajaPlano, centro: Punto, zoom: number): CajaPlano {
  const ancho = base.ancho / Math.min(ZOOM_MAXIMO, Math.max(ZOOM_MINIMO, zoom));
  const alto = base.alto * (ancho / base.ancho);
  return limitar(base, { x: centro.x - ancho / 2, y: centro.y - alto / 2, ancho, alto });
}

/** Nivel de zoom actual (1 = completo). */
export function nivelZoom(base: CajaPlano, vista: CajaPlano): number {
  return base.ancho / vista.ancho;
}

/** Píxeles por unidad del plano con la vista dada. */
export function pxPorUnidad(vista: CajaPlano, pantalla: Pantalla): number {
  return ajuste(vista, pantalla).escala;
}

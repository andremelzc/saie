import type { Shape } from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { CAPA_MUROS } from './config';

export interface Punto {
  x: number;
  y: number;
}

/** Una figura del plano con su id, su clase (`data-clase`) y su contorno listo para extruir. */
export interface FiguraPlano {
  id: string;
  clase: string;
  shapes: Shape[];
}

export interface PlanoGeometria {
  figuras: FiguraPlano[];
  /** Cada muro es una polilínea de puntos en coordenadas del plano. */
  muros: Punto[][];
  /** Caja del plano (viewBox). */
  caja: { x: number; y: number; ancho: number; alto: number };
}

/**
 * Lee un SVG limpio (salida de `tools/planos`) y devuelve la geometría para extruir.
 * No asume figuras concretas: toma todo elemento con `id` y `data-clase`, y los muros de la capa
 * `muros`. Las figuras sin `id` o sin clase se ignoran.
 */
export function leerPlano(svgTexto: string): PlanoGeometria {
  const datos = new SVGLoader().parse(svgTexto);
  // En ejecución `xml` es el elemento raíz <svg>, aunque el tipo declare un documento.
  const raiz = datos.xml as unknown as Element;
  const [x = 0, y = 0, ancho = 0, alto = 0] = (raiz.getAttribute('viewBox') ?? '')
    .split(/[\s,]+/)
    .map(Number);

  const figuras: FiguraPlano[] = [];
  const muros: Punto[][] = [];

  for (const trazo of datos.paths) {
    const nodo = trazo.userData?.node as Element | undefined;
    if (!nodo) continue;

    if (nodo.closest(`#${CAPA_MUROS}`)) {
      for (const sub of trazo.subPaths) {
        const puntos = sub.getPoints().map((p) => ({ x: p.x, y: p.y }));
        if (puntos.length > 1) muros.push(puntos);
      }
      continue;
    }

    const id = nodo.getAttribute('id');
    const clase = nodo.getAttribute('data-clase');
    if (!id || !clase) continue;

    const shapes = SVGLoader.createShapes(trazo);
    if (shapes.length > 0) figuras.push({ id, clase, shapes });
  }

  return { figuras, muros, caja: { x, y, ancho, alto } };
}

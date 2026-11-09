/**
 * Lectura de los planos SVG (`assets/planos/piso-N.svg`, salida de `tools/planos`) para el mapa
 * 2D. Convierte el SVG en datos y no lo inserta como HTML: el componente dibuja las figuras
 * como elementos de React, lo que permite hacerlas accesibles y colorearlas por estado.
 */

export interface CajaPlano {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

export interface FiguraPlano2D {
  /** `id` de la figura en el plano (p. ej. `NUE-101`); enlaza con el espacio de la base de datos. */
  id: string;
  /** `data-clase` del plano: aula, laboratorio, escalera, bano, administrativo… */
  clase: string;
  /** `data-nombre` del plano (p. ej. «Aula 104 - Laboratorio 08»); vacío si la figura no lo trae. */
  nombre: string;
  /** Rectángulo, o `null` si la figura es un polígono. */
  rect: CajaPlano | null;
  /** Atributo `points` del polígono, o `null` si la figura es un rectángulo. */
  puntos: string | null;
  caja: CajaPlano;
}

export interface Plano2D {
  caja: CajaPlano;
  figuras: FiguraPlano2D[];
  /** Atributo `points` de cada muro. */
  muros: string[];
}

export type Pabellon = 'NUE' | 'ANT';

/** Pabellón al que pertenece una figura, según el prefijo de su id (`NUE-` o `ANT-`). */
export function pabellonDe(id: string): Pabellon | null {
  if (id.startsWith('NUE-')) return 'NUE';
  if (id.startsWith('ANT-')) return 'ANT';
  return null;
}

/** Caja que envuelve a un conjunto de figuras, o `null` si no hay ninguna. */
export function cajaDeFiguras(figuras: FiguraPlano2D[]): CajaPlano | null {
  if (figuras.length === 0) return null;
  const x0 = Math.min(...figuras.map((f) => f.caja.x));
  const y0 = Math.min(...figuras.map((f) => f.caja.y));
  const x1 = Math.max(...figuras.map((f) => f.caja.x + f.caja.ancho));
  const y1 = Math.max(...figuras.map((f) => f.caja.y + f.caja.alto));
  return { x: x0, y: y0, ancho: x1 - x0, alto: y1 - y0 };
}

function cajaDePuntos(puntos: string): CajaPlano {
  const pares = puntos
    .trim()
    .split(/\s+/)
    .map((p) => p.split(',').map(Number));
  const xs = pares.map((p) => p[0]);
  const ys = pares.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, ancho: Math.max(...xs) - x, alto: Math.max(...ys) - y };
}

/** Lee un plano SVG limpio. Lanza un error si el texto no es un SVG. */
export function leerPlano2D(svgTexto: string): Plano2D {
  const doc = new DOMParser().parseFromString(svgTexto, 'image/svg+xml');
  const raiz = doc.documentElement;
  if (!raiz || raiz.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) {
    throw new Error('El plano no es un SVG válido');
  }
  const [x = 0, y = 0, ancho = 0, alto = 0] = (raiz.getAttribute('viewBox') ?? '')
    .split(/[\s,]+/)
    .map(Number);

  const figuras: FiguraPlano2D[] = [];
  for (const el of Array.from(doc.querySelectorAll('[data-clase][id]'))) {
    if (el.closest('#muros')) continue;
    const id = el.getAttribute('id') as string;
    const clase = el.getAttribute('data-clase') as string;
    const nombre = el.getAttribute('data-nombre') ?? '';
    if (el.nodeName === 'rect') {
      const r = {
        x: Number(el.getAttribute('x') ?? 0),
        y: Number(el.getAttribute('y') ?? 0),
        ancho: Number(el.getAttribute('width') ?? 0),
        alto: Number(el.getAttribute('height') ?? 0),
      };
      figuras.push({ id, clase, nombre, rect: r, puntos: null, caja: { ...r } });
    } else if (el.nodeName === 'polygon') {
      const puntos = el.getAttribute('points') ?? '';
      if (puntos)
        figuras.push({ id, clase, nombre, rect: null, puntos, caja: cajaDePuntos(puntos) });
    }
  }

  const muros = Array.from(doc.querySelectorAll('#muros polyline, #muros polygon'))
    .map((el) => el.getAttribute('points') ?? '')
    .filter(Boolean);

  return { caja: { x, y, ancho, alto }, figuras, muros };
}

export interface Punto {
  x: number;
  y: number;
}

/** Centro de la caja de una figura. */
export function centroDe(f: FiguraPlano2D): Punto {
  return { x: f.caja.x + f.caja.ancho / 2, y: f.caja.y + f.caja.alto / 2 };
}

export type Direccion = 'arriba' | 'abajo' | 'izquierda' | 'derecha';

/**
 * Figura más cercana a `desde` en la dirección dada (para moverse con las flechas del teclado).
 * Solo cuenta las que están realmente hacia ese lado; el desvío lateral pesa el doble.
 */
export function vecinoEnDireccion(
  figuras: FiguraPlano2D[],
  desde: string,
  direccion: Direccion,
): FiguraPlano2D | null {
  const origen = figuras.find((f) => f.id === desde);
  if (!origen) return null;
  const o = centroDe(origen);
  let mejor: FiguraPlano2D | null = null;
  let mejorPuntaje = Infinity;
  for (const f of figuras) {
    if (f.id === desde) continue;
    const c = centroDe(f);
    const dx = c.x - o.x;
    const dy = c.y - o.y;
    const eje = direccion === 'derecha' ? dx : direccion === 'izquierda' ? -dx : direccion === 'abajo' ? dy : -dy;
    const lateral = direccion === 'derecha' || direccion === 'izquierda' ? Math.abs(dy) : Math.abs(dx);
    if (eje <= 0.5 || lateral > eje * 2.5) continue;
    const puntaje = eje + lateral * 2;
    if (puntaje < mejorPuntaje) {
      mejorPuntaje = puntaje;
      mejor = f;
    }
  }
  return mejor;
}

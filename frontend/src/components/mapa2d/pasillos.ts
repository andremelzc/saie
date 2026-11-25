import type { FiguraPlano2D, Plano2D, Punto } from './plano';

/**
 * Pasillos del plano, sin necesidad de dibujarlos ni de una escala real.
 *
 * Regla del edificio: el pasillo es el espacio que queda entre las aulas, y las puertas siempre
 * dan al pasillo. Por eso lo transitable de un piso es **la parte construida (`techo`) menos las
 * figuras** (aulas, laboratorios, baños, escaleras…), y la puerta de una figura es cualquier
 * punto de su borde que toca un pasillo. Con esa malla se calcula el camino más corto, la
 * distancia al ascensor y qué aulas comparten pared. Las distancias están en unidades del plano
 * (no hay escala en metros) y solo sirven para comparar.
 */

export interface Malla {
  x0: number;
  y0: number;
  ancho: number;
  alto: number;
  /** 1 = transitable, 0 = muro o figura. Una celda mide una unidad del plano. */
  libre: Uint8Array;
  /** 1 = celda al aire libre (el patio). Solo existe en las mallas creadas con `conPatio`. */
  exterior?: Uint8Array;
}

/**
 * Cuánto «cuesta» más caminar al aire libre que por dentro: a igualdad aproximada se prefiere el
 * pasadizo interior al patio (sol, lluvia), pero un atajo claro por el patio sí se toma.
 */
export const PENALIZACION_EXTERIOR = 1.25;

/** Figuras que se ocupan con algo y por tanto no se camina por encima. */
const OBSTACULOS = new Set([
  'aula',
  'laboratorio',
  'bano',
  'administrativo',
  'auditorio',
  'biblioteca',
  'comedor',
  'sala',
  'escalera',
  'ascensor',
]);

/** Hasta qué distancia de una figura una celda cuenta como «su puerta» (unidades del plano). */
const ALCANCE_PUERTA = 1.5;

function poligonoDe(f: FiguraPlano2D): number[][] | null {
  if (f.rect) {
    const { x, y, ancho, alto } = f.rect;
    return [
      [x, y],
      [x + ancho, y],
      [x + ancho, y + alto],
      [x, y + alto],
    ];
  }
  if (!f.puntos) return null;
  return f.puntos
    .trim()
    .split(/\s+/)
    .map((p) => p.split(',').map(Number));
}

function dentroDe(poligono: number[][], x: number, y: number): boolean {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i];
    const [xj, yj] = poligono[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

export interface OpcionesMalla {
  /**
   * Incluye el patio (lo que la losa cubre y el techo no) como transitable. El borde del techo
   * pasa a ser muro, con un hueco en cada puerta del plano: solo se sale al patio por ellas.
   * Es lo que permite una ruta de un pabellón a otro; el cálculo de contiguos y de distancias al
   * ascensor no lo usa.
   */
  conPatio?: boolean;
}

/** Grosor, a cada lado del borde del techo, que se cierra como muro al incluir el patio. */
const MITAD_MURO = 0.8;

/** Malla de un piso, o `null` si su plano no trae la figura `techo` (la parte construida). */
export function crearMalla(plano: Plano2D, opciones: OpcionesMalla = {}): Malla | null {
  const techo = plano.figuras.find((f) => f.clase === 'techo');
  const contorno = techo ? poligonoDe(techo) : null;
  if (!techo || !contorno) return null;

  const losa = opciones.conPatio ? plano.figuras.find((f) => f.clase === 'losa') : undefined;
  const contornoLosa = losa ? poligonoDe(losa) : null;
  const patio = Boolean(contornoLosa);
  const puertas = patio ? plano.figuras.filter((f) => f.clase === 'puerta') : [];

  // Caja de la malla: el techo y, con patio, también la losa y las puertas (que sobresalen).
  const cajas = [techo.caja, ...(losa ? [losa.caja] : []), ...puertas.map((f) => f.caja)];
  const xMin = Math.min(...cajas.map((c) => c.x));
  const yMin = Math.min(...cajas.map((c) => c.y));
  const xMax = Math.max(...cajas.map((c) => c.x + c.ancho));
  const yMax = Math.max(...cajas.map((c) => c.y + c.alto));
  const x0 = Math.floor(xMin);
  const y0 = Math.floor(yMin);
  const ancho = Math.ceil(xMax) - x0;
  const alto = Math.ceil(yMax) - y0;
  const libre = new Uint8Array(ancho * alto);
  const exterior = patio ? new Uint8Array(ancho * alto) : undefined;

  for (let j = 0; j < alto; j++) {
    for (let i = 0; i < ancho; i++) {
      const cx = x0 + i + 0.5;
      const cy = y0 + j + 0.5;
      if (dentroDe(contorno, cx, cy)) {
        libre[j * ancho + i] = 1;
      } else if (contornoLosa !== null && dentroDe(contornoLosa, cx, cy)) {
        // Lo que la losa cubre y el techo no es el patio: se camina, pero al aire libre.
        libre[j * ancho + i] = 1;
        if (exterior) exterior[j * ancho + i] = 1;
      }
    }
  }

  if (patio) {
    // El borde del techo es muro: cada tramo cierra las celdas que quedan a menos de `MITAD_MURO`.
    for (let k = 0; k < contorno.length; k++) {
      const [ax, ay] = contorno[k];
      const [bx, by] = contorno[(k + 1) % contorno.length];
      const iMin = Math.max(0, Math.floor(Math.min(ax, bx)) - x0 - 1);
      const iMax = Math.min(ancho - 1, Math.ceil(Math.max(ax, bx)) - x0 + 1);
      const jMin = Math.max(0, Math.floor(Math.min(ay, by)) - y0 - 1);
      const jMax = Math.min(alto - 1, Math.ceil(Math.max(ay, by)) - y0 + 1);
      for (let j = jMin; j <= jMax; j++) {
        for (let i = iMin; i <= iMax; i++) {
          const dx = bx - ax;
          const dy = by - ay;
          const largo2 = dx * dx + dy * dy;
          const px = x0 + i + 0.5;
          const py = y0 + j + 0.5;
          const t =
            largo2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / largo2));
          if (Math.hypot(px - (ax + t * dx), py - (ay + t * dy)) <= MITAD_MURO) {
            libre[j * ancho + i] = 0;
          }
        }
      }
    }
    // Cada puerta abre un hueco en el muro, de un lado al otro.
    for (const f of puertas) {
      const iMin = Math.max(0, Math.floor(f.caja.x) - x0);
      const iMax = Math.min(ancho - 1, Math.ceil(f.caja.x + f.caja.ancho) - x0);
      const jMin = Math.max(0, Math.floor(f.caja.y) - y0);
      const jMax = Math.min(alto - 1, Math.ceil(f.caja.y + f.caja.alto) - y0);
      for (let j = jMin; j <= jMax; j++) {
        for (let i = iMin; i <= iMax; i++) libre[j * ancho + i] = 1;
      }
    }
  }

  for (const f of plano.figuras) {
    if (!OBSTACULOS.has(f.clase)) continue;
    const poligono = poligonoDe(f);
    if (!poligono) continue;
    const iMin = Math.max(0, Math.floor(f.caja.x) - x0);
    const iMax = Math.min(ancho - 1, Math.ceil(f.caja.x + f.caja.ancho) - x0);
    const jMin = Math.max(0, Math.floor(f.caja.y) - y0);
    const jMax = Math.min(alto - 1, Math.ceil(f.caja.y + f.caja.alto) - y0);
    for (let j = jMin; j <= jMax; j++) {
      for (let i = iMin; i <= iMax; i++) {
        if (dentroDe(poligono, x0 + i + 0.5, y0 + j + 0.5)) libre[j * ancho + i] = 0;
      }
    }
  }
  return { x0, y0, ancho, alto, libre, exterior };
}

const centroDeCelda = (m: Malla, k: number): Punto => ({
  x: m.x0 + (k % m.ancho) + 0.5,
  y: m.y0 + Math.floor(k / m.ancho) + 0.5,
});

/** Celdas de pasillo que tocan la figura: sus puertas posibles. Vacío si no toca ninguno. */
export function celdasDePuerta(m: Malla, f: FiguraPlano2D): number[] {
  const celdas: number[] = [];
  const iMin = Math.max(0, Math.floor(f.caja.x) - m.x0 - 2);
  const iMax = Math.min(m.ancho - 1, Math.ceil(f.caja.x + f.caja.ancho) - m.x0 + 2);
  const jMin = Math.max(0, Math.floor(f.caja.y) - m.y0 - 2);
  const jMax = Math.min(m.alto - 1, Math.ceil(f.caja.y + f.caja.alto) - m.y0 + 2);
  const poligono = poligonoDe(f);
  for (let j = jMin; j <= jMax; j++) {
    for (let i = iMin; i <= iMax; i++) {
      const k = j * m.ancho + i;
      if (!m.libre[k]) continue;
      const cx = m.x0 + i + 0.5;
      const cy = m.y0 + j + 0.5;
      if (f.rect) {
        const dx = Math.max(f.rect.x - cx, 0, cx - (f.rect.x + f.rect.ancho));
        const dy = Math.max(f.rect.y - cy, 0, cy - (f.rect.y + f.rect.alto));
        if (Math.hypot(dx, dy) <= ALCANCE_PUERTA) celdas.push(k);
      } else if (poligono && distanciaAlBorde(poligono, cx, cy) <= ALCANCE_PUERTA) {
        celdas.push(k);
      }
    }
  }
  return celdas;
}

function distanciaAlBorde(poligono: number[][], x: number, y: number): number {
  let mejor = Infinity;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [ax, ay] = poligono[j];
    const [bx, by] = poligono[i];
    const dx = bx - ax;
    const dy = by - ay;
    const largo2 = dx * dx + dy * dy;
    const t = largo2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / largo2));
    mejor = Math.min(mejor, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
  }
  return mejor;
}

// --- Camino más corto ---------------------------------------------------------------------------

const VECINOS: [number, number, number][] = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
];

/** Cola de prioridad mínima (montículo binario) de celdas por distancia. */
class Cola {
  private distancias: number[] = [];
  private celdas: number[] = [];

  get vacia() {
    return this.celdas.length === 0;
  }

  meter(distancia: number, celda: number) {
    let i = this.celdas.length;
    this.distancias.push(distancia);
    this.celdas.push(celda);
    while (i > 0) {
      const padre = (i - 1) >> 1;
      if (this.distancias[padre] <= distancia) break;
      this.distancias[i] = this.distancias[padre];
      this.celdas[i] = this.celdas[padre];
      i = padre;
    }
    this.distancias[i] = distancia;
    this.celdas[i] = celda;
  }

  sacar(): [number, number] {
    const resultado: [number, number] = [this.distancias[0], this.celdas[0]];
    const distancia = this.distancias.pop() as number;
    const celda = this.celdas.pop() as number;
    const n = this.celdas.length;
    if (n > 0) {
      let i = 0;
      for (;;) {
        let hijo = 2 * i + 1;
        if (hijo >= n) break;
        if (hijo + 1 < n && this.distancias[hijo + 1] < this.distancias[hijo]) hijo++;
        if (this.distancias[hijo] >= distancia) break;
        this.distancias[i] = this.distancias[hijo];
        this.celdas[i] = this.celdas[hijo];
        i = hijo;
      }
      this.distancias[i] = distancia;
      this.celdas[i] = celda;
    }
    return resultado;
  }
}

interface Resultado {
  distancia: Float64Array;
  anterior: Int32Array;
  /** Celda en la que se detuvo la búsqueda, si se pidieron destinos. */
  llegada: number;
}

function dijkstra(m: Malla, origenes: number[], destinos?: Set<number>): Resultado {
  const n = m.ancho * m.alto;
  const distancia = new Float64Array(n).fill(Infinity);
  const anterior = new Int32Array(n).fill(-1);
  const cola = new Cola();
  for (const o of origenes) {
    if (!m.libre[o]) continue;
    distancia[o] = 0;
    cola.meter(0, o);
  }
  let llegada = -1;
  while (!cola.vacia) {
    const [d, k] = cola.sacar();
    if (d > distancia[k]) continue;
    if (destinos?.has(k)) {
      llegada = k;
      break;
    }
    const i = k % m.ancho;
    const j = (k - i) / m.ancho;
    for (const [di, dj, costo] of VECINOS) {
      const ni = i + di;
      const nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= m.ancho || nj >= m.alto) continue;
      const nk = nj * m.ancho + ni;
      if (!m.libre[nk]) continue;
      // En diagonal no se corta una esquina: las dos celdas laterales también deben estar libres.
      if (di !== 0 && dj !== 0 && (!m.libre[j * m.ancho + ni] || !m.libre[nj * m.ancho + i]))
        continue;
      const nd = d + costo * (m.exterior?.[nk] ? PENALIZACION_EXTERIOR : 1);
      if (nd < distancia[nk]) {
        distancia[nk] = nd;
        anterior[nk] = k;
        cola.meter(nd, nk);
      }
    }
  }
  return { distancia, anterior, llegada };
}

/** Distancia (unidades del plano) de cada celda al origen más cercano; `Infinity` si no se llega. */
export function distanciasDesde(m: Malla, origenes: number[]): Float64Array {
  return dijkstra(m, origenes).distancia;
}

/** Distancia mínima a un grupo de celdas, dado el resultado de `distanciasDesde`. */
export function distanciaMinima(distancias: Float64Array, celdas: number[]): number {
  let mejor = Infinity;
  for (const k of celdas) mejor = Math.min(mejor, distancias[k]);
  return mejor;
}

export interface Recorrido {
  /** Quiebres del recorrido, de la puerta de origen a la de destino. */
  puntos: Punto[];
  /** Longitud en unidades del plano. */
  largo: number;
}

/** ¿Se puede ir en línea recta de `a` a `b` sin salir del pasillo? */
function lineaLibre(m: Malla, a: Punto, b: Punto): boolean {
  const pasos = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.5));
  for (let s = 0; s <= pasos; s++) {
    const x = a.x + ((b.x - a.x) * s) / pasos;
    const y = a.y + ((b.y - a.y) * s) / pasos;
    const i = Math.floor(x) - m.x0;
    const j = Math.floor(y) - m.y0;
    if (i < 0 || j < 0 || i >= m.ancho || j >= m.alto || !m.libre[j * m.ancho + i]) return false;
  }
  return true;
}

/** Deja solo los puntos donde el camino cambia de dirección. */
function quitarRectas(puntos: Punto[]): Punto[] {
  if (puntos.length <= 2) return puntos;
  const salida: Punto[] = [puntos[0]];
  for (let k = 1; k < puntos.length - 1; k++) {
    const a = puntos[k - 1];
    const b = puntos[k];
    const c = puntos[k + 1];
    if ((b.x - a.x) * (c.y - b.y) !== (b.y - a.y) * (c.x - b.x)) salida.push(b);
  }
  salida.push(puntos[puntos.length - 1]);
  return salida;
}

/** Quita los quiebres que sobran: de cada punto va al más lejano que se ve en línea recta. */
function suavizar(m: Malla, trayecto: Punto[]): Punto[] {
  const puntos = quitarRectas(trayecto);
  if (puntos.length <= 2) return puntos;
  const salida: Punto[] = [puntos[0]];
  let actual = 0;
  while (actual < puntos.length - 1) {
    let lejano = actual + 1;
    for (let k = puntos.length - 1; k > actual + 1; k--) {
      if (lineaLibre(m, puntos[actual], puntos[k])) {
        lejano = k;
        break;
      }
    }
    salida.push(puntos[lejano]);
    actual = lejano;
  }
  return salida;
}

/** Camino más corto entre dos grupos de celdas, o `null` si no están conectados. */
export function recorridoEntre(m: Malla, desde: number[], hasta: number[]): Recorrido | null {
  if (desde.length === 0 || hasta.length === 0) return null;
  const { distancia, anterior, llegada } = dijkstra(m, desde, new Set(hasta));
  if (llegada < 0) return null;
  const celdas: number[] = [];
  for (let k = llegada; k >= 0; k = anterior[k]) celdas.push(k);
  celdas.reverse();
  return {
    puntos: suavizar(
      m,
      celdas.map((k) => centroDeCelda(m, k)),
    ),
    largo: distancia[llegada],
  };
}

// --- Contigüidad --------------------------------------------------------------------------------

/** Dos figuras comparten pared si sus lados se tocan (con esta holgura) a lo largo de este tramo. */
const HOLGURA_PARED = 1;
const TRAMO_MINIMO_PARED = 5;

const CLASES_RESERVABLES = new Set(['aula', 'laboratorio']);

/**
 * Pares de aulas y laboratorios de un piso que comparten pared. Un espacio y otro separados por un
 * pasillo (o por una escalera, un baño…) no son contiguos. Solo considera figuras rectangulares.
 */
export function parejasContiguas(figuras: FiguraPlano2D[]): [string, string][] {
  const rects = figuras.filter((f) => CLASES_RESERVABLES.has(f.clase) && f.rect);
  const parejas: [string, string][] = [];
  for (let a = 0; a < rects.length; a++) {
    for (let b = a + 1; b < rects.length; b++) {
      const r = rects[a].rect!;
      const s = rects[b].rect!;
      const solapeX = Math.min(r.x + r.ancho, s.x + s.ancho) - Math.max(r.x, s.x);
      const solapeY = Math.min(r.y + r.alto, s.y + s.alto) - Math.max(r.y, s.y);
      const tocaLados =
        Math.abs(r.x + r.ancho - s.x) <= HOLGURA_PARED ||
        Math.abs(s.x + s.ancho - r.x) <= HOLGURA_PARED;
      const tocaFilas =
        Math.abs(r.y + r.alto - s.y) <= HOLGURA_PARED ||
        Math.abs(s.y + s.alto - r.y) <= HOLGURA_PARED;
      if (
        (tocaLados && solapeY >= TRAMO_MINIMO_PARED) ||
        (tocaFilas && solapeX >= TRAMO_MINIMO_PARED)
      ) {
        parejas.push([rects[a].id, rects[b].id]);
      }
    }
  }
  return parejas;
}

// --- Ascensor -----------------------------------------------------------------------------------

/**
 * Distancia caminando de cada aula y laboratorio al ascensor de su pabellón en el mismo piso
 * (unidades del plano, redondeadas). Los espacios sin ascensor en su pabellón, o sin pasillo
 * conectado, no aparecen. El pabellón sale del prefijo del id (`NUE`, `ANT`).
 */
export function distanciasAlAscensor(plano: Plano2D): Map<string, number> {
  const resultado = new Map<string, number>();
  const m = crearMalla(plano);
  if (!m) return resultado;
  const prefijos = new Set(
    plano.figuras.filter((f) => f.clase === 'ascensor').map((f) => f.id.slice(0, 3)),
  );
  for (const prefijo of prefijos) {
    const accesos = plano.figuras
      .filter((f) => f.clase === 'ascensor' && f.id.startsWith(prefijo))
      .flatMap((f) => celdasDePuerta(m, f));
    const distancias = distanciasDesde(m, accesos);
    for (const f of plano.figuras) {
      if (!CLASES_RESERVABLES.has(f.clase) || !f.id.startsWith(prefijo)) continue;
      const d = distanciaMinima(distancias, celdasDePuerta(m, f));
      if (Number.isFinite(d)) resultado.set(f.id, Math.round(d));
    }
  }
  return resultado;
}

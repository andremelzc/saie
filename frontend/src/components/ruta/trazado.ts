import type { TrazoPiso } from '../mapa2d/capaRuta';
import { ENTRADA_PRINCIPAL, PUERTA_AL_PATIO } from '../mapa2d/entradas';
import { indiceFiguras, type EntradaIndice } from '../mapa2d/indice';
import {
  celdasDePuerta,
  crearMalla,
  distanciasDesde,
  distanciaMinima,
  recorridoEntre,
  type Malla,
} from '../mapa2d/pasillos';
import {
  centroDe,
  leerPlano2D,
  pabellonDe,
  type FiguraPlano2D,
  type Pabellon,
  type Plano2D,
  type Punto,
} from '../mapa2d/plano';
import type { RutaReferencia, TramoRuta } from './tipos';

/** De dónde sale la persona: la entrada principal de la facultad o un espacio que elige. */
export type OrigenRuta = { tipo: 'entrada' } | { tipo: 'espacio'; id: string };

export const ORIGEN_ENTRADA: OrigenRuta = { tipo: 'entrada' };

/** El patio y sus puertas están en la planta baja. */
const PISO_DEL_PATIO = 1;

const NOMBRE_PABELLON: Record<Pabellon, string> = { ANT: 'antiguo', NUE: 'nuevo' };

/**
 * Lo que «cuesta» cambiar de piso, en las mismas unidades que las distancias del plano (que no
 * tienen escala): una escalera es un trecho corto; el ascensor, mientras espera, más, salvo que
 * sea la única opción accesible.
 */
const COSTO_PISO_ESCALERA = 30;
const COSTO_PISO_ASCENSOR = 50;
const COSTO_PISO_ASCENSOR_ACCESIBLE = 30;

export interface PasoRuta {
  tramo: TramoRuta;
  /** Piso donde ocurre el paso. */
  piso: number;
  /** Figura del plano que hay que mostrar para este paso (puerta, escalera, aula…). */
  focoId: string | null;
}

export interface Trazado {
  capa: Record<number, TrazoPiso>;
  pasos: PasoRuta[];
  /** Ids de plano de los destinos, para resaltarlos. */
  destinos: string[];
  /** Id del primer conector (escalera o ascensor) usado, o `null` si no hay cambio de piso. */
  conector: string | null;
  /**
   * El tiempo que calculó el servidor vale para esta ruta: sale de la entrada principal y va a un
   * espacio del pabellón antiguo. Con otro punto de partida, o si hay que pasar al pabellón nuevo,
   * el servidor no lo conoce y no se muestra.
   */
  tiempoDelServidor: boolean;
}

interface PisoLeido {
  plano: Plano2D;
  malla: Malla | null;
}

/** Los planos son fijos: se leen y se les arma la malla una sola vez. */
const cachePisos = new Map<string, PisoLeido | null>();

function leerPiso(texto: string | undefined, conPatio: boolean): PisoLeido | null {
  if (!texto) return null;
  const clave = `${conPatio ? 'p' : 'c'}:${texto}`;
  if (!cachePisos.has(clave)) {
    try {
      const plano = leerPlano2D(texto);
      cachePisos.set(clave, { plano, malla: crearMalla(plano, { conPatio }) });
    } catch {
      cachePisos.set(clave, null);
    }
  }
  return cachePisos.get(clave) ?? null;
}

/** Distancias desde cada conector a todo su piso: se calculan una vez por malla y conector. */
const cacheConectores = new WeakMap<Malla, Map<string, Float64Array>>();

/** Un lugar por el que pasa la ruta, en un piso. */
interface Parada {
  piso: number;
  figura: FiguraPlano2D;
  centro: Punto;
  marca: { etiqueta: string; tipo: 'inicio' | 'cambio' | 'destino' };
  /** Paso escrito que abre esta parada, si abre uno. */
  paso?: { tipo: TramoRuta['tipo']; titulo: string; descripcion: string; accesible?: boolean };
}

function descripcionDeLugar(figura: FiguraPlano2D, piso: number): string {
  const pabellon = pabellonDe(figura.id);
  const donde = pabellon ? `pabellón ${NOMBRE_PABELLON[pabellon]}, piso ${piso}` : `piso ${piso}`;
  return `${figura.nombre || figura.id} · ${donde}.`;
}

/** Pabellón de una figura; la entrada principal es del antiguo. */
function pabellonDeFigura(figura: FiguraPlano2D): Pabellon | null {
  return figura.id === ENTRADA_PRINCIPAL ? 'ANT' : pabellonDe(figura.id);
}

/** ¿Está el punto dentro de la caja, con un margen? */
const dentroDeCaja = (p: Punto, f: FiguraPlano2D, margen: number) =>
  p.x >= f.caja.x - margen &&
  p.x <= f.caja.x + f.caja.ancho + margen &&
  p.y >= f.caja.y - margen &&
  p.y <= f.caja.y + f.caja.alto + margen;

/**
 * Puertas al patio por las que pasa un recorrido, en el orden en que las cruza. Se muestrea la
 * línea cada medio punto del plano.
 */
function puertasAlPatioCruzadas(camino: Punto[], puertas: FiguraPlano2D[]): FiguraPlano2D[] {
  const primera = new Map<string, number>();
  let recorrido = 0;
  for (let k = 0; k < camino.length - 1; k++) {
    const a = camino[k];
    const b = camino[k + 1];
    const largo = Math.hypot(b.x - a.x, b.y - a.y);
    const pasos = Math.max(1, Math.ceil(largo / 0.5));
    for (let s = 0; s <= pasos; s++) {
      const p = { x: a.x + ((b.x - a.x) * s) / pasos, y: a.y + ((b.y - a.y) * s) / pasos };
      for (const puerta of puertas) {
        if (!primera.has(puerta.id) && dentroDeCaja(p, puerta, 0.5)) {
          primera.set(puerta.id, recorrido + (largo * s) / pasos);
        }
      }
    }
    recorrido += largo;
  }
  return puertas
    .filter((p) => primera.has(p.id))
    .sort((p, q) => (primera.get(p.id) as number) - (primera.get(q.id) as number));
}

/** Escalera o ascensor: la misma figura (mismo `id`) en cada piso que sirve. */
interface Conector {
  id: string;
  clase: 'escalera' | 'ascensor';
  pisos: number[];
}

type Nodo = { piso: number; id: string };
const INICIO = 'inicio';
const FIN = 'fin';

/**
 * Dibuja una ruta de referencia sobre los planos, desde `origen` hasta el espacio asignado.
 *
 * El recorrido **sigue los pasillos** (ver `mapa2d/pasillos.ts`): el pasillo es el espacio entre
 * las aulas y las puertas dan a él. Se busca el camino más corto **entre todos los pisos y
 * pabellones**: se puede cambiar de piso por cualquier escalera o ascensor (con movilidad
 * reducida, solo por ascensor) y pasar de un pabellón a otro por el pasadizo interior o por el
 * patio de la planta baja, lo que resulte más corto (el patio cuesta algo más: es al aire libre).
 * Los pasos escritos se derivan de lo que de verdad recorre el camino. Si un piso no permite
 * calcular pasillos o no hay camino, la ruta no está disponible.
 */
export function calcularTrazado(
  ruta: RutaReferencia,
  planos: Record<number, string>,
  origen: OrigenRuta = ORIGEN_ENTRADA,
): Trazado {
  const vacio: Trazado = {
    capa: {},
    pasos: [],
    destinos: [],
    conector: null,
    tiempoDelServidor: false,
  };
  if (ruta.estado !== 'DISPONIBLE' || ruta.tramos.length === 0) return vacio;

  const indice = indiceFiguras(planos);
  const destinosTramos = ruta.tramos.filter(
    (t) => t.tipo === 'ESPACIO_ASIGNADO' && t.espacioId && indice.has(t.espacioId),
  );
  const primero: EntradaIndice | undefined = destinosTramos[0]?.espacioId
    ? indice.get(destinosTramos[0].espacioId)
    : undefined;
  if (!primero) return vacio;
  const entradaOrigen =
    origen.tipo === 'entrada' ? indice.get(ENTRADA_PRINCIPAL) : indice.get(origen.id);
  if (!entradaOrigen) return vacio;

  const pisos = Object.keys(planos)
    .map(Number)
    .sort((a, b) => a - b);
  const leido = (piso: number) => leerPiso(planos[piso], piso === PISO_DEL_PATIO);
  const mallaDe = (piso: number) => leido(piso)?.malla ?? null;
  /** La misma figura (escalera, ascensor, puerta) en el plano de otro piso. */
  const figuraEn = (piso: number, id: string) =>
    leido(piso)?.plano.figuras.find((f) => f.id === id);
  const celdasEn = (piso: number, figura: FiguraPlano2D) => {
    const malla = mallaDe(piso);
    return malla ? celdasDePuerta(malla, figura) : [];
  };

  const figuraOrigen = entradaOrigen.figura;
  const pisoOrigen = entradaOrigen.piso;
  const figuraDestino = primero.figura;
  const pisoDestino = primero.piso;
  if (figuraOrigen.id === figuraDestino.id) return vacio;

  // --- Conectores -------------------------------------------------------------------------------
  const conectores = new Map<string, Conector>();
  for (const piso of pisos) {
    for (const f of leido(piso)?.plano.figuras ?? []) {
      if (f.clase !== 'escalera' && f.clase !== 'ascensor') continue;
      const c = conectores.get(f.id) ?? { id: f.id, clase: f.clase, pisos: [] };
      c.pisos.push(piso);
      conectores.set(f.id, c);
    }
  }
  const hayAscensor = [...conectores.values()].some((c) => c.clase === 'ascensor');
  const accesible = ruta.movilidadReducida && hayAscensor;
  const permitido = (c: Conector) => !accesible || c.clase === 'ascensor';
  const costoPiso = (c: Conector) =>
    c.clase === 'escalera'
      ? COSTO_PISO_ESCALERA
      : accesible
        ? COSTO_PISO_ASCENSOR_ACCESIBLE
        : COSTO_PISO_ASCENSOR;

  const distanciasDelConector = (piso: number, id: string): Float64Array | null => {
    const malla = mallaDe(piso);
    const figura = figuraEn(piso, id);
    if (!malla || !figura) return null;
    const guardadas = cacheConectores.get(malla) ?? new Map<string, Float64Array>();
    cacheConectores.set(malla, guardadas);
    let d = guardadas.get(id);
    if (!d) {
      d = distanciasDesde(malla, celdasEn(piso, figura));
      guardadas.set(id, d);
    }
    return d;
  };
  const entreConectores = (piso: number, a: string, b: string): number => {
    const d = distanciasDelConector(piso, a);
    const fb = figuraEn(piso, b);
    return d && fb ? distanciaMinima(d, celdasEn(piso, fb)) : Infinity;
  };

  const mallaOrigen = mallaDe(pisoOrigen);
  const mallaDestino = mallaDe(pisoDestino);
  if (!mallaOrigen || !mallaDestino) return vacio;
  const desdeOrigen = distanciasDesde(mallaOrigen, celdasEn(pisoOrigen, figuraOrigen));
  const haciaDestino = distanciasDesde(mallaDestino, celdasEn(pisoDestino, figuraDestino));

  // --- Camino más corto en el grafo de conectores ----------------------------------------------
  // Nodos: (piso, conector). Aristas: caminar entre dos conectores del mismo piso, cambiar de piso
  // por el mismo conector, y los tramos de entrada y de salida. Son pocos nodos: sin cola.
  const clave = (n: Nodo) => `${n.piso}:${n.id}`;
  const nodos = new Map<string, Nodo>();
  for (const c of conectores.values()) {
    if (!permitido(c)) continue;
    for (const piso of c.pisos) nodos.set(clave({ piso, id: c.id }), { piso, id: c.id });
  }
  const costo = new Map<string, number>([[INICIO, 0]]);
  const anterior = new Map<string, string>();
  const hechos = new Set<string>();
  const relajar = (de: string, a: string, peso: number) => {
    if (!Number.isFinite(peso)) return;
    const nuevo = (costo.get(de) as number) + peso;
    if (nuevo < (costo.get(a) ?? Infinity)) {
      costo.set(a, nuevo);
      anterior.set(a, de);
    }
  };

  for (;;) {
    let actual: string | null = null;
    let mejor = Infinity;
    for (const [k, c] of costo) {
      if (!hechos.has(k) && c < mejor) {
        mejor = c;
        actual = k;
      }
    }
    if (actual === null || actual === FIN) break;
    hechos.add(actual);

    if (actual === INICIO) {
      if (pisoOrigen === pisoDestino) {
        relajar(INICIO, FIN, distanciaMinima(desdeOrigen, celdasEn(pisoOrigen, figuraDestino)));
      }
      for (const [k, n] of nodos) {
        const figura = n.piso === pisoOrigen ? figuraEn(n.piso, n.id) : undefined;
        if (figura) relajar(INICIO, k, distanciaMinima(desdeOrigen, celdasEn(n.piso, figura)));
      }
      continue;
    }

    const n = nodos.get(actual) as Nodo;
    const c = conectores.get(n.id) as Conector;
    for (const otro of c.pisos) {
      if (otro !== n.piso) {
        relajar(actual, clave({ piso: otro, id: n.id }), Math.abs(otro - n.piso) * costoPiso(c));
      }
    }
    for (const [k, m] of nodos) {
      if (m.piso === n.piso && m.id !== n.id)
        relajar(actual, k, entreConectores(n.piso, n.id, m.id));
    }
    if (n.piso === pisoDestino) {
      const figura = figuraEn(n.piso, n.id);
      if (figura) relajar(actual, FIN, distanciaMinima(haciaDestino, celdasEn(n.piso, figura)));
    }
  }
  if (!costo.has(FIN)) return vacio;

  const camino: string[] = [];
  for (let k: string | undefined = anterior.get(FIN); k && k !== INICIO; k = anterior.get(k)) {
    camino.unshift(k);
  }

  // --- Paradas ----------------------------------------------------------------------------------
  const parada = (
    piso: number,
    figura: FiguraPlano2D,
    marca: Parada['marca'],
    paso?: Parada['paso'],
  ): Parada => ({ piso, figura, centro: centroDe(figura), marca, paso });

  const paradas: Parada[] = [];
  paradas.push(
    parada(
      pisoOrigen,
      figuraOrigen,
      { etiqueta: origen.tipo === 'entrada' ? 'Entrada' : 'Estás aquí', tipo: 'inicio' },
      origen.tipo === 'entrada'
        ? {
            tipo: 'ORIGEN',
            titulo: 'Entras por la entrada principal',
            descripcion:
              'Es la única entrada a la facultad desde la calle y está en el pabellón antiguo.',
          }
        : {
            tipo: 'ORIGEN',
            titulo: 'Sales de donde estás',
            descripcion: descripcionDeLugar(figuraOrigen, pisoOrigen),
          },
    ),
  );

  // Los cambios de piso: nodos seguidos del mismo conector forman un solo cambio.
  let conectorUsado: string | null = null;
  const nodosDelCamino = camino.map((k) => nodos.get(k) as Nodo);
  for (let i = 0; i < nodosDelCamino.length;) {
    let j = i;
    while (j + 1 < nodosDelCamino.length && nodosDelCamino[j + 1].id === nodosDelCamino[i].id) j++;
    if (j > i) {
      const desde = nodosDelCamino[i];
      const hasta = nodosDelCamino[j];
      const c = conectores.get(desde.id) as Conector;
      conectorUsado ??= c.id;
      const articulo = c.clase === 'ascensor' ? 'el ascensor' : 'la escalera';
      const sube = hasta.piso > desde.piso;
      const pabellon = pabellonDe(c.id);
      paradas.push(
        parada(
          desde.piso,
          figuraEn(desde.piso, c.id) as FiguraPlano2D,
          { etiqueta: `${sube ? 'Sube' : 'Baja'} por ${articulo}`, tipo: 'cambio' },
          {
            tipo: 'CAMBIO_PISO',
            titulo: `${sube ? 'Sube' : 'Baja'} por ${articulo} al piso ${hasta.piso}`,
            descripcion:
              c.clase === 'ascensor' && accesible
                ? 'Ruta accesible: usa el ascensor.'
                : `${sube ? 'Sube' : 'Baja'} del piso ${desde.piso} al piso ${hasta.piso}${
                    pabellon ? ` del pabellón ${NOMBRE_PABELLON[pabellon]}` : ''
                  }.`,
            accesible: accesible,
          },
        ),
        parada(hasta.piso, figuraEn(hasta.piso, c.id) as FiguraPlano2D, {
          etiqueta: 'Llegas aquí',
          tipo: 'cambio',
        }),
      );
    }
    i = j + 1;
  }

  // Los espacios asignados, en el orden del servidor (un bloque de salas contiguas).
  for (const tramo of destinosTramos) {
    const entrada = indice.get(tramo.espacioId as string) as EntradaIndice;
    const figura = leido(entrada.piso)?.plano.figuras.find((f) => f.id === entrada.figura.id);
    paradas.push(
      parada(
        entrada.piso,
        figura ?? entrada.figura,
        { etiqueta: tramo.identificador ?? tramo.titulo, tipo: 'destino' },
        { tipo: 'ESPACIO_ASIGNADO', titulo: tramo.titulo, descripcion: tramo.descripcion },
      ),
    );
  }

  // --- Trazo, marcas y pasos -------------------------------------------------------------------
  const capa: Record<number, TrazoPiso> = {};
  const trazo = (piso: number): TrazoPiso => (capa[piso] ??= { puntos: [], marcas: [] });
  const pasos: PasoRuta[] = [];
  const puertasPatio = (leido(PISO_DEL_PATIO)?.plano.figuras ?? []).filter((f) =>
    Object.values(PUERTA_AL_PATIO).includes(f.id),
  );
  const pabellonDeLaPuerta = (id: string) =>
    (Object.entries(PUERTA_AL_PATIO).find(([, v]) => v === id)?.[0] ?? null) as Pabellon | null;

  const nuevoPaso = (tramo: Omit<TramoRuta, 'orden'>, piso: number, focoId: string | null) => {
    pasos.push({ tramo: { ...tramo, orden: pasos.length + 1 }, piso, focoId });
    return pasos.length;
  };

  paradas.forEach((actual, k) => {
    const previa = paradas[k - 1];
    const t = trazo(actual.piso);

    if (previa && previa.piso === actual.piso) {
      // Se camina de una parada a la siguiente por los pasillos de ese piso.
      const malla = mallaDe(actual.piso);
      const tramoCaminado = malla
        ? recorridoEntre(
            malla,
            celdasEn(actual.piso, previa.figura),
            celdasEn(actual.piso, actual.figura),
          )?.puntos
        : undefined;
      if (t.puntos.length === 0) t.puntos.push(previa.centro);
      if (tramoCaminado) t.puntos.push(...tramoCaminado);

      // ¿Pasó de un pabellón a otro? Por el patio (sus dos puertas) o por el pasadizo interior.
      const caminado = [previa.centro, ...(tramoCaminado ?? []), actual.centro];
      const puertas =
        actual.piso === PISO_DEL_PATIO ? puertasAlPatioCruzadas(caminado, puertasPatio) : [];
      const desde = pabellonDeFigura(previa.figura);
      const hasta = pabellonDeFigura(actual.figura);
      if (puertas.length >= 2) {
        const [salida, llegada] = puertas;
        const deDondeSale = pabellonDeLaPuerta(salida.id);
        const aDondeEntra = pabellonDeLaPuerta(llegada.id);
        const base = { tiempoEstimadoSegundos: 0, esAccesible: true, piso: actual.piso };
        const n1 = nuevoPaso(
          {
            ...base,
            tipo: 'PUERTA',
            titulo: 'Sal al patio',
            descripcion: `Sal del pabellón ${
              deDondeSale ? NOMBRE_PABELLON[deDondeSale] : ''
            } por su puerta al patio, en la planta baja.`,
          },
          actual.piso,
          salida.id,
        );
        t.marcas.push({
          punto: centroDe(salida),
          etiqueta: 'Sales al patio',
          numero: n1,
          tipo: 'cambio',
        });
        const n2 = nuevoPaso(
          {
            ...base,
            tipo: 'PUERTA',
            titulo: `Cruza el patio y entra al pabellón ${aDondeEntra ? NOMBRE_PABELLON[aDondeEntra] : ''}`,
            descripcion: `Cruza el patio hasta la puerta del pabellón ${
              aDondeEntra ? NOMBRE_PABELLON[aDondeEntra] : ''
            } y entra.`,
          },
          actual.piso,
          llegada.id,
        );
        t.marcas.push({
          punto: centroDe(llegada),
          etiqueta: 'Entras al pabellón',
          numero: n2,
          tipo: 'cambio',
        });
      } else if (desde && hasta && desde !== hasta) {
        nuevoPaso(
          {
            tipo: 'PUERTA',
            titulo: `Pasa al pabellón ${NOMBRE_PABELLON[hasta]} por el pasadizo`,
            descripcion: `Sigue por el pasadizo interior del piso ${actual.piso} que une los dos pabellones, sin salir al patio.`,
            tiempoEstimadoSegundos: 0,
            esAccesible: true,
            piso: actual.piso,
          },
          actual.piso,
          actual.figura.id,
        );
      }
    }
    t.puntos.push(actual.centro);

    // El número de la marca es el del paso que abre; las paradas sin paso (llegada) heredan el último.
    let numero = pasos.length;
    if (actual.paso) {
      numero = nuevoPaso(
        {
          tipo: actual.paso.tipo,
          titulo: actual.paso.titulo,
          descripcion: actual.paso.descripcion,
          tiempoEstimadoSegundos: 0,
          esAccesible: actual.paso.accesible ?? true,
          espacioId: actual.marca.tipo === 'destino' ? actual.figura.id : undefined,
          piso: actual.piso,
        },
        actual.piso,
        actual.figura.id,
      );
    }
    t.marcas.push({
      punto: actual.centro,
      etiqueta: actual.marca.etiqueta,
      numero: Math.max(1, numero),
      tipo: actual.marca.tipo,
    });
  });

  const pabellonOrigen = pabellonDeFigura(figuraOrigen);
  const pabellonDestino = pabellonDeFigura(figuraDestino);
  return {
    capa,
    pasos,
    destinos: destinosTramos.map((t) => t.espacioId as string),
    conector: conectorUsado,
    tiempoDelServidor:
      origen.tipo === 'entrada' && pabellonOrigen === pabellonDestino && pabellonDestino === 'ANT',
  };
}

/** «3 min 15 s», «45 s» o «2 min». */
export function formatearDuracion(segundos: number): string {
  const total = Math.max(0, Math.round(segundos));
  const min = Math.floor(total / 60);
  const seg = total % 60;
  if (min === 0) return `${seg} s`;
  return seg === 0 ? `${min} min` : `${min} min ${seg} s`;
}

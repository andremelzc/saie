import type { TrazoPiso } from '../mapa2d/capaRuta';
import { ENTRADA_PABELLON } from '../mapa2d/entradas';
import { indiceFiguras, type EntradaIndice } from '../mapa2d/indice';
import {
  celdasDePuerta,
  crearMalla,
  distanciaMinima,
  distanciasDesde,
  recorridoEntre,
  type Malla,
} from '../mapa2d/pasillos';
import { centroDe, leerPlano2D, pabellonDe, type Plano2D, type Punto } from '../mapa2d/plano';
import type { RutaReferencia, TramoRuta } from './tipos';

export interface PasoRuta {
  tramo: TramoRuta;
  /** Piso donde ocurre el paso. */
  piso: number;
  /** Figura del plano que hay que mostrar para este paso (entrada, escalera o aula). */
  focoId: string | null;
}

export interface Trazado {
  capa: Record<number, TrazoPiso>;
  pasos: PasoRuta[];
  /** Ids de plano de los destinos, para resaltarlos. */
  destinos: string[];
  /** Id del conector (escalera o ascensor) elegido, o `null` si no hay cambio de piso. */
  conector: string | null;
}

const distancia = (a: Punto, b: Punto) => Math.hypot(a.x - b.x, a.y - b.y);

interface PisoLeido {
  plano: Plano2D;
  malla: Malla | null;
}

/** Los planos son fijos: se leen y se les arma la malla una sola vez. */
const cachePisos = new Map<string, PisoLeido | null>();

function leerPiso(texto: string | undefined): PisoLeido | null {
  if (!texto) return null;
  if (!cachePisos.has(texto)) {
    try {
      const plano = leerPlano2D(texto);
      cachePisos.set(texto, { plano, malla: crearMalla(plano) });
    } catch {
      cachePisos.set(texto, null);
    }
  }
  return cachePisos.get(texto) ?? null;
}

/**
 * Dibuja una ruta de referencia sobre los planos: de la entrada del pabellón (piso 1) a la
 * escalera o el ascensor, y de ahí a cada sala. El recorrido **sigue los pasillos**: el pasillo es
 * el espacio entre las aulas y las puertas dan a él (ver `mapa2d/pasillos.ts`). La escalera o el
 * ascensor se elige por el trayecto completo caminando, no por cercanía en línea recta. Si un
 * plano no permite calcular pasillos, el recorrido cae a líneas rectas entre puntos de referencia.
 * Con movilidad reducida usa el ascensor.
 */
export function calcularTrazado(ruta: RutaReferencia, planos: Record<number, string>): Trazado {
  const vacio: Trazado = { capa: {}, pasos: [], destinos: [], conector: null };
  if (ruta.estado !== 'DISPONIBLE' || ruta.tramos.length === 0) return vacio;

  const indice = indiceFiguras(planos);
  const destinosTramos = ruta.tramos.filter(
    (t) => t.tipo === 'ESPACIO_ASIGNADO' && t.espacioId && indice.has(t.espacioId),
  );
  const primero: EntradaIndice | undefined = destinosTramos[0]?.espacioId
    ? indice.get(destinosTramos[0].espacioId)
    : undefined;
  if (!primero) return vacio;

  const pabellon = pabellonDe(primero.figura.id);
  const entradaFigura = pabellon ? indice.get(ENTRADA_PABELLON[pabellon]) : undefined;
  if (!pabellon || !entradaFigura) return vacio;

  const entrada = centroDe(entradaFigura.figura);
  const piso1 = entradaFigura.piso;
  const pisoDestino = primero.piso;
  const destinoCentro = centroDe(primero.figura);

  const leido1 = leerPiso(planos[piso1]);
  const leidoDestino = leerPiso(planos[pisoDestino]);
  const malla1 = leido1?.malla ?? null;
  const mallaDestino = leidoDestino?.malla ?? null;
  const figuraEn = (leido: PisoLeido | null, id: string) =>
    leido?.plano.figuras.find((f) => f.id === id);

  const puertasEntrada = malla1 ? celdasDePuerta(malla1, entradaFigura.figura) : [];
  const puertasDestino = mallaDestino ? celdasDePuerta(mallaDestino, primero.figura) : [];

  const capa: Record<number, TrazoPiso> = {};
  const trazo = (piso: number): TrazoPiso => (capa[piso] ??= { puntos: [], marcas: [] });
  const pasos: PasoRuta[] = [];

  // Conector: el del tipo pedido (escalera o ascensor) del mismo pabellón.
  let conector: EntradaIndice | undefined;
  let caminoAlConector: Punto[] = [];
  let caminoDelConector: Punto[] = [];
  if (pisoDestino !== piso1) {
    const clasePreferida = ruta.movilidadReducida ? 'ascensor' : 'escalera';
    const candidatos = [...indice.values()].filter(
      (e) =>
        pabellonDe(e.figura.id) === pabellon &&
        (e.figura.clase === 'escalera' || e.figura.clase === 'ascensor'),
    );
    const delTipo = candidatos.filter((e) => e.figura.clase === clasePreferida);
    const elegibles = delTipo.length > 0 ? delTipo : candidatos;

    // Por pasillos: gana el que da el menor trayecto entrada → conector → aula.
    if (malla1 && mallaDestino && puertasEntrada.length > 0 && puertasDestino.length > 0) {
      const desdeEntrada = distanciasDesde(malla1, puertasEntrada);
      const hastaDestino = distanciasDesde(mallaDestino, puertasDestino);
      let mejor = Infinity;
      for (const e of elegibles) {
        const abajo = figuraEn(leido1, e.figura.id);
        const arriba = figuraEn(leidoDestino, e.figura.id);
        if (!abajo || !arriba) continue;
        const total =
          distanciaMinima(desdeEntrada, celdasDePuerta(malla1, abajo)) +
          distanciaMinima(hastaDestino, celdasDePuerta(mallaDestino, arriba));
        if (total < mejor) {
          mejor = total;
          conector = e;
        }
      }
      if (conector) {
        const abajo = figuraEn(leido1, conector.figura.id);
        const arriba = figuraEn(leidoDestino, conector.figura.id);
        if (abajo && arriba) {
          caminoAlConector =
            recorridoEntre(malla1, puertasEntrada, celdasDePuerta(malla1, abajo))?.puntos ?? [];
          caminoDelConector =
            recorridoEntre(mallaDestino, celdasDePuerta(mallaDestino, arriba), puertasDestino)
              ?.puntos ?? [];
        }
      }
    }

    // Sin pasillos calculables: el más cercano al destino en línea recta.
    if (!conector) {
      elegibles.sort(
        (a, b) =>
          distancia(centroDe(a.figura), destinoCentro) -
          distancia(centroDe(b.figura), destinoCentro),
      );
      conector = elegibles[0];
    }
  }
  const conectorCentro = conector ? centroDe(conector.figura) : null;
  const articuloConector = conector?.figura.clase === 'ascensor' ? 'el ascensor' : 'la escalera';

  // Último espacio dibujado en el piso de destino, para encadenar un bloque de salas contiguas.
  let anterior: ReturnType<typeof figuraEn>;

  for (const tramo of ruta.tramos) {
    if (tramo.tipo === 'ENTRADA_PABELLON') {
      trazo(piso1).puntos.push(entrada);
      trazo(piso1).marcas.push({
        punto: entrada,
        etiqueta: 'Entrada',
        numero: tramo.orden,
        tipo: 'inicio',
      });
      pasos.push({ tramo, piso: piso1, focoId: ENTRADA_PABELLON[pabellon] });
    } else if (tramo.tipo === 'CAMBIO_PISO' && conectorCentro && conector) {
      trazo(piso1).puntos.push(...caminoAlConector, conectorCentro);
      trazo(piso1).marcas.push({
        punto: conectorCentro,
        etiqueta: `Sube por ${articuloConector}`,
        numero: tramo.orden,
        tipo: 'cambio',
      });
      trazo(pisoDestino).puntos.push(conectorCentro, ...caminoDelConector);
      trazo(pisoDestino).marcas.push({
        punto: conectorCentro,
        etiqueta: 'Llegas aquí',
        numero: tramo.orden,
        tipo: 'cambio',
      });
      pasos.push({ tramo, piso: piso1, focoId: conector.figura.id });
    } else if (tramo.tipo === 'ESPACIO_ASIGNADO' && tramo.espacioId && indice.has(tramo.espacioId)) {
      const figura = (indice.get(tramo.espacioId) as EntradaIndice).figura;
      const centro = centroDe(figura);
      const t = trazo(pisoDestino);
      const figuraPiso = figuraEn(leidoDestino, figura.id) ?? figura;
      if (!anterior && pisoDestino === piso1) {
        // Mismo piso que la entrada: de la entrada a la puerta del aula.
        if (t.puntos.length === 0) t.puntos.push(entrada);
        if (malla1) {
          t.puntos.push(
            ...(recorridoEntre(malla1, puertasEntrada, celdasDePuerta(malla1, figuraPiso))
              ?.puntos ?? []),
          );
        }
      } else if (anterior && mallaDestino) {
        // Siguiente sala del bloque: de la puerta de la anterior a la de esta.
        t.puntos.push(
          ...(recorridoEntre(
            mallaDestino,
            celdasDePuerta(mallaDestino, anterior),
            celdasDePuerta(mallaDestino, figuraPiso),
          )?.puntos ?? []),
        );
      }
      t.puntos.push(centro);
      t.marcas.push({
        punto: centro,
        etiqueta: tramo.identificador ?? tramo.titulo,
        numero: tramo.orden,
        tipo: 'destino',
      });
      pasos.push({ tramo, piso: pisoDestino, focoId: tramo.espacioId });
      anterior = figuraPiso;
    } else {
      pasos.push({ tramo, piso: tramo.piso ?? piso1, focoId: null });
    }
  }

  return {
    capa,
    pasos,
    destinos: destinosTramos.map((t) => t.espacioId as string),
    conector: conector?.figura.id ?? null,
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

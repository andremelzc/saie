import type { TrazoPiso } from '../mapa2d/capaRuta';
import { ENTRADA_PABELLON } from '../mapa2d/entradas';
import { indiceFiguras, type EntradaIndice } from '../mapa2d/indice';
import { centroDe, pabellonDe, type Punto } from '../mapa2d/plano';
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

/**
 * Dibuja una ruta de referencia sobre los planos: de la entrada del pabellón (piso 1) a la
 * escalera o el ascensor más cercano al destino, y de ahí a cada sala. Es un recorrido
 * esquemático en línea recta entre puntos de referencia, no un cálculo de pasillos; el backend
 * tampoco entrega coordenadas. Con movilidad reducida usa el ascensor.
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

  const capa: Record<number, TrazoPiso> = {};
  const trazo = (piso: number): TrazoPiso => (capa[piso] ??= { puntos: [], marcas: [] });
  const pasos: PasoRuta[] = [];

  // Conector: el del tipo pedido más cercano al destino, dentro del mismo pabellón.
  let conector: EntradaIndice | undefined;
  if (pisoDestino !== piso1) {
    const clasePreferida = ruta.movilidadReducida ? 'ascensor' : 'escalera';
    const candidatos = [...indice.values()].filter(
      (e) =>
        pabellonDe(e.figura.id) === pabellon &&
        (e.figura.clase === 'escalera' || e.figura.clase === 'ascensor'),
    );
    const delTipo = candidatos.filter((e) => e.figura.clase === clasePreferida);
    const elegibles = delTipo.length > 0 ? delTipo : candidatos;
    elegibles.sort(
      (a, b) =>
        distancia(centroDe(a.figura), destinoCentro) - distancia(centroDe(b.figura), destinoCentro),
    );
    conector = elegibles[0];
  }
  const conectorCentro = conector ? centroDe(conector.figura) : null;
  const articuloConector = conector?.figura.clase === 'ascensor' ? 'el ascensor' : 'la escalera';

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
      trazo(piso1).puntos.push(conectorCentro);
      trazo(piso1).marcas.push({
        punto: conectorCentro,
        etiqueta: `Sube por ${articuloConector}`,
        numero: tramo.orden,
        tipo: 'cambio',
      });
      trazo(pisoDestino).puntos.push(conectorCentro);
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
      if (t.puntos.length === 0 && pisoDestino === piso1) t.puntos.push(entrada);
      t.puntos.push(centro);
      t.marcas.push({
        punto: centro,
        etiqueta: tramo.identificador ?? tramo.titulo,
        numero: tramo.orden,
        tipo: 'destino',
      });
      pasos.push({ tramo, piso: pisoDestino, focoId: tramo.espacioId });
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

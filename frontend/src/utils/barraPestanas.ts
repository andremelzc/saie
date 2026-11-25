import type { Pestana } from './admin';

/**
 * Qué pestañas se mandan a «Más» para que la barra quepa en el ancho que tenga: de las últimas
 * secundarias a las últimas principales, sin tocar nunca la primera (Inicio). `anchos` son los
 * anchos naturales de cada pestaña; `anchoMas` reserva el botón «Más»; `espacio` es la separación.
 */
export function pestanasQueNoCaben(
  pestanas: Pick<Pestana, 'to' | 'secundaria'>[],
  anchos: number[],
  disponible: number,
  anchoMas: number,
  espacio: number,
): Set<string> {
  const ocultas = new Set<string>();
  const medidas = anchos.reduce((suma, a) => suma + a, 0);
  if (disponible <= 0 || medidas <= 0) return ocultas;

  const ancho = (visibles: number, suma: number, conMas: boolean) =>
    suma + espacio * (visibles - 1) + (conMas ? espacio + anchoMas : 0);
  if (ancho(pestanas.length, medidas, false) <= disponible) return ocultas;

  const indices = pestanas.map((_, i) => i).filter((i) => i > 0);
  const ordenDeBaja = [
    ...indices.filter((i) => pestanas[i].secundaria).reverse(),
    ...indices.filter((i) => !pestanas[i].secundaria).reverse(),
  ];
  let suma = medidas;
  let visibles = pestanas.length;
  for (const i of ordenDeBaja) {
    ocultas.add(pestanas[i].to);
    suma -= anchos[i];
    visibles -= 1;
    if (ancho(visibles, suma, true) <= disponible) break;
  }
  return ocultas;
}

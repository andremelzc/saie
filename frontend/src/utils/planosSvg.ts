import plano1 from '@planos/piso-1.svg?raw';
import plano2 from '@planos/piso-2.svg?raw';
import plano3 from '@planos/piso-3.svg?raw';

/** Texto de los planos SVG de `assets/planos`, por piso. */
export const PLANOS_SVG: Record<number, string> = { 1: plano1, 2: plano2, 3: plano3 };

const cacheIds = new Map<number, Set<string>>();

/** Ids de las figuras de un piso (los espacios que realmente existen en el plano). */
export function idsDelPlano(piso: number): Set<string> {
  let ids = cacheIds.get(piso);
  if (!ids) {
    const texto = PLANOS_SVG[piso] ?? '';
    ids = new Set([...texto.matchAll(/\sid="([A-Z]{3}-[^"]+)"/g)].map((m) => m[1]));
    cacheIds.set(piso, ids);
  }
  return ids;
}

const PATRON_OCUPADO =
  '<defs><pattern id="saie-ocupado" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
  '<rect width="7" height="7" fill="#E3E8EE"/><line x1="0" y1="0" x2="0" y2="7" stroke="#8A97A8" stroke-width="2.4"/></pattern></defs>';

/**
 * Prepara el SVG del plano para incrustarlo: acota sus reglas CSS a `.plano2d` (para que no
 * afecten al resto de la página) y le agrega el rayado del estado «ocupado».
 */
export function prepararSvg(texto: string): string {
  const acotado = texto.replace(
    /(<style[^>]*>)([\s\S]*?)(<\/style>)/,
    (_todo, abre: string, css: string, cierra: string) => {
      const reglas = css.replace(/(^|})(\s*)([^\s{}][^{}]*)\{/g,
        (_m, previo: string, espacio: string, selectores: string) => {
          const lista = selectores
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) => (s === ':root' ? '.plano2d' : `.plano2d ${s}`));
          return `${previo}${espacio}${lista.join(', ')} {`;
        },
      );
      return `${abre}${reglas}${cierra}`;
    },
  );
  return acotado.replace(/<svg\b[^>]*>/, (apertura) => `${apertura}${PATRON_OCUPADO}`);
}

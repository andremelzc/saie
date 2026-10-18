/**
 * Enlace entre un espacio de la base de datos y su figura en el plano SVG.
 * Regla (docs/specs/07-ui-ux-y-activos.md §2.3): id del plano = prefijo(pabellón) + "-" + código,
 * p. ej. `NUE-101`. Si el identificador ya viene con ese formato, se usa tal cual.
 */
import { idsDelPlano } from './planosSvg';

const PREFIJOS_PABELLON: { patron: RegExp; prefijo: string }[] = [
  { patron: /nuev/, prefijo: 'NUE' },
  { patron: /antig/, prefijo: 'ANT' },
];

function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function idDePlano(pabellon: string, identificador: string): string {
  const limpio = identificador.trim();
  if (/^[A-Za-z]{3}-\S+/.test(limpio)) return limpio.toUpperCase().slice(0, 3) + limpio.slice(3);

  const nombre = sinTildes(pabellon);
  const prefijo = PREFIJOS_PABELLON.find((p) => p.patron.test(nombre))?.prefijo;
  const codigo = limpio.split(/\s+/).pop() ?? limpio;
  return prefijo ? `${prefijo}-${codigo}` : limpio;
}

const sinRelleno = (n: string) => n.replace(/^0+(?=\d)/, '');

/**
 * Como `idDePlano`, pero comprobando contra las figuras que existen en el plano de ese piso.
 * Además de `NUE-101`, reconoce los laboratorios dibujados como `NUE-lab-06` o
 * `ANT-laboratorio-1` cuando el backend los llama «Lab 06», «Laboratorio 6» o «L-06».
 * Si ninguna coincide, devuelve el id por regla (la lista de espacios sigue funcionando).
 */
export function resolverIdPlano(pabellon: string, identificador: string, piso: number): string {
  const ids = idsDelPlano(piso);
  const porRegla = idDePlano(pabellon, identificador);
  if (ids.has(porRegla)) return porRegla;

  const prefijo = /^[A-Z]{3}(?=-)/.exec(porRegla)?.[0];
  const numero = /(\d+)$/.exec(identificador.trim())?.[1];
  if (!prefijo || !numero) return porRegla;

  const esLab = /\bl(ab|aboratorio)?\b|^l-/i.test(sinTildes(identificador));
  const candidatos = esLab
    ? [
        `${prefijo}-lab-${numero.padStart(2, '0')}`,
        `${prefijo}-lab-${sinRelleno(numero)}`,
        `${prefijo}-laboratorio-${sinRelleno(numero)}`,
      ]
    : [];
  return candidatos.find((c) => ids.has(c)) ?? porRegla;
}

/** Pisos de los que hay plano en assets/planos. */
export const PISOS_CON_PLANO = [1, 2, 3] as const;

/** Segundos → "3 min" o "45 s" para los tiempos de caminata. */
export function formatearDuracion(segundos: number): string {
  if (segundos < 60) return `${Math.max(1, Math.round(segundos))} s`;
  return `${Math.round(segundos / 60)} min`;
}

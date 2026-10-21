/**
 * Helpers de pruebas para el catálogo de software (Issue 4.28).
 *
 * El motor ya no recibe texto libre: recibe `{ nombre, nombreNormalizado, version }`. Estos
 * helpers permiten escribir los fixtures como textos (`'Python 3.12'`) y obtener la entrada
 * real, sin repetir el parseo en cada archivo.
 */

import { ComparacionVersion } from '@prisma/client';
import { parsearNombreVersion } from '../../src/lib/software';
import { SoftwareInstaladoInput, SoftwareRequeridoInput } from '../../src/types/software';

/** `'Python 3.12'` → `{ nombre: 'Python', version: '3.12', nombreNormalizado: 'python' }`. */
export function softwareInstalado(texto: string): SoftwareInstaladoInput {
  const parseado = parsearNombreVersion(texto);
  return {
    nombre: parseado.nombre,
    nombreNormalizado: parseado.nombreNormalizado,
    version: parseado.version,
  };
}

/** Igual que `softwareInstalado`, para listas. */
export function listaSoftwareInstalado(textos: readonly string[]): SoftwareInstaladoInput[] {
  return textos.map(softwareInstalado);
}

/**
 * Requerimiento con la regla por defecto del importador: `EXACTA` si el texto declara versión y
 * `CUALQUIERA` si solo indica el nombre. `regla` fuerza otra comparación (`MINIMA`).
 */
export function softwareRequerido(
  texto: string,
  regla?: ComparacionVersion,
): SoftwareRequeridoInput {
  const base = softwareInstalado(texto);
  return {
    ...base,
    comparacionVersion:
      regla ?? (base.version === '' ? ComparacionVersion.CUALQUIERA : ComparacionVersion.EXACTA),
  };
}

/** Igual que `softwareRequerido`, para listas. */
export function listaSoftwareRequerido(
  textos: readonly string[],
  regla?: ComparacionVersion,
): SoftwareRequeridoInput[] {
  return textos.map((texto) => softwareRequerido(texto, regla));
}

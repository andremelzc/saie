/**
 * Utilidades del catálogo de software (Spec 08 / Issue 4.27).
 *
 * El software vivía como texto libre (`"Python 3.12"`). El backfill necesita separar el nombre
 * de la versión, y el motor (Issue 4.28) necesita saber si una versión se puede comparar por
 * segmentos numéricos.
 */

import { normalizarNombreSoftware } from '../rules/validarSoftware';

export type MotivoAmbiguedad =
  /** La versión detectada tiene segmentos no numéricos (`R2023b`): solo admite CUALQUIERA/EXACTA. */
  | 'VERSION_NO_NUMERICA'
  /** El texto contiene dígitos pero no se reconoció una versión al final. */
  | 'DIGITOS_SIN_VERSION'
  /** El nombre resultante no tiene letras (`"123 456"`): probablemente el texto está mal escrito. */
  | 'NOMBRE_NO_ALFABETICO';

export interface SoftwareParseado {
  /** Nombre visible, sin la versión detectada. */
  nombre: string;
  /** Versión detectada; `""` si el texto no termina en un patrón de versión. */
  version: string;
  /** Clave de comparación del motor (`trim`, minúsculas, espacios colapsados). */
  nombreNormalizado: string;
  /** Casos que conviene revisar a mano; vacío si el texto no es ambiguo. */
  motivos: MotivoAmbiguedad[];
}

/**
 * Indica si una versión se compara por segmentos numéricos separados por `.` (`3.9 < 3.11`).
 * La cadena vacía ("sin versión") se considera comparable; una versión alfabética (`R2023b`)
 * no lo es y, por tanto, no puede exigirse con `MINIMA` (Spec 08, §3).
 */
export function esVersionNumerica(version: string): boolean {
  return version === '' || /^\d+(?:\.\d+)*$/.test(version);
}

/**
 * Separa nombre y versión de un texto libre. La versión es el último token cuando contiene al
 * menos un dígito y solo usa caracteres de versión (`A-Z a-z 0-9 . _ + -`):
 *
 * - `"JDK 21"` → `JDK` / `21`
 * - `"Python 3.12"` → `Python` / `3.12`
 * - `"MATLAB R2023b"` → `MATLAB` / `R2023b` (ambigua: versión no numérica)
 * - `"Node.js"` → `Node.js` / `""` (no hay versión)
 *
 * No adivina: los casos dudosos se marcan en `motivos` para que el backfill los reporte.
 */
export function parsearNombreVersion(texto: string): SoftwareParseado {
  const limpio = (texto ?? '').trim().replace(/\s+/g, ' ');
  const partes = limpio === '' ? [] : limpio.split(' ');
  const ultimo = partes[partes.length - 1] ?? '';

  const ultimoEsVersion =
    partes.length > 1 && /\d/.test(ultimo) && /^[A-Za-z0-9._+-]+$/.test(ultimo);

  const nombre = ultimoEsVersion ? partes.slice(0, -1).join(' ') : limpio;
  const version = ultimoEsVersion ? ultimo : '';

  const motivos: MotivoAmbiguedad[] = [];
  if (version !== '' && !esVersionNumerica(version)) motivos.push('VERSION_NO_NUMERICA');
  if (version === '' && /\d/.test(limpio)) motivos.push('DIGITOS_SIN_VERSION');
  if (nombre !== '' && !/[a-záéíóúüñ]/i.test(nombre)) motivos.push('NOMBRE_NO_ALFABETICO');

  return {
    nombre,
    version,
    nombreNormalizado: normalizarNombreSoftware(nombre),
    motivos,
  };
}

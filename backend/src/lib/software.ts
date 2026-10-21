/**
 * Utilidades puras del catálogo de software (Spec 08 / Issues 4.27 y 4.28).
 *
 * El software vivía como texto libre (`"Python 3.12"`). Aquí viven la normalización de nombres,
 * la separación nombre/versión y la comparación de versiones por segmentos numéricos.
 */

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
 * Normaliza el nombre de un software eliminando espacios extra y convirtiendo a minúsculas.
 * Es la clave de comparación del motor y la base de `Software.nombreNormalizado`.
 */
export function normalizarNombreSoftware(nombre: string): string {
  return nombre.trim().toLowerCase().replace(/\s+/g, ' ');
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
 * Compara dos versiones numéricas por segmentos (`3.9 < 3.11 < 3.12`), nunca como texto.
 * Devuelve `-1`, `0` o `1`. Si alguna no es numérica devuelve `0`: quien llama debe haber
 * comprobado antes `esVersionNumerica`.
 */
export function compararVersiones(a: string, b: string): number {
  const segmentosA = a.split('.');
  const segmentosB = b.split('.');
  const largo = Math.max(segmentosA.length, segmentosB.length);

  for (let i = 0; i < largo; i++) {
    const na = Number(segmentosA[i] ?? '0');
    const nb = Number(segmentosB[i] ?? '0');
    if (!Number.isFinite(na) || !Number.isFinite(nb)) return 0;
    if (na !== nb) return na < nb ? -1 : 1;
  }
  return 0;
}

/** Texto visible de un software: `"Python 3.12"`, o solo el nombre si no tiene versión. */
export function formatearSoftware(software: { nombre: string; version: string }): string {
  return `${software.nombre} ${software.version}`.trim();
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

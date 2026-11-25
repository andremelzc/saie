import type { TipoLicencia } from '../types/catalogoSoftware';

export const LICENCIAS: { valor: TipoLicencia; etiqueta: string }[] = [
  { valor: 'LIBRE', etiqueta: 'Libre' },
  { valor: 'EDUCATIVA', etiqueta: 'Educativa' },
  { valor: 'COMERCIAL', etiqueta: 'Comercial' },
];

export function etiquetaLicencia(licencia: TipoLicencia): string {
  return LICENCIAS.find((l) => l.valor === licencia)?.etiqueta ?? 'Otra';
}

/**
 * Spec 08 §3: «versión mínima» solo tiene sentido con una versión numérica por segmentos
 * (`3.11`, `2024.1`). Con `R2023b` o sin versión se puede pedir cualquiera o la exacta.
 */
export function admiteVersionMinima(version: string): boolean {
  return /^\d+(\.\d+)*$/.test(version.trim());
}

/** «Python 3.12» o solo «Docker» si no tiene versión. */
export function nombreSoftware(s: { nombre: string; version: string }): string {
  return s.version ? `${s.nombre} ${s.version}` : s.nombre;
}

/** «2 laboratorios · 5 secciones», o «Sin uso». */
export function textoUso(uso: { laboratorios: number; secciones: number }): string {
  if (uso.laboratorios === 0 && uso.secciones === 0) return 'Sin uso';
  const labs = uso.laboratorios === 1 ? '1 laboratorio' : `${uso.laboratorios} laboratorios`;
  const secs = uso.secciones === 1 ? '1 sección' : `${uso.secciones} secciones`;
  return `${labs} · ${secs}`;
}

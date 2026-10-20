import { expect } from 'vitest';
import axe, {
  type AxeResults,
  type ElementContext,
  type ImpactValue,
  type Result,
  type RunOptions,
} from 'axe-core';

/**
 * Pruebas de accesibilidad del panel (Issue 3.23 / spec 03).
 *
 * La spec 03 pide «0 violaciones de accesibilidad grave»: en axe el impacto `serious` y
 * `critical` es el que bloquea el trabajo. Las violaciones `minor` y `moderate` se registran
 * pero no rompen la build, para no bloquear el desarrollo por detalles de estilo.
 */

/** Impactos que la spec 03 considera «graves». */
export const IMPACTOS_GRAVES: ImpactValue[] = ['serious', 'critical'];

export interface OpcionesAuditoria {
  /** Nombre del componente auditado; aparece en el mensaje de error. */
  nombre?: string;
  /** Contexto de axe (por ejemplo, `include` o `exclude`). */
  contexto?: ElementContext;
  /** Reglas adicionales o modificadas. */
  reglas?: RunOptions['rules'];
}

/** Ejecuta axe sobre un contenedor y devuelve el resultado completo. */
export async function auditarAccesibilidad(
  contenedor: HTMLElement,
  opciones: OpcionesAuditoria = {},
): Promise<AxeResults> {
  return axe.run(contenedor, {
    // Se piden violaciones e incompletas: las incompletas son las reglas que axe no puede
    // resolver en jsdom (contraste de color, texto visible) y sirven para documentarlo.
    resultTypes: ['violations', 'incomplete'],
    ...(opciones.contexto ? { context: opciones.contexto } : {}),
    ...(opciones.reglas ? { rules: opciones.reglas } : {}),
  });
}

/** Violaciones de impacto `serious` o `critical` detectadas en el resultado de axe. */
export function violacionesGraves(resultado: AxeResults): Result[] {
  return resultado.violations.filter((v) => IMPACTOS_GRAVES.includes(v.impact ?? 'minor'));
}

/**
 * Reglas que axe deja como «incomplete» porque jsdom no calcula estilos ni layout:
 * no se pueden resolver en el entorno de prueba y no son un defecto del componente.
 * El contraste real se comprueba en el navegador.
 */
export const REGLAS_INCOMPLETAS_EN_JSDOM = ['color-contrast', 'label-content-name-mismatch'];

/** Ids de las reglas que quedaron sin verificar, para poder documentarlas. */
export function reglasIncompletas(resultado: AxeResults): string[] {
  return resultado.incomplete.map((v) => v.id);
}

/** Resumen legible de una violación, para que el fallo diga qué corregir. */
export function describirViolacion(violacion: Result): string {
  const objetivos = violacion.nodes
    .slice(0, 3)
    .map((n) => n.target.join(' '))
    .join(', ');
  const extra = violacion.nodes.length > 3 ? ` (+${violacion.nodes.length - 3} más)` : '';
  return `[${violacion.impact ?? 'sin impacto'}] ${violacion.id}: ${violacion.help} — ${objetivos}${extra}`;
}

/**
 * Falla si el contenedor tiene violaciones de accesibilidad grave.
 *
 * Uso en una prueba:
 * ```ts
 * await esperarSinViolacionesGraves(container, { nombre: 'EspaciosAdmin' });
 * ```
 */
export async function esperarSinViolacionesGraves(
  contenedor: HTMLElement,
  opciones: OpcionesAuditoria = {},
): Promise<void> {
  const nombre = opciones.nombre ?? 'el componente';
  const resultado = await auditarAccesibilidad(contenedor, opciones);
  const graves = violacionesGraves(resultado);
  expect(graves.map(describirViolacion), `Violaciones de accesibilidad grave en ${nombre}`).toEqual(
    [],
  );
}

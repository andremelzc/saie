import type { TipoCodigoConsulta } from '../types/consulta';

/**
 * Detecta el tipo de código ingresado para la consulta de espacios en SAIE.
 *
 * Criterio técnico institucional:
 * 1. Código de Alumno: Exactamente 8 dígitos numéricos consecutivos (^\d{8}$),
 *    correspondiente al código oficial de matrícula (ejemplo ficticio: 20200001).
 * 2. Código de Curso: Formato alfanumérico con guion separador (ejemplo: CC-101, SI-201, IS-301),
 *    validado mediante la expresión regular ^[A-Za-z0-9]+-[A-Za-z0-9]+$.
 *
 * Regla de validación:
 * No se permiten espacios en blanco, cadenas vacías ni formatos fuera de estos dos patrones.
 * Si el valor no cumple estrictamente con ninguna de las dos reglas, retorna null.
 */
export function detectarTipoCodigo(valor: string): TipoCodigoConsulta | null {
  const limpio = valor.trim();

  // Rechazar vacío o si contiene espacios internos
  if (!limpio || /\s/.test(limpio)) {
    return null;
  }

  // Patrón 1: Alumno (8 dígitos numéricos)
  if (/^\d{8}$/.test(limpio)) {
    return 'ALUMNO';
  }

  // Patrón 2: Curso (alfanumérico con guión, ej. CC-101)
  if (/^[A-Za-z0-9]+-[A-Za-z0-9]+$/.test(limpio)) {
    return 'CURSO';
  }

  return null;
}

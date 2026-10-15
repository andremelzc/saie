import type { EstadoOcupacion } from './tipos';

/**
 * Convención del plano y parámetros visuales. Todo lo que depende de cómo está dibujado el
 * SVG (clases, capas) o del aspecto (alturas, colores) vive aquí, no repartido por la escena.
 */

/** Clases del plano (`data-clase`) que son espacios reservables y necesitan datos. */
export const CLASES_RESERVABLES: ReadonlySet<string> = new Set([
  'aula',
  'laboratorio',
  'auditorio',
]);

/**
 * Clases que conectan pisos. Una escalera o un ascensor es el mismo en todos los pisos si su
 * figura lleva el mismo `id` en cada plano (convención de `tools/planos`).
 */
export const CLASES_CONEXION: ReadonlySet<string> = new Set(['escalera', 'ascensor']);

/** Id de la capa de muros en el SVG. */
export const CAPA_MUROS = 'muros';

/** Alturas en unidades del plano (un salón mide unas 70 de ancho). */
export const ALTURA = {
  aula: 10,
  laboratorio: 16,
  contexto: 3,
  /** Escaleras y ascensores: algo más altos que el contexto para que se lean como "usables". */
  conexion: 6,
  muro: 6,
  losa: 1,
  /** Cuánto se eleva una figura seleccionada o resaltada. */
  resalte: 2,
} as const;

export const GROSOR_MURO = 2;

/** Separación vertical entre pisos en la vista de edificio completo. */
export const SEPARACION_PISOS = 90;

/** Colores de estado, de la guía de estilos (spec 07). */
export const COLOR_ESTADO: Record<EstadoOcupacion, string> = {
  DISPONIBLE: '#10b981',
  OCUPADO: '#64748b',
  ALERTA_ACTIVA: '#f59e0b',
};

export const COLOR_SIN_DATOS = '#cbd5e1';
export const COLOR_LOSA = '#e2e8f0';
export const COLOR_MURO = '#475569';
export const COLOR_BORDE = '#334155';
export const COLOR_ACENTO_LABORATORIO = '#0d9488';
export const COLOR_RESALTE = '#312e81';

/** Color de las figuras de contexto (no reservables), por clase. */
export const COLOR_CONTEXTO: Record<string, string> = {
  escalera: '#fca5a5',
  ascensor: '#c4b5fd',
  bano: '#f9a8d4',
  administrativo: '#e7e0c8',
  biblioteca: '#fde68a',
  patio: '#bbf7d0',
};

/** Límites de la cámara orbital (ángulos polares en radianes; distancias relativas al plano). */
export const CAMARA = {
  anguloMinimo: 0.15,
  anguloMaximo: Math.PI / 2.1,
  distanciaMinima: 0.35,
  distanciaMaxima: 2.4,
  fov: 45,
} as const;

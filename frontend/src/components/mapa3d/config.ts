import type { EstadoOcupacion } from './tipos';

/**
 * Convención del plano y parámetros visuales. Todo lo que depende de cómo está dibujado el
 * SVG (clases, capas) o del aspecto (alturas, colores) vive aquí, no repartido por la escena.
 */

/** Clases del plano (`data-clase`) que son espacios reservables y necesitan datos. */
export const CLASES_RESERVABLES: ReadonlySet<string> = new Set(['aula', 'laboratorio']);

/**
 * Clases que conectan pisos. Una escalera o un ascensor es el mismo en todos los pisos si su
 * figura lleva el mismo `id` en cada plano (convención de `tools/planos`).
 */
export const CLASES_CONEXION: ReadonlySet<string> = new Set(['escalera', 'ascensor']);

/**
 * Clases que no se extruyen como un volumen propio. Las puertas son una marca del plano: la
 * maqueta 3D no las levanta como figura, sino que abre el hueco en el muro y pone su hoja (ver
 * `Puertas` y `construirParedes` en `Escena.tsx`).
 */
export const CLASES_SIN_VOLUMEN: ReadonlySet<string> = new Set(['puerta']);

/** Id de la capa de muros en el SVG. */
export const CAPA_MUROS = 'muros';

/**
 * Medidas del edificio, en unidades del plano (un salón mide unas 40 de ancho). Los pisos se
 * apilan de verdad: la losa de un piso es el suelo del siguiente.
 */
export const EDIFICIO = {
  /** Distancia de un suelo al del piso siguiente (losa incluida). */
  alturaPiso: 18,
  /** Grosor de la losa. */
  losa: 1.6,
  /** Altura de los muros exteriores: llegan justo bajo la losa del piso de arriba. */
  muroExterior: 16.4,
  grosorExterior: 1.6,
  /** Muros bajos que separan los espacios: dejan ver el interior desde arriba. */
  muroInterior: 5,
  grosorInterior: 0.7,
  /** Grosor del suelo coloreado de cada espacio. */
  baldosa: 0.7,
  /** Cuánto se eleva el suelo de un espacio seleccionado o resaltado. */
  resalte: 1.6,
  /** Altura de la cabina del ascensor. */
  ascensor: 11,
  /** Altura de la escalera en su punto más alto. */
  escalera: 9,
  /** Altura del hueco de una puerta en el muro. */
  puerta: 9.5,
} as const;

/** Hacia dónde sube el primer tramo de cada escalera (puntos cardinales del plano, norte arriba). */
export type DireccionEscalera = 'N' | 'S' | 'E' | 'O';

/**
 * Orientación de cada escalera. Todas son de dos tramos con un descanso en el medio: se sube por
 * un lado hasta el descanso y se da la vuelta para subir por el otro. `dir` es hacia dónde sube
 * el primer tramo, y el descanso queda en ese extremo. El tramo de ida va por el lado izquierdo
 * de quien sube. Una escalera que no está aquí sube hacia el este.
 */
export const ORIENTACION_ESCALERA: Record<string, DireccionEscalera> = {
  'ANT-escalera-1': 'O',
  'ANT-escalera-2': 'S',
  'ANT-escalera-3': 'S',
  'NUE-escalera-1': 'N',
  'NUE-escalera-2': 'N',
};

/** Colores de estado, de la guía de estilos (spec 07). */
export const COLOR_ESTADO: Record<EstadoOcupacion, string> = {
  DISPONIBLE: '#10b981',
  OCUPADO: '#64748b',
  ALERTA_ACTIVA: '#f59e0b',
};

export const COLOR_SIN_DATOS = '#cbd5e1';
export const COLOR_LOSA = '#a9adb2';
/** Césped de los patios en la maqueta 3D (en el plano 2D son un tono neutro). */
export const COLOR_PATIO = '#b3d3a3';
/** Ventanas de la fachada, como la facultad: cortinas amarillas y vidrio oscuro. */
export const COLOR_VENTANA_CORTINA = '#dcc27a';
export const COLOR_VENTANA_VIDRIO = '#48586a';
export const COLOR_TERRENO = '#d8d9d4';
export const COLOR_TECHO = '#a9adb2';
export const COLOR_MURO_EXTERIOR = '#e9ebee';
export const COLOR_MURO_INTERIOR = '#f5f6f7';
export const COLOR_MURO = '#475569';
export const COLOR_BORDE = '#334155';
/** Hoja de las puertas: el mismo naranja con que el plano 2D marca las entradas. */
export const COLOR_PUERTA = '#e8782a';
/** Borde del laboratorio: el azul de información de la guía (`--color-saie-info`). */
export const COLOR_ACENTO_LABORATORIO = '#1f5fa8';
/** Lo resaltado o seleccionado: guinda profundo (`--color-saie-primary-dark`). */
export const COLOR_RESALTE = '#5c0d0e';
/** Contorno del espacio elegido: más vivo que el resalte para que se vea sobre cualquier fondo. */
export const COLOR_CONTORNO = '#7b1113';

/**
 * Color de las figuras de contexto (no reservables), por clase. Son tonos apagados a propósito:
 * los estados (verde, gris, ámbar) tienen que ser lo que más se vea.
 */
export const COLOR_CONTEXTO: Record<string, string> = {
  escalera: '#e3c4c1',
  ascensor: '#d3cbe8',
  bano: '#e8d0de',
  administrativo: '#e8e3d2',
  biblioteca: '#eee0b0',
  patio: '#dde8d8',
  auditorio: '#b48c8c',
  comedor: '#e9d0ac',
  sala: '#e4e7eb',
  puerta: '#ffffff',
};

/** Límites de la cámara orbital (ángulos polares en radianes; distancias relativas al plano). */
export const CAMARA = {
  anguloMinimo: 0.15,
  anguloMaximo: Math.PI / 2.1,
  distanciaMinima: 0.35,
  distanciaMaxima: 2.4,
  fov: 45,
} as const;

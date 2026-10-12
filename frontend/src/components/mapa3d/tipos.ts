import type { ReactNode } from 'react';

export type EstadoOcupacion = 'DISPONIBLE' | 'OCUPADO' | 'ALERTA_ACTIVA';
export type TipoEspacio = 'AULA_TEORICA' | 'LABORATORIO';

/**
 * Estado de un espacio del mapa. `id` es el identificador de la figura en el plano SVG
 * (p. ej. `NUE-101`); el Issue 4.24 se encarga de traducirlo desde los datos del backend.
 */
export interface EspacioMapa {
  id: string;
  tipo: TipoEspacio;
  estado: EstadoOcupacion;
}

export interface Mapa3DProps {
  /** Piso -> URL del SVG limpio de ese piso (salida de `tools/planos`). */
  planos: Record<number, string>;
  /** Estado y tipo de cada espacio reservable. */
  espacios: EspacioMapa[];
  /** Espacio seleccionado (modo controlado). Si se omite, el componente lo gestiona. */
  seleccionado?: string | null;
  /** Ids a resaltar, p. ej. el bloque asignado a una sección. */
  resaltados?: string[];
  /** Piso inicial o `'todos'` para el edificio completo. Por defecto, el primer piso. */
  pisoInicial?: number | 'todos';
  /** Se emite con el id del espacio al hacer clic, o `null` al hacer clic en vacío. */
  onSeleccionar?: (id: string | null) => void;
  /** Avisos de datos: figuras sin espacio o espacios sin figura. Por defecto, `console.warn`. */
  onAviso?: (mensaje: string) => void;
  /** Qué mostrar si el navegador no tiene WebGL o falla al iniciarlo (el mapa 2D). */
  fallback?: ReactNode;
  className?: string;
}

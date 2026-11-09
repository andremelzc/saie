import type { EspacioMapa, EstadoOcupacion, TipoEspacio } from '../mapa3d/tipos';
import type { Pabellon } from './plano';

export const ESTADO_TEXTO: Record<EstadoOcupacion, string> = {
  DISPONIBLE: 'Disponible',
  OCUPADO: 'Ocupado',
  ALERTA_ACTIVA: 'Con alerta',
};

export const TIPO_TEXTO: Record<TipoEspacio, string> = {
  AULA_TEORICA: 'Aula teórica',
  LABORATORIO: 'Laboratorio',
};

export const PABELLON_TEXTO: Record<Pabellon, string> = {
  NUE: 'Pabellón nuevo',
  ANT: 'Pabellón antiguo',
};

/** Estado de un espacio del mapa con los datos que muestra el detalle. */
export interface EspacioMapa2D extends EspacioMapa {
  /** Nombre visible (p. ej. «Aula 104 - Laboratorio 08»). */
  nombre?: string;
  piso?: number;
  aforo?: number;
  /** Texto libre de contexto (p. ej. la sección que lo ocupa). */
  detalle?: string;
}

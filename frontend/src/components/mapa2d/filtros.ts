import type { EstadoOcupacion, TipoEspacio } from '../mapa3d/tipos';
import type { EspacioMapa2D } from './etiquetas';

/** Qué se muestra en el mapa: los espacios que no cumplen quedan atenuados y sin acción. */
export interface FiltroMapa {
  estados: EstadoOcupacion[];
  tipos: TipoEspacio[];
}

export const TODOS_LOS_ESTADOS: EstadoOcupacion[] = ['DISPONIBLE', 'OCUPADO', 'ALERTA_ACTIVA'];
export const TODOS_LOS_TIPOS: TipoEspacio[] = ['AULA_TEORICA', 'LABORATORIO'];

export const FILTRO_TODO: FiltroMapa = { estados: TODOS_LOS_ESTADOS, tipos: TODOS_LOS_TIPOS };

export function pasaFiltro(espacio: Pick<EspacioMapa2D, 'estado' | 'tipo'>, f: FiltroMapa): boolean {
  return f.estados.includes(espacio.estado) && f.tipos.includes(espacio.tipo);
}

export function hayFiltro(f: FiltroMapa, estadosPosibles: EstadoOcupacion[] = TODOS_LOS_ESTADOS): boolean {
  return (
    estadosPosibles.some((e) => !f.estados.includes(e)) ||
    TODOS_LOS_TIPOS.some((t) => !f.tipos.includes(t))
  );
}

/** Quita o pone un valor de la lista. */
export function alternar<T>(lista: T[], valor: T): T[] {
  return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
}

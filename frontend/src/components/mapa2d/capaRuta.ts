import type { Punto } from './plano';

/** Punto numerado del recorrido de una ruta. */
export interface MarcaRuta {
  punto: Punto;
  etiqueta: string;
  numero: number;
  tipo: 'inicio' | 'cambio' | 'destino';
}

/** Lo que se dibuja de una ruta sobre un piso: la línea y sus puntos. */
export interface TrazoPiso {
  puntos: Punto[];
  marcas: MarcaRuta[];
}

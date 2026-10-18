import type { DiaSemana, TipoEspacio } from './consulta';

/** Contrato de la ruta de referencia (backend/src/types/ruta.ts, Issues 3.14 y 3.15). */
export type TipoTramoRuta = 'ENTRADA_PABELLON' | 'CAMBIO_PISO' | 'ESPACIO_ASIGNADO';

export interface TramoRutaDTO {
  orden: number;
  tipo: TipoTramoRuta;
  titulo: string;
  descripcion: string;
  tiempoEstimadoSegundos: number;
  esAccesible: boolean;
  espacioId?: string;
  identificador?: string;
  tipoEspacio?: TipoEspacio;
  pabellon?: string;
  piso?: number;
}

export interface RutaReferenciaDTO {
  asignacionId?: string;
  estado: 'DISPONIBLE' | 'RUTA_NO_DISPONIBLE';
  mensaje?: string;
  pabellon?: string;
  pisoDestino?: number;
  tiempoEstimadoTotalSegundos: number;
  tramos: TramoRutaDTO[];
  movilidadReducida: boolean;
}

/** Contrato del mapa de ocupación en modo lectura (Issue 3.13): solo libre u ocupado. */
export interface EspacioOcupacionLecturaDTO {
  id: string;
  identificador: string;
  tipo: TipoEspacio;
  estado: 'DISPONIBLE' | 'OCUPADO';
}

export interface MapaOcupacionLecturaDTO {
  pabellon: string;
  piso: number;
  franja: { diaSemana: DiaSemana; horaInicio: string; horaFin: string };
  espacios: EspacioOcupacionLecturaDTO[];
}

export interface FiltrosMapaOcupacion {
  pabellon: string;
  piso: number;
  /** Franja opcional: dia, horaInicio y horaFin van juntos. Sin ella, el momento actual. */
  franja?: { dia: DiaSemana; horaInicio: string; horaFin: string };
}

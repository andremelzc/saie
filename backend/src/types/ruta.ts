import { TipoEspacio } from '@prisma/client';

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

export type EstadoRutaDTO = 'DISPONIBLE' | 'RUTA_NO_DISPONIBLE';

export interface RutaReferenciaDTO {
  asignacionId?: string;
  estado: EstadoRutaDTO;
  mensaje?: string;
  pabellon?: string;
  pisoDestino?: number;
  tiempoEstimadoTotalSegundos: number;
  tramos: TramoRutaDTO[];
  movilidadReducida: boolean;
}

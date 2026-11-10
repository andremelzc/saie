/**
 * Contrato de la ruta de referencia (`GET /api/v1/estudiante/ruta/:asignacionId`, Issues 3.14 y
 * 3.15). Es el mismo `RutaReferenciaDTO` del backend (`backend/src/types/ruta.ts`): cuando la
 * pantalla se conecte (Issue 3.20) se sustituyen los datos de ejemplo sin tocar el resto.
 */
export type TipoTramoRuta = 'ENTRADA_PABELLON' | 'CAMBIO_PISO' | 'ESPACIO_ASIGNADO';

export interface TramoRuta {
  orden: number;
  tipo: TipoTramoRuta;
  titulo: string;
  descripcion: string;
  tiempoEstimadoSegundos: number;
  esAccesible: boolean;
  /** Id del espacio. En los datos de ejemplo es el id de la figura del plano (`NUE-204`). */
  espacioId?: string;
  identificador?: string;
  tipoEspacio?: string;
  pabellon?: string;
  piso?: number;
}

export type EstadoRuta = 'DISPONIBLE' | 'RUTA_NO_DISPONIBLE';

export interface RutaReferencia {
  asignacionId?: string;
  estado: EstadoRuta;
  mensaje?: string;
  pabellon?: string;
  pisoDestino?: number;
  tiempoEstimadoTotalSegundos: number;
  tramos: TramoRuta[];
  movilidadReducida: boolean;
}

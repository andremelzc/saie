import { PrioridadIncidencia, TipoAlerta } from '@prisma/client';
import { HorarioSlot } from '../services/disponibilidad.service';

export interface EspacioEventoDTO {
  id: string;
  identificador: string;
}

/**
 * Una sección con asignación VIGENTE pasó a un conjunto de espacios distinto (la anterior quedó
 * HISTORICA). Lo emite el motor después de confirmar la transacción (Issue 2.16).
 */
export interface AsignacionCambiadaEvento {
  seccionId: string;
  codigoCurso: string;
  nombreCurso: string;
  codigoSeccion: string;
  periodo: string;
  espaciosAnteriores: EspacioEventoDTO[];
  espaciosNuevos: EspacioEventoDTO[];
  horarios: HorarioSlot[];
}

/** Se creó una alerta nueva; no se emite cuando solo se actualizó una pendiente idéntica. */
export interface AlertaCreadaEvento {
  alertaId: string;
  tipo: TipoAlerta;
  espacioId: string;
  motivo: string;
  asignacionesAfectadas: number;
}

/** Un docente registró una incidencia (Issue 4.60). Quien escucha lee el detalle de la base. */
export interface IncidenciaRegistradaEvento {
  incidenciaId: string;
  prioridad: PrioridadIncidencia;
}

/** Eventos internos del sistema y la forma de su contenido. */
export interface MapaEventos {
  'asignacion.cambiada': AsignacionCambiadaEvento;
  'alerta.creada': AlertaCreadaEvento;
  'incidencia.registrada': IncidenciaRegistradaEvento;
}

export type NombreEvento = keyof MapaEventos;

export type Manejador<K extends NombreEvento> = (contenido: MapaEventos[K]) => void | Promise<void>;

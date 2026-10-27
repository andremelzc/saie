/** Solicitudes de software del docente (Issue 4.29, Spec 08 §2.3). */

export type EstadoSolicitud = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

export type CategoriaSoftware =
  | 'SISTEMA_OPERATIVO'
  | 'IDE'
  | 'LENGUAJE'
  | 'BASE_DATOS'
  | 'REDES'
  | 'SIMULACION'
  | 'OFIMATICA'
  | 'OTRO';

export interface SolicitudSoftwareDTO {
  id: string;
  nombre: string;
  version: string;
  categoria: CategoriaSoftware | null;
  justificacion: string;
  estado: EstadoSolicitud;
  fechaSolicitud: string;
  fechaResolucion: string | null;
  motivoRechazo: string | null;
  docente: { id: string; nombre: string; codigoDocente: string };
  seccion: {
    id: string;
    codigoSeccion: string;
    periodo: string;
    codigoCurso: string;
    nombreCurso: string;
  } | null;
  /** Software del catálogo creado o vinculado al aprobar; null mientras esté pendiente. */
  software: { id: string; nombre: string; version: string } | null;
}

export interface ListadoSolicitudesDTO {
  items: SolicitudSoftwareDTO[];
  total: number;
  page: number;
  limit: number;
}

export interface NuevaSolicitudSoftware {
  nombre: string;
  version?: string;
  categoria?: CategoriaSoftware;
  justificacion: string;
}

export interface ResultadoAprobacionDTO {
  solicitud: SolicitudSoftwareDTO;
  /** true si además quedó como requerimiento de la sección de la solicitud. */
  agregadaASeccion: boolean;
}

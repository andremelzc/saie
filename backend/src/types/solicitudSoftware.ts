import { CategoriaSoftware, EstadoSolicitud } from '@prisma/client';
import { SoftwareResumenDTO } from './software';

/** Sección a la que apunta una solicitud (opcional), con el curso para mostrarlo en la lista. */
export interface SeccionSolicitudDTO {
  id: string;
  codigoSeccion: string;
  periodo: string;
  codigoCurso: string;
  nombreCurso: string;
}

/** Docente que propone la solicitud. */
export interface DocenteSolicitudDTO {
  id: string;
  nombre: string;
  codigoDocente: string;
}

/** Solicitud de software tal como la ven el docente dueño y Coordinación (Spec 08, §2.3). */
export interface SolicitudSoftwareDTO {
  id: string;
  nombre: string;
  version: string;
  categoria: CategoriaSoftware | null;
  justificacion: string;
  estado: EstadoSolicitud;
  fechaSolicitud: Date;
  fechaResolucion: Date | null;
  motivoRechazo: string | null;
  docente: DocenteSolicitudDTO;
  seccion: SeccionSolicitudDTO | null;
  /** Software del catálogo creado o vinculado al aprobar; `null` mientras esté pendiente. */
  software: SoftwareResumenDTO | null;
}

export interface ResultadoAprobacionDTO {
  solicitud: SolicitudSoftwareDTO;
  /** `true` si además quedó como requerimiento de la sección de la solicitud. */
  agregadaASeccion: boolean;
}

export interface ListadoSolicitudesDTO {
  items: SolicitudSoftwareDTO[];
  total: number;
  page: number;
  limit: number;
}

export interface FiltrosSolicitudes {
  estado?: EstadoSolicitud;
  page: number;
  limit: number;
}

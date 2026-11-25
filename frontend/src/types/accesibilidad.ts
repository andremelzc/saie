/**
 * Declaraciones de accesibilidad de los alumnos (Issue 3.60). Contrato de
 * backend/src/services/accesibilidad.service.ts.
 */

export type EstadoDeclaracion = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

/** Estado de la declaración que el alumno ve en su perfil. */
export interface EstadoAccesibilidadDTO {
  estado: EstadoDeclaracion;
  fechaSolicitud: string;
  fechaResolucion: string | null;
  motivoRechazo: string | null;
}

export interface SeccionAccesibilidadDTO {
  seccionId: string;
  codigoCurso: string;
  nombreCurso: string;
  codigoSeccion: string;
  espacios: { identificador: string; pabellon: string; piso: number }[];
  /** Tiene aula vigente y alguna no está en el piso 1. */
  fueraDePiso1: boolean;
  /** Sin aula vigente (escalada o sin asignar). */
  sinAula: boolean;
}

export interface SolicitudAccesibilidadAdminDTO {
  id: string;
  estado: EstadoDeclaracion;
  fechaSolicitud: string;
  fechaResolucion: string | null;
  motivoRechazo: string | null;
  /** «3 de 4 clases quedaron en el piso 1»; solo en las aprobadas. */
  resultado: string | null;
  alumno: { codigo: string; nombre: string };
  secciones: SeccionAccesibilidadDTO[];
}

/** GET /v1/admin/accesibilidad. */
export interface AccesibilidadAdminDTO {
  periodo: string | null;
  pendientes: SolicitudAccesibilidadAdminDTO[];
  aprobadas: SolicitudAccesibilidadAdminDTO[];
}

/** Cuerpo de PATCH /v1/admin/accesibilidad/:id/resolver. */
export type DecisionAccesibilidad =
  { decision: 'APROBAR' } | { decision: 'RECHAZAR'; motivo: string };

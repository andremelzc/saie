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
  /** Issue 3.61 (R16): último día de una condición temporal (`AAAA-MM-DD`); `null` = no vence. */
  fechaFin?: string | null;
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
  /** Issue 3.61 (R15): quién la declara; `alumno` trae el código y nombre de cualquiera de los dos. */
  tipo?: 'ALUMNO' | 'DOCENTE';
  /** Issue 3.61 (R16): último día de la condición (`AAAA-MM-DD`); `null` si no vence. */
  fechaFin?: string | null;
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

/** Issue 3.61 (R15) — GET/PUT /v1/docente/accesibilidad: la declaración del docente. */
export interface AccesibilidadDocenteDTO {
  /** La condición está aprobada: el motor prioriza el piso 1 en sus secciones. */
  aprobada: boolean;
  /** Último día de la condición aprobada (`AAAA-MM-DD`); `null` si no vence. */
  vigenteHasta: string | null;
  solicitud: EstadoAccesibilidadDTO | null;
}

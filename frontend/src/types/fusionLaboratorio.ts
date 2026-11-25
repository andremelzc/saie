import type { DiaSemana } from './consulta';

/**
 * «Dictar todo en laboratorio» (Issue 7.17). Contrato de
 * backend/src/services/fusionLaboratorio.service.ts.
 */

export type EstadoSolicitudLaboratorio = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

export interface FranjaFusionDTO {
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
}

/** Una de las dos secciones del grupo, con sus franjas. */
export type SeccionFusionDTO = { id: string; codigoSeccion: string; horarios: FranjaFusionDTO[] };

/**
 * Una solicitud de «dictar todo en laboratorio». `resultado` dice dónde quedó la sección al
 * aprobarla; `motivoRechazo`, por qué no se aprobó.
 */
export type SolicitudLaboratorioDTO = {
  id: string;
  estado: EstadoSolicitudLaboratorio;
  periodo: string;
  grupo: string;
  justificacion: string;
  curso: Record<'codigo' | 'nombre', string>;
  docente: Record<'codigoDocente' | 'nombre', string>;
  fechaSolicitud: string;
} & Record<'seccionTeoria' | 'seccionLaboratorio', SeccionFusionDTO> &
  Record<'fechaResolucion' | 'motivoRechazo' | 'resultado', string | null>;

export interface SolicitudesLaboratorioAdminDTO {
  pendientes: SolicitudLaboratorioDTO[];
  resueltas: SolicitudLaboratorioDTO[];
}

export type DecisionLaboratorio =
  { decision: 'APROBAR' } | { decision: 'RECHAZAR'; motivo: string };

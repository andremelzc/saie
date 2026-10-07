import { EstadoAsignacion } from '@prisma/client';

export interface ResultadoSeccionDTO {
  seccionId: string;
  codigoSeccion: string;
  estado: EstadoAsignacion;
  espacioIds: string[];
  motivoEscalamiento: string | null;
  /** `true` si la asignación vigente se conservó porque los requerimientos no cambiaron. */
  conservada: boolean;
}

/** Resumen de una ejecución del motor a demanda (Issue 2.15). */
export interface ResumenAsignacionDTO {
  modo: 'seccion' | 'periodo';
  periodo: string | null;
  /** Id de la corrida batch; `null` en el modo por sección (no genera corrida). */
  corridaId: string | null;
  totalSecciones: number;
  /** Secciones que quedaron con una asignación nueva (VIGENTE). */
  asignadas: number;
  /** Secciones cuya asignación VIGENTE se conservó (idempotencia). */
  mantenidas: number;
  /** Secciones que quedaron ESCALADAS a revisión manual. */
  escaladas: number;
  resultados: ResultadoSeccionDTO[];
}

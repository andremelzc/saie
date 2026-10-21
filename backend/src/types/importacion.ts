import { ResumenAsignacionDTO } from './asignacionDemanda';

/** Flujos de carga independientes de datos maestros (Issues 1.3, 1.4, 1.5 y 1.8). */
export const TIPOS_IMPORTACION = [
  'cursos-secciones',
  'horarios',
  'matriculas',
  'docentes',
] as const;

export type TipoImportacion = (typeof TIPOS_IMPORTACION)[number];

/** Resultado de la asignación que se dispara al terminar una importación exitosa (Issue 1.6). */
export interface AsignacionEncadenadaDTO {
  disparada: boolean;
  /** Por qué no se disparó; `null` si se disparó. */
  motivo: string | null;
  resumen: ResumenAsignacionDTO | null;
}

export interface ResultadoImportacionDTO {
  tipo: TipoImportacion;
  filasRecibidas: number;
  /** Contadores propios de cada importador (por ejemplo `seccionesProcesadas`). */
  procesados: Record<string, number>;
  /** Una entrada por fila rechazada, con su número de fila y el motivo. */
  errores: string[];
  /** `true` si ninguna fila fue rechazada. */
  exitosa: boolean;
  /** `null` si la importación no encadena asignación (docentes) o tuvo filas rechazadas. */
  asignacion: AsignacionEncadenadaDTO | null;
}

import { CuentaConNombreDTO } from '../lib/nombresCuenta';
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
  /**
   * Issue 1.16: la importación es «todo o nada». `true` si se guardaron las filas; `false` si el
   * archivo tenía al menos un error y no se guardó ninguna.
   */
  guardadas: boolean;
  /** `true` si falló al escribir y las filas anteriores al error sí quedaron guardadas. */
  parcial?: boolean;
  /** Avisos que no impiden guardar, como un docente o alumno con dos clases a la vez (R36). */
  advertencias?: string[];
  /** `null` si la importación no encadena asignación (docentes) o tuvo filas rechazadas. */
  asignacion: AsignacionEncadenadaDTO | null;
  /** Claves iniciales generadas para cuentas nuevas creadas en esta importación (se muestra una sola vez). */
  clavesIniciales?: {
    codigo: string;
    nombre: string;
    correo: string;
    rol: string;
    claveInicial: string;
  }[];
}

/** Última importación de un tipo de archivo (Issue 4.54). */
export interface UltimaImportacionDTO {
  tipo: TipoImportacion;
  fecha: string;
  /** Persona que la cargó; `null` si la cuenta ya no existe. */
  cuenta: CuentaConNombreDTO | null;
  filasRecibidas: number;
  filasAceptadas: number;
  filasRechazadas: number;
  resultado: 'EXITOSA' | 'CON_ERRORES';
}

/** La última importación de cada tipo; `null` si ese tipo nunca se cargó. */
export type UltimasImportacionesDTO = Record<TipoImportacion, UltimaImportacionDTO | null>;

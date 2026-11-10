import type { DiaSemana, TipoEspacio } from './consulta';
import type { TipoAlerta } from './admin';

/**
 * Contrato de GET /admin/mapa-ocupacion (Issues 4.11 y 4.12, backend/src/types/ocupacion.ts).
 * Spec: docs/specs/04-panel-alertas-y-admin.md §2.2.
 */

export type EstadoOcupacionEspacio = 'DISPONIBLE' | 'OCUPADO' | 'ALERTA_ACTIVA' | 'DESHABILITADO';

export interface FranjaOcupacionDTO {
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
}

export interface AsignacionOcupacionDTO {
  asignacionId: string;
  codigoCurso: string;
  nombreCurso: string;
  codigoSeccion: string;
  docenteNombre: string | null;
  /** Aforo actual: alumnos matriculados en la sección que usa el espacio. */
  alumnosMatriculados: number;
  horaInicio: string;
  horaFin: string;
}

export interface AlertaOcupacionDTO {
  id: string;
  tipo: TipoAlerta;
  motivo: string;
}

export interface EspacioOcupacionDTO {
  id: string;
  identificador: string;
  tipo: TipoEspacio;
  aforoNominal: number;
  capacidadReal: number;
  estado: EstadoOcupacionEspacio;
  descripcionUso: string | null;
  asignacion: AsignacionOcupacionDTO | null;
  alertas: AlertaOcupacionDTO[];
}

export interface MapaOcupacionDTO {
  pabellon: string;
  piso: number;
  franja: FranjaOcupacionDTO;
  espacios: EspacioOcupacionDTO[];
  resumen: { disponibles: number; ocupados: number; conAlerta: number; deshabilitados: number };
}

export interface FiltrosMapaOcupacion {
  pabellon: string;
  piso: number;
  /** La franja va completa o no va: sin ella el backend usa el momento actual (hora de Lima). */
  dia?: DiaSemana;
  horaInicio?: string;
  horaFin?: string;
}

/** Un espacio del mapa junto con su pabellón (el piso puede traer varios pabellones). */
export interface EspacioEnMapa extends EspacioOcupacionDTO {
  pabellon: string;
  piso: number;
}

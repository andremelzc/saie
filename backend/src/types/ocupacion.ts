import { DiaSemana, TipoAlerta, TipoEspacio } from '@prisma/client';

export type EstadoOcupacionEspacio = 'DISPONIBLE' | 'OCUPADO' | 'ALERTA_ACTIVA';

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

/** Estado de un espacio en la franja consultada (vista del panel, Issue 4.11). */
export interface EspacioOcupacionDTO {
  id: string;
  identificador: string;
  tipo: TipoEspacio;
  aforoNominal: number;
  capacidadReal: number;
  estado: EstadoOcupacionEspacio;
  asignacion: AsignacionOcupacionDTO | null;
  alertas: AlertaOcupacionDTO[];
}

export interface MapaOcupacionDTO {
  pabellon: string;
  piso: number;
  franja: FranjaOcupacionDTO;
  espacios: EspacioOcupacionDTO[];
  resumen: { disponibles: number; ocupados: number; conAlerta: number };
}

/** Vista de solo lectura del alumno (Issue 3.13): únicamente libre u ocupado. */
export interface EspacioOcupacionLecturaDTO {
  id: string;
  identificador: string;
  tipo: TipoEspacio;
  estado: 'DISPONIBLE' | 'OCUPADO';
}

export interface MapaOcupacionLecturaDTO {
  pabellon: string;
  piso: number;
  franja: FranjaOcupacionDTO;
  espacios: EspacioOcupacionLecturaDTO[];
}

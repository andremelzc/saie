import type { DiaSemana, EspacioAsignadoDTO, HorarioConsultaDTO } from './consulta';

/** Contrato del portal del alumno (backend/src/types/portal.ts, Issues 3.10 a 3.12). */
export type EstadoAsignacionDTO = 'VIGENTE' | 'ESCALADA' | 'PENDIENTE';

export type VistaHorario = 'dia' | 'semana';

/** Una clase concreta de la semana (un bloque de horario de una sección). */
export interface SesionDTO {
  seccionId: string;
  codigoCurso: string;
  nombreCurso: string;
  codigoSeccion: string;
  docenteNombre: string | null;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
  espacios: EspacioAsignadoDTO[];
  estadoAsignacion: EstadoAsignacionDTO;
}

export interface HorarioSemanalDTO {
  periodo: string | null;
  vista: VistaHorario;
  dias: Partial<Record<DiaSemana, SesionDTO[]>>;
}

export interface CursoMatriculadoDTO {
  codigoCurso: string;
  nombreCurso: string;
  codigoSeccion: string;
  periodo: string;
  docenteNombre: string | null;
  horarios: HorarioConsultaDTO[];
  estadoAsignacion: EstadoAsignacionDTO;
  espacios: EspacioAsignadoDTO[];
  /** Siguiente sesión del curso desde ahora y el espacio donde se dicta. */
  proximaSesion: {
    diaSemana: DiaSemana;
    horaInicio: string;
    horaFin: string;
    espacios: EspacioAsignadoDTO[];
  } | null;
}

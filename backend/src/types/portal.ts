import { DiaSemana, TipoEspacio } from '@prisma/client';
import { EspacioAsignadoDTO, HorarioConsultaDTO } from './consulta';

type EstadoAsignacionDTO = 'VIGENTE' | 'ESCALADA' | 'PENDIENTE';

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
  vista: 'dia' | 'semana';
  dias: Partial<Record<DiaSemana, SesionDTO[]>>;
}

// ---------------- Alumno (Issues 3.10, 3.11, 3.12) ----------------

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

export interface PerfilAlumnoDTO {
  alumno: {
    codigo: string;
    nombre: string;
    correo: string;
    dni: string | null;
    fechaNacimiento: string | null;
    telefono: string | null;
    direccion: string | null;
  };
  fichaMedica: {
    tipoSangre: string | null;
    alergias: string | null;
    condicionEspecial: string | null;
    contactoEmergencia: string | null;
  } | null;
}

// ---------------- Docente (Issues 7.2, 7.3, 7.5) ----------------

export interface AsignacionActivaDocenteDTO {
  asignacionId: string;
  codigoCurso: string;
  nombreCurso: string;
  codigoSeccion: string;
  horarios: HorarioConsultaDTO[];
  espacios: EspacioAsignadoDTO[];
  numeroAlumnos: number;
}

export interface HorarioDocenteDTO extends HorarioSemanalDTO {
  asignacionesActivas: AsignacionActivaDocenteDTO[];
}

export interface EspacioExploradorDTO {
  id: string;
  identificador: string;
  tipo: TipoEspacio;
  pabellon: string;
  piso: number;
  aforoNominal: number;
  capacidadReal: number;
  disponible: boolean;
}

export interface ExploradorEspaciosDTO {
  franja: { diaSemana: DiaSemana; horaInicio: string; horaFin: string };
  espacios: EspacioExploradorDTO[];
}

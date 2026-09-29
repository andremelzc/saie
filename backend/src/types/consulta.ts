import { DiaSemana, TipoEspacio } from '@prisma/client';

export interface HorarioConsultaDTO {
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
}

export interface EspacioAsignadoDTO {
  id: string;
  identificador: string;
  tipo: TipoEspacio;
  pabellon: string;
  piso: number;
}

export interface AsignacionConsultaItemDTO {
  asignacionId?: string;
  codigoCurso: string;
  nombreCurso: string;
  codigoSeccion: string;
  periodo: string;
  docenteNombre?: string | null;
  horarios: HorarioConsultaDTO[];
  espacios: EspacioAsignadoDTO[];
  estadoAsignacion: 'VIGENTE' | 'ESCALADA' | 'PENDIENTE';
  motivoEscalamiento?: string | null;
}

export interface ConsultaAlumnoResponseDTO {
  alumno: {
    codigo: string;
    nombre: string;
    correo: string;
    movilidadReducida: boolean;
  };
  asignaciones: AsignacionConsultaItemDTO[];
}

export interface SeccionCursoConsultaDTO {
  seccionId: string;
  codigoSeccion: string;
  periodo: string;
  docenteNombre?: string | null;
  horarios: HorarioConsultaDTO[];
  espacios: EspacioAsignadoDTO[];
  estadoAsignacion: 'VIGENTE' | 'ESCALADA' | 'PENDIENTE';
  motivoEscalamiento?: string | null;
}

export interface ConsultaCursoResponseDTO {
  curso: {
    codigo: string;
    nombre: string;
  };
  secciones: SeccionCursoConsultaDTO[];
}

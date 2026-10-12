import { TipoEspacio } from '@prisma/client';
import { HorarioConsultaDTO } from './consulta';

/** Sección que el motor no pudo asignar y espera revisión manual (Issue 4.22). */
export interface SeccionEscaladaDTO {
  asignacionId: string;
  fechaEscalamiento: Date;
  motivoEscalamiento: string | null;
  seccion: {
    id: string;
    codigoCurso: string;
    nombreCurso: string;
    codigoSeccion: string;
    periodo: string;
    docenteNombre: string | null;
    tipoEspacioRequerido: TipoEspacio;
    stackSoftwareRequerido: string[];
    alumnosMatriculados: number;
    horarios: HorarioConsultaDTO[];
  };
}

export interface SeccionesEscaladasDTO {
  periodo: string | null;
  total: number;
  secciones: SeccionEscaladaDTO[];
}

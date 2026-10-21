import { EstadoAsignacion, TipoEventoAuditoria } from '@prisma/client';

/**
 * Auditoría e historial de asignaciones (Issue 4.32).
 *
 * La base ya guarda las dos cosas: `RegistroAuditoria` deja constancia de cada evento del
 * motor y `Asignacion` conserva el estado `HISTORICA` de las asignaciones que dejó de estar
 * vigentes. Lo que faltaba era poder consultarlas: aquí se expone.
 */

export interface RegistroAuditoriaDTO {
  id: string;
  tipoEvento: TipoEventoAuditoria;
  detalle: string;
  fechaHora: string;
  asignacionId: string | null;
  alertaId: string | null;
  /** Sección relacionada, para leer el asiento sin salir de la tabla. */
  seccion: {
    id: string;
    codigoCurso: string;
    codigoSeccion: string;
    nombreCurso: string;
  } | null;
}

export interface FiltrosAuditoria {
  tipo?: TipoEventoAuditoria;
  desde?: Date;
  hasta?: Date;
  pagina: number;
  limite: number;
}

export interface ListadoAuditoriaDTO {
  items: RegistroAuditoriaDTO[];
  total: number;
  pagina: number;
  limite: number;
}

export interface HistorialAsignacionDTO {
  id: string;
  seccionId: string;
  codigoCurso: string;
  nombreCurso: string;
  codigoSeccion: string;
  periodo: string;
  estado: EstadoAsignacion;
  fechaAsignacion: string;
  corridaId: string | null;
  motivoEscalamiento: string | null;
  espacios: { id: string; identificador: string; pabellon: string; piso: number }[];
}

export interface FiltrosHistorial {
  seccionId?: string;
  periodo?: string;
  estado?: EstadoAsignacion;
  pagina: number;
  limite: number;
}

export interface ListadoHistorialDTO {
  items: HistorialAsignacionDTO[];
  total: number;
  pagina: number;
  limite: number;
}

/** Una fila del informe imprimible: la sección y el aula que tiene asignada. */
export interface ReporteSeccionDTO {
  codigoCurso: string;
  nombreCurso: string;
  codigoSeccion: string;
  tipoEspacioRequerido: string;
  docente: string | null;
  aula: { identificador: string; pabellon: string; piso: number } | null;
  /** `true` cuando la sección todavía no tiene aula y espera revisión. */
  sinAula: boolean;
  horarios: string[];
  alumnosMatriculados: number;
  softwareRequerido: string[];
}

export interface ReporteAsignacionesDTO {
  periodo: string;
  generadoEn: string;
  secciones: ReporteSeccionDTO[];
  totales: {
    secciones: number;
    asignadas: number;
    sinAula: number;
    aulasDistintas: number;
    alumnos: number;
  };
}

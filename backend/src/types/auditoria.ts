import { EstadoAsignacion, TipoEventoAuditoria } from '@prisma/client';

/**
 * Auditoría e historial de asignaciones (Issue 4.32).
 *
 * La base ya guarda las dos cosas: `RegistroAuditoria` deja constancia de cada evento del
 * motor y `Asignacion` conserva el estado `HISTORICA` de las asignaciones que dejó de estar
 * vigentes. Lo que faltaba era poder consultarlas: aquí se expone.
 */

export interface EspacioAuditoriaDTO {
  id: string;
  identificador: string;
  pabellon: string;
  piso: number;
}

export interface CuentaAuditoriaDTO {
  id: string;
  /** Nombre de la persona (alumno o docente) o, si no tiene ficha, su usuario de acceso. */
  nombre: string;
}

export interface RegistroAuditoriaDTO {
  id: string;
  tipoEvento: TipoEventoAuditoria;
  detalle: string;
  fechaHora: string;
  asignacionId: string | null;
  alertaId: string | null;
  /**
   * Datos estructurados (Issue 4.48). Los registros anteriores a ese cambio los traen vacíos
   * (`null` o `[]`) y se siguen leyendo por `detalle`.
   */
  corridaId: string | null;
  /** Quién disparó la corrida: `DEMANDA`, `TIEMPO` o `SECCION` (asignación individual). */
  origen: string | null;
  /** Puntaje de cercanía entre secciones paralelas de la asignación (0 a 1), si aplica. */
  puntaje: number | null;
  espaciosIds: string[];
  /** Los espacios de `espaciosIds` con su nombre legible (los eliminados no aparecen). */
  espacios: EspacioAuditoriaDTO[];
  /** Persona que hizo la acción, con su nombre (alerta resuelta por una cuenta). */
  cuenta: CuentaAuditoriaDTO | null;
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
  /** Origen y puntaje de cercanía de la decisión (Issue 4.48); `null` en las anteriores. */
  origen: string | null;
  puntaje: number | null;
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

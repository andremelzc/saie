import { EstadoIncidencia, PrioridadIncidencia, TipoIncidencia } from '@prisma/client';

/** Incidencia reportada por un docente, vista por Jefatura (Issue 7.6). */
export interface IncidenciaAdminDTO {
  id: string;
  identificadorSeguimiento: string;
  tipo: TipoIncidencia;
  prioridad: PrioridadIncidencia;
  estado: EstadoIncidencia;
  descripcion: string;
  evidencia: string | null;
  fechaReporte: Date;
  comentarioCierre: string | null;
  fechaCierre: Date | null;
  espacio: { id: string; identificador: string; pabellon: string; piso: number };
  docente: { codigo: string; nombre: string };
  asignacion: { id: string; codigoCurso: string; nombreCurso: string; codigoSeccion: string };
}

export interface FiltrosIncidencias {
  estado?: EstadoIncidencia;
  prioridad?: PrioridadIncidencia;
  espacioId?: string;
  pagina?: number;
  limite?: number;
}

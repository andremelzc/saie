import type { DiaSemana, EspacioAsignadoDTO, HorarioConsultaDTO, TipoEspacio } from './consulta';
import type { HorarioSemanalDTO, SesionDTO } from './horario';
import type { ComparacionVersion, SoftwareResumenDTO } from './admin';

/**
 * Contrato del portal docente (backend/src/types/portal.ts y types/incidencias.ts,
 * Issues 7.2 a 7.6). Spec: docs/specs/05-portal-docente.md.
 */

/** Una sección con asignación VIGENTE del docente (GET /docente/horario). */
export interface AsignacionActivaDocenteDTO {
  asignacionId: string;
  codigoCurso: string;
  nombreCurso: string;
  codigoSeccion: string;
  horarios: HorarioConsultaDTO[];
  espacios: EspacioAsignadoDTO[];
  numeroAlumnos: number;
}

/** Issue 7.18: espacios del aviso de cambio de aula (antes y ahora; vacío = sin aula). */
type EspaciosCambio = Record<
  'espaciosAnteriores' | 'espaciosNuevos',
  Omit<EspacioAsignadoDTO, 'id'>[]
>;

/** Issue 7.18: una sección del docente cambió de aula (`id` = la asignación nueva, `fecha` ISO). */
export type CambioAulaDocenteDTO = { id: string; fecha: string } & Pick<
  SesionDTO,
  'seccionId' | 'codigoCurso' | 'nombreCurso' | 'codigoSeccion' | 'tipoEspacioRequerido'
> &
  EspaciosCambio;

/** Un espacio del aviso de cambio de aula. */
export type EspacioCambioAulaDTO = CambioAulaDocenteDTO['espaciosNuevos'][number];

export interface HorarioDocenteDTO extends HorarioSemanalDTO {
  asignacionesActivas: AsignacionActivaDocenteDTO[];
  /** Issue 7.18: cambios de aula recientes, del más reciente al más antiguo. */
  cambiosDeAula: CambioAulaDocenteDTO[];
}

export interface FranjaDTO {
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
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
  franja: FranjaDTO;
  espacios: EspacioExploradorDTO[];
}

/** Filtros de GET /docente/espacios/explorador. La franja va completa o no va. */
export interface FiltrosExplorador {
  tipo?: TipoEspacio;
  pabellon?: string;
  piso?: number;
  capacidadMinima?: number;
  soloDisponibles?: boolean;
  dia?: DiaSemana;
  horaInicio?: string;
  horaFin?: string;
}

export interface SoftwareRequeridoDTO extends SoftwareResumenDTO {
  comparacionVersion: ComparacionVersion;
}

export interface SoftwareRequeridoCursoDTO {
  asignacionId: string;
  codigoCurso: string;
  nombreCurso: string;
  codigoSeccion: string;
  softwareRequerido: SoftwareRequeridoDTO[];
  softwareFaltante: string[];
  cumple: boolean;
}

export interface CambioHistorialLaboratorioDTO {
  campo: 'SOFTWARE' | 'PCS_MALOGRADAS';
  valorAnterior: string | null;
  valorNuevo: string;
  fechaCambio: string;
}

/** GET /docente/laboratorio-estado/:espacioId (Issue 7.4). */
export interface EstadoLaboratorioDocenteDTO {
  laboratorio: {
    id: string;
    identificador: string;
    pabellon: string;
    piso: number;
    aforoNominal: number;
    pcsMalogradas: number;
    pcsOperativas: number;
    softwareInstalado: SoftwareResumenDTO[];
  };
  cursos: SoftwareRequeridoCursoDTO[];
  historial: CambioHistorialLaboratorioDTO[];
}

export type TipoIncidencia = 'EQUIPO_NO_OPERATIVO' | 'SOFTWARE_FALTANTE' | 'OTRO';
export type PrioridadIncidencia = 'BAJA' | 'MEDIA' | 'ALTA';
export type EstadoIncidencia = 'PENDIENTE' | 'RESUELTA' | 'DESCARTADA';

/** Cuerpo de POST /docente/incidencias (CrearIncidenciaSchema, Issue 7.5). */
export interface CrearIncidenciaDTO {
  asignacionId: string;
  espacioId: string;
  tipo: TipoIncidencia;
  descripcion: string;
  prioridad?: PrioridadIncidencia;
  evidencia?: string;
}

export interface IncidenciaRegistradaDTO {
  identificadorSeguimiento: string;
  estado: 'PENDIENTE';
  fechaReporte: string;
  mensaje: string;
}

/** Incidencia vista por Jefatura (GET /admin/incidencias, Issue 7.6). */
export interface IncidenciaAdminDTO {
  id: string;
  identificadorSeguimiento: string;
  tipo: TipoIncidencia;
  prioridad: PrioridadIncidencia;
  estado: EstadoIncidencia;
  descripcion: string;
  evidencia: string | null;
  fechaReporte: string;
  comentarioCierre: string | null;
  fechaCierre: string | null;
  espacio: { id: string; identificador: string; pabellon: string; piso: number };
  docente: { codigo: string; nombre: string };
  asignacion: { id: string; codigoCurso: string; nombreCurso: string; codigoSeccion: string };
}

/** Incidencia vista por el docente que la reportó (GET /docente/incidencias, Issue 7.14). */
export type IncidenciaDocenteDTO = Omit<IncidenciaAdminDTO, 'docente'>;

export interface FiltrosIncidencias {
  estado?: EstadoIncidencia;
  prioridad?: PrioridadIncidencia;
  espacioId?: string;
}

/** Cuerpo de PATCH /admin/incidencias/:id/resolver. */
export interface CierreIncidenciaDTO {
  estado: 'RESUELTA' | 'DESCARTADA';
  comentario: string;
}

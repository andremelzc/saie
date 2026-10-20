/** Contratos del panel administrativo (espejo de backend/src/types/*). */

export type TipoAlerta = 'SOFTWARE' | 'CAPACIDAD';
export type EstadoAlerta = 'PENDIENTE' | 'RESUELTA';
export type TipoEspacio = 'AULA_TEORICA' | 'LABORATORIO';

export interface AsignacionAlertaDTO {
  asignacionId: string;
  codigoCurso: string;
  nombreCurso: string;
  codigoSeccion: string;
}

/** GET /v1/admin/alertas (Issue 4.6). */
export interface AlertaDTO {
  id: string;
  tipo: TipoAlerta;
  estado: EstadoAlerta;
  motivo: string;
  /** ISO 8601. */
  fechaDeteccion: string;
  espacio: { id: string; identificador: string; pabellon: string; piso: number };
  asignacionesAfectadas: AsignacionAlertaDTO[];
}

export interface SoftwareResumenDTO {
  id: string;
  nombre: string;
  version: string;
}

export interface SoftwareDTO extends SoftwareResumenDTO {
  activo: boolean;
}

export interface ListadoSoftwareDTO {
  items: SoftwareDTO[];
  total: number;
  page: number;
  limit: number;
}

/** Campos de un espacio que el backend permite editar según el rol (Issue 4.15). */
export type CampoEspacio =
  | 'identificador'
  | 'pabellon'
  | 'piso'
  | 'aforoNominal'
  | 'contiguos'
  | 'habilitado'
  | 'descripcionUso'
  | 'softwareIds'
  | 'pcsMalogradas';

/** GET /v1/admin/espacios (Issue 4.15). */
export interface EspacioAdminDTO {
  id: string;
  identificador: string;
  tipo: TipoEspacio;
  pabellon: string;
  piso: number;
  aforoNominal: number;
  softwareInstalado: SoftwareResumenDTO[] | null;
  pcsMalogradas: number | null;
  habilitado: boolean;
  descripcionUso: string | null;
  /** Ids de los espacios contiguos (siempre del mismo tipo). */
  contiguos: string[];
  camposEditables: CampoEspacio[];
}

/** Alerta que el backend genera al cambiar el aforo, el software o las PCs (Issue 4.15). */
export interface AlertaRegistradaDTO {
  id: string;
  tipo: TipoAlerta;
  espacioId: string;
  motivo: string;
  asignacionesAfectadas: number;
  /** `false` cuando se actualizó una alerta pendiente idéntica en lugar de crear otra. */
  creada: boolean;
}

/** PATCH /v1/admin/espacios/:id (Issue 4.15). */
export interface ResultadoEdicionEspacioDTO {
  espacio: EspacioAdminDTO;
  alertas: AlertaRegistradaDTO[];
}

/**
 * Campos enviados en el PATCH. Solo se incluyen los que cambian y el rol puede editar:
 * el backend rechaza con 403 cualquier campo fuera de `camposEditables`.
 */
export interface CambiosEspacio {
  identificador?: string;
  pabellon?: string;
  piso?: number;
  aforoNominal?: number;
  contiguos?: string[];
  habilitado?: boolean;
  /** `null` borra el rótulo. */
  descripcionUso?: string | null;
  softwareIds?: string[];
  pcsMalogradas?: number;
}

/** GET /v1/admin/secciones-escaladas (Issue 4.22). */
export interface SeccionEscaladaDTO {
  asignacionId: string;
  fechaEscalamiento: string;
  motivoEscalamiento: string | null;
  seccion: {
    id: string;
    codigoCurso: string;
    nombreCurso: string;
    codigoSeccion: string;
    periodo: string;
    docenteNombre: string | null;
    tipoEspacioRequerido: TipoEspacio;
    alumnosMatriculados: number;
  };
}

export interface SeccionesEscaladasDTO {
  periodo: string | null;
  total: number;
  secciones: SeccionEscaladaDTO[];
}

/** Respuesta de POST /v1/asignacion/batch y /seccion/:id (Issue 2.15). */
export interface ResumenAsignacionDTO {
  modo: 'seccion' | 'periodo';
  periodo: string | null;
  corridaId: string | null;
  totalSecciones: number;
  asignadas: number;
  mantenidas: number;
  escaladas: number;
}

export type TipoImportacion = 'cursos-secciones' | 'horarios' | 'matriculas' | 'docentes';

/** POST /v1/import/:tipo (Issue 1.6). */
export interface ResultadoImportacionDTO {
  tipo: TipoImportacion;
  filasRecibidas: number;
  procesados: Record<string, number>;
  errores: string[];
  exitosa: boolean;
  asignacion: {
    disparada: boolean;
    motivo: string | null;
    resumen: ResumenAsignacionDTO | null;
  } | null;
}

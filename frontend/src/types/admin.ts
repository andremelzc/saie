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
  contiguos: string[];
  camposEditables: string[];
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

/** Reglas duras que comprueba el verificador (Issue 2.17). */
export type ReglaVerificacion =
  | 'DOBLE_RESERVA'
  | 'CAPACIDAD_SUFICIENTE'
  | 'TIPO_HOMOGENEO'
  | 'BLOQUE_CONTIGUO'
  | 'SOFTWARE_COMPLETO'
  | 'ESCALADA_CON_MOTIVO'
  | 'UNA_VIGENTE_POR_SECCION';

export interface ViolacionVerificacionDTO {
  regla: ReglaVerificacion;
  asignacionId: string;
  seccionId: string;
  codigoSeccion: string;
  detalle: string;
}

export interface ResultadoReglaVerificacionDTO {
  regla: ReglaVerificacion;
  descripcion: string;
  revisadas: number;
  cumplen: number;
  violaciones: ViolacionVerificacionDTO[];
}

/** Issue 2.17: veredicto del verificador sobre las asignaciones de una corrida. */
export interface ResultadoVerificacionDTO {
  conforme: boolean;
  totalRevisadas: number;
  totalViolaciones: number;
  reglas: ResultadoReglaVerificacionDTO[];
}

/** Resultado por sección de una corrida (Issue 2.15). */
export interface ResultadoSeccionDTO {
  seccionId: string;
  codigoSeccion: string;
  estado: 'VIGENTE' | 'ESCALADA';
  espacioIds: string[];
  motivoEscalamiento: string | null;
  /** `true` si se conservó la asignación vigente porque los requerimientos no cambiaron. */
  conservada: boolean;
}

/** Respuesta de POST /v1/asignaciones/batch y /seccion/:id (Issue 2.15). */
export interface ResumenAsignacionDTO {
  modo: 'seccion' | 'periodo';
  periodo: string | null;
  corridaId: string | null;
  totalSecciones: number;
  asignadas: number;
  mantenidas: number;
  escaladas: number;
  /** Issue 2.17: veredicto del verificador posterior a la corrida. */
  verificacion: ResultadoVerificacionDTO | null;
  resultados: ResultadoSeccionDTO[];
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

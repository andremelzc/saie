import type { DiaSemana } from './consulta';
import type { RolCuenta } from './auth';

/** Contratos del panel administrativo (espejo de backend/src/types/*). */

/** Issue 3.59: ACCESIBILIDAD = una sección con movilidad reducida quedó fuera del piso 1. */
export type TipoAlerta = 'SOFTWARE' | 'CAPACIDAD' | 'ACCESIBILIDAD';
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

/**
 * Alta de un espacio (POST /v1/admin/espacios, solo Coordinación).
 * Un aula teórica no admite `softwareIds` ni `pcsMalogradas`.
 */
export interface NuevoEspacioDTO {
  identificador: string;
  tipo: TipoEspacio;
  pabellon: string;
  piso: number;
  aforoNominal: number;
  habilitado: boolean;
  contiguos: string[];
  descripcionUso?: string;
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

/** Estado de una importación en segundo plano (Issue 1.19). */
export interface TrabajoImportacionDTO {
  id: string;
  tipo: TipoImportacion;
  estado: 'EN_CURSO' | 'TERMINADO' | 'FALLIDO';
  procesadas: number;
  total: number;
  resultado?: ResultadoImportacionDTO;
  error?: string;
}

/** Respuesta de POST /v1/admin/alertas/:id/reubicar (Issue 2.22). */
export interface ResultadoReubicacionDTO {
  alertaId: string;
  alertaResuelta: boolean;
  secciones: (ResultadoSeccionDTO & { codigoCurso: string })[];
}

/** Respuesta de POST /v1/asignaciones/batch y /seccion/:id (Issue 2.15). */
/** GET /v1/asignaciones/reorganizacion (Issue 2.26): ventana al inicio del ciclo y simulación. */
export interface VistaPreviaReorganizacionDTO {
  disponible: boolean;
  /** Por qué no está disponible; `null` si lo está. */
  motivo: string | null;
  periodo: string | null;
  semanas: number;
  /** AAAA-MM-DD. */
  desde: string | null;
  hasta: string | null;
  /** Solo si está disponible: qué cambiaría al reorganizar. */
  simulacion: {
    totalEscaladas: number;
    escaladasConAula: number;
    cambianDeAula: number;
    pierdenAula: number;
  } | null;
}

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
  /** Issue 1.16: «todo o nada». `false` si el archivo tenía errores y no se guardó ninguna fila. */
  guardadas?: boolean;
  /** `true` si falló al escribir y las filas anteriores al error sí quedaron guardadas. */
  parcial?: boolean;
  /** Avisos que no impiden guardar, como un docente o alumno con dos clases a la vez. */
  advertencias?: string[];
  asignacion: {
    disparada: boolean;
    motivo: string | null;
    resumen: ResumenAsignacionDTO | null;
  } | null;
}

/**
 * POST /v1/import/:tipo/vista-previa (Issue 1.17): lo que la importación agregaría, quitaría o
 * inactivaría con el archivo, calculado sin escribir nada.
 */
export interface VistaPreviaImportacionDTO {
  tipo: TipoImportacion;
  filasRecibidas: number;
  /** Con errores la importación no guarda nada: no hay cambios que confirmar. */
  errores: string[];
  advertencias: string[];
  cambios: Record<string, number>;
  /** «Se quitarán 3 matrículas (alumnos que ya no figuran en su sección)». */
  frases: string[];
  /** Qué se quita o se reemplaza, una línea por elemento. */
  retiros: string[];
}

// ==========================================
// GESTIÓN INDIVIDUAL DE SECCIONES (Issue 4.31)
// ==========================================

export type ComparacionVersion = 'CUALQUIERA' | 'EXACTA' | 'MINIMA';
export type EstadoAsignacion = 'VIGENTE' | 'ESCALADA' | 'HISTORICA';
export type TipoEventoAuditoria =
  | 'ASIGNACION'
  | 'ESCALAMIENTO'
  | 'ALERTA'
  | 'VERIFICACION'
  // Acciones de personas (Issue 4.58)
  | 'EDICION_ESPACIO'
  | 'EDICION_SECCION'
  | 'CAMBIO_LABORATORIO'
  // Issue 4.64: registro, activación y cierre de periodos
  | 'CAMBIO_PERIODO';

/** Campos de una sección que el backend permite editar según el rol. */
export type CampoSeccion = 'tipoEspacioRequerido' | 'docenteId' | 'softwareRequerido' | 'horarios';

export interface SoftwareRequeridoSeccionDTO {
  id: string;
  nombre: string;
  version: string;
  comparacionVersion: ComparacionVersion;
}

export interface EspacioDeSeccionDTO {
  id: string;
  identificador: string;
  pabellon: string;
  piso: number;
  tipo: TipoEspacio;
}

/** GET /v1/admin/secciones (Issue 4.31). */
export interface SeccionAdminDTO {
  id: string;
  codigoCurso: string;
  nombreCurso: string;
  codigoSeccion: string;
  periodo: string;
  tipoEspacioRequerido: TipoEspacio;
  docente: { id: string; codigoDocente: string; nombre: string } | null;
  alumnosMatriculados: number;
  horarios: { diaSemana: DiaSemana; horaInicio: string; horaFin: string }[];
  softwareRequerido: SoftwareRequeridoSeccionDTO[];
  asignacion: {
    id: string;
    estado: EstadoAsignacion;
    fechaAsignacion: string;
    corridaId: string | null;
    motivoEscalamiento: string | null;
    espacios: EspacioDeSeccionDTO[];
  } | null;
  camposEditables: CampoSeccion[];
}

export interface ListadoSeccionesDTO {
  items: SeccionAdminDTO[];
  total: number;
  pagina: number;
  limite: number;
}

/** PATCH /v1/admin/secciones/:id (Issue 4.31). Solo se envían los campos que cambian. */
export interface CambiosSeccion {
  tipoEspacioRequerido?: TipoEspacio;
  docenteId?: string | null;
  softwareRequerido?: { softwareId: string; comparacionVersion: ComparacionVersion }[];
  /** Issue 4.62: reemplaza las franjas de la sección. Si cambian, la sección se reasigna. */
  horarios?: { diaSemana: DiaSemana; horaInicio: string; horaFin: string }[];
}

/** Issue 4.62: cómo quedó la sección al reasignarla con su horario nuevo. */
export interface ReasignacionSeccionDTO {
  estado: EstadoAsignacion;
  motivoEscalamiento: string | null;
  conservada: boolean;
}

export interface ResultadoEdicionSeccionDTO {
  seccion: SeccionAdminDTO;
  alertas: { id: string; tipo: string; motivo: string }[];
  /** Issue 4.62: avisos que no impiden guardar (choque de docente, reasignación pendiente). */
  advertencias: string[];
  /** Issue 4.62: `null` si el horario no cambió. */
  reasignacion: ReasignacionSeccionDTO | null;
}

// ==========================================
// AUDITORÍA E HISTORIAL (Issue 4.32)
// ==========================================

export interface RegistroAuditoriaDTO {
  id: string;
  tipoEvento: TipoEventoAuditoria;
  detalle: string;
  fechaHora: string;
  asignacionId: string | null;
  alertaId: string | null;
  seccion: {
    id: string;
    codigoCurso: string;
    codigoSeccion: string;
    nombreCurso: string;
  } | null;
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

export interface ListadoHistorialDTO {
  items: HistorialAsignacionDTO[];
  total: number;
  pagina: number;
  limite: number;
}

// ==========================================
// INFORME DE SALONES (Issue 4.33)
// ==========================================

export interface ReporteSeccionDTO {
  codigoCurso: string;
  nombreCurso: string;
  codigoSeccion: string;
  tipoEspacioRequerido: string;
  docente: string | null;
  aula: { identificador: string; pabellon: string; piso: number } | null;
  sinAula: boolean;
  horarios: string[];
  alumnosMatriculados: number;
  softwareRequerido: string[];
}

/** GET /v1/admin/periodos (Issue 4.42): los periodos con secciones y el vigente. */
export interface PeriodosDTO {
  /** El periodo vigente, o `null` si todavía no hay secciones. */
  vigente: string | null;
  /** Del más reciente al más antiguo. */
  periodos: string[];
  /** Issue 4.64: cada periodo registrado con su estado y fechas. */
  registrados: PeriodoDTO[];
}

/** Issue 4.64: ciclo de vida de un periodo. Solo uno puede estar vigente. */
export type EstadoPeriodo = 'EN_PREPARACION' | 'VIGENTE' | 'CERRADO';

export interface PeriodoDTO {
  codigo: string;
  /** `AAAA-MM-DD` o `null` si no se registró. */
  fechaInicio: string | null;
  fechaFin: string | null;
  estado: EstadoPeriodo;
}

export interface NuevoPeriodoDTO {
  codigo: string;
  fechaInicio?: string;
  fechaFin?: string;
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

/** POST /v1/admin/alumnos (Issue 4.17). Los datos opcionales se omiten si están vacíos. */
export interface NuevoAlumnoDTO {
  codigo: string;
  nombre: string;
  correo: string;
  dni?: string;
  telefono?: string;
  direccion?: string;
  /** Fecha ISO `AAAA-MM-DD`. */
  fechaNacimiento?: string;
}

/** POST /v1/admin/docentes (Issue 4.18). */
export interface NuevoDocenteDTO {
  codigoDocente: string;
  nombre: string;
  correoInstitucional: string;
  departamento: string;
}

/** Cuenta creada por un alta individual: la clave inicial es el propio código. */
export interface UsuarioCreadoDTO {
  id: string;
  codigo: string;
  nombre: string;
  rol: RolCuenta;
  debeCambiarClave: true;
}

/** POST /v1/admin/usuarios/restablecer-clave (Issue 4.26). La clave inicial se muestra una vez. */
export interface ClaveRestablecidaDTO {
  codigo: string;
  nombre: string;
  rol: RolCuenta;
  claveInicial: string;
  debeCambiarClave: true;
}

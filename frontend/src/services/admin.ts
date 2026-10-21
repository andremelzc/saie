import api from './api';
import type {
  AlertaDTO,
  CambiosEspacio,
  CambiosSeccion,
  EspacioAdminDTO,
  ListadoAuditoriaDTO,
  ListadoHistorialDTO,
  ListadoSeccionesDTO,
  ListadoSoftwareDTO,
  NuevoEspacioDTO,
  ReporteAsignacionesDTO,
  ResultadoEdicionEspacioDTO,
  ResultadoEdicionSeccionDTO,
  ResultadoImportacionDTO,
  ResumenAsignacionDTO,
  SeccionesEscaladasDTO,
  TipoEspacio,
  TipoImportacion,
  TipoEventoAuditoria,
  EstadoAsignacion,
} from '../types/admin';

/**
 * Cliente del panel administrativo. El rol (Coordinación / Jefatura) lo determina el token;
 * el backend ya filtra a Jefatura por los laboratorios bajo su responsabilidad (Issue 4.8).
 */

interface Respuesta<T> {
  success: boolean;
  data: T;
}

/** GET /v1/admin/alertas — ordenadas de la más reciente a la más antigua (Issue 4.10). */
export async function obtenerAlertas(): Promise<AlertaDTO[]> {
  const { data } = await api.get<Respuesta<AlertaDTO[]>>('/v1/admin/alertas');
  return ordenarAlertasPorFecha(data.data);
}

export function ordenarAlertasPorFecha(alertas: AlertaDTO[]): AlertaDTO[] {
  return [...alertas].sort(
    (a, b) => new Date(b.fechaDeteccion).getTime() - new Date(a.fechaDeteccion).getTime(),
  );
}

/** PATCH /v1/admin/alertas/:id/resolver (Issue 4.7). */
export async function resolverAlerta(id: string): Promise<void> {
  await api.patch(`/v1/admin/alertas/${encodeURIComponent(id)}/resolver`);
}

/** GET /v1/admin/secciones-escaladas (Issue 4.22). */
export async function obtenerEscaladas(): Promise<SeccionesEscaladasDTO> {
  const { data } = await api.get<Respuesta<SeccionesEscaladasDTO>>('/v1/admin/secciones-escaladas');
  return data.data;
}

/** POST /v1/asignaciones/batch - corrida del periodo vigente (Issue 2.15). */
export async function ejecutarCorrida(): Promise<ResumenAsignacionDTO> {
  const { data } = await api.post<Respuesta<ResumenAsignacionDTO>>(
    '/v1/asignaciones/batch',
    {},
    {
      timeout: 60000,
    },
  );
  return data.data;
}

/** POST /v1/asignaciones/seccion/:id - reintenta una sección escalada (Issue 2.15). */
export async function reintentarSeccion(seccionId: string): Promise<ResumenAsignacionDTO> {
  const { data } = await api.post<Respuesta<ResumenAsignacionDTO>>(
    `/v1/asignaciones/seccion/${encodeURIComponent(seccionId)}`,
    {},
    { timeout: 30000 },
  );
  return data.data;
}

/** POST /v1/import/:tipo con el CSV tal cual (Issues 1.3, 1.4 y 1.5). */
export async function importarCsv(
  tipo: TipoImportacion,
  contenidoCsv: string,
): Promise<ResultadoImportacionDTO> {
  const { data } = await api.post<Respuesta<ResultadoImportacionDTO>>(
    `/v1/import/${tipo}`,
    contenidoCsv,
    { headers: { 'Content-Type': 'text/csv' }, timeout: 120000 },
  );
  return data.data;
}

/** GET /v1/admin/espacios[?tipo=] (Issue 4.15). */
export async function obtenerEspacios(tipo?: TipoEspacio): Promise<EspacioAdminDTO[]> {
  const { data } = await api.get<Respuesta<EspacioAdminDTO[]>>('/v1/admin/espacios', {
    params: tipo ? { tipo } : undefined,
  });
  return data.data;
}

/** GET /v1/admin/espacios/:id (Issue 4.15). */
export async function obtenerEspacio(id: string): Promise<EspacioAdminDTO> {
  const { data } = await api.get<Respuesta<EspacioAdminDTO>>(
    `/v1/admin/espacios/${encodeURIComponent(id)}`,
  );
  return data.data;
}

/**
 * POST /v1/admin/espacios (Issue 4.15, solo Coordinación Académica).
 * Un aula teórica no se envía con software ni PCs; el backend lo rechaza con 400.
 */
export async function crearEspacio(campos: NuevoEspacioDTO): Promise<EspacioAdminDTO> {
  const { data } = await api.post<Respuesta<EspacioAdminDTO>>('/v1/admin/espacios', campos);
  return data.data;
}

/**
 * PATCH /v1/admin/espacios/:id (Issue 4.15).
 * Solo se envían los campos que cambian: el backend rechaza con 403 cualquier campo
 * fuera de `camposEditables` del rol, y exige al menos un campo modificado.
 */
export async function editarEspacio(
  id: string,
  cambios: CambiosEspacio,
): Promise<ResultadoEdicionEspacioDTO> {
  const { data } = await api.patch<Respuesta<ResultadoEdicionEspacioDTO>>(
    `/v1/admin/espacios/${encodeURIComponent(id)}`,
    cambios,
  );
  return data.data;
}

export const obtenerLaboratorios = (): Promise<EspacioAdminDTO[]> => obtenerEspacios('LABORATORIO');

/** GET /v1/admin/software?activo=true — catálogo activo (Issue 4.28). */
export async function obtenerCatalogoActivo(): Promise<ListadoSoftwareDTO> {
  const { data } = await api.get<Respuesta<ListadoSoftwareDTO>>('/v1/admin/software', {
    params: { activo: 'true', limit: 100 },
  });
  return data.data;
}

/** POST /v1/admin/laboratorios/:id/software (Issue 4.1). */
export async function registrarSoftware(laboratorioId: string, softwareIds: string[]) {
  const { data } = await api.post<Respuesta<unknown>>(
    `/v1/admin/laboratorios/${encodeURIComponent(laboratorioId)}/software`,
    { softwareIds },
  );
  return data.data;
}

/** POST /v1/admin/laboratorios/:id/pcs-malogradas (Issue 4.2). */
export async function registrarPcsMalogradas(laboratorioId: string, pcsMalogradas: number) {
  const { data } = await api.post<Respuesta<unknown>>(
    `/v1/admin/laboratorios/${encodeURIComponent(laboratorioId)}/pcs-malogradas`,
    { pcsMalogradas },
  );
  return data.data;
}

// ==========================================
// GESTIÓN INDIVIDUAL DE SECCIONES (Issue 4.31)
// ==========================================

export interface FiltrosSecciones {
  periodo?: string;
  q?: string;
  tipo?: TipoEspacio;
  pagina?: number;
  limite?: number;
}

/** GET /v1/admin/secciones[?periodo=&q=&tipo=] (Issue 4.31). */
export async function obtenerSecciones(
  filtros: FiltrosSecciones = {},
): Promise<ListadoSeccionesDTO> {
  const { data } = await api.get<Respuesta<ListadoSeccionesDTO>>('/v1/admin/secciones', {
    params: filtros,
  });
  return data.data;
}

/** PATCH /v1/admin/secciones/:id (Issue 4.31). Solo Coordinación Académica. */
export async function editarSeccion(
  id: string,
  cambios: CambiosSeccion,
): Promise<ResultadoEdicionSeccionDTO> {
  const { data } = await api.patch<Respuesta<ResultadoEdicionSeccionDTO>>(
    `/v1/admin/secciones/${encodeURIComponent(id)}`,
    cambios,
  );
  return data.data;
}

export interface DocenteParaAsignarDTO {
  id: string;
  codigoDocente: string;
  nombre: string;
  departamento: string;
}

/** GET /v1/admin/docentes (Issue 4.31): listado mínimo para asignar docente a una sección. */
export async function obtenerDocentes(): Promise<DocenteParaAsignarDTO[]> {
  const { data } = await api.get<Respuesta<DocenteParaAsignarDTO[]>>('/v1/admin/docentes');
  return data.data;
}

// ==========================================
// AUDITORÍA E HISTORIAL (Issue 4.32)
// ==========================================

export interface FiltrosAuditoria {
  tipo?: TipoEventoAuditoria;
  desde?: string;
  hasta?: string;
  pagina?: number;
  limite?: number;
}

/** GET /v1/admin/auditoria[?tipo=&desde=&hasta=] (Issue 4.32). */
export async function obtenerAuditoria(
  filtros: FiltrosAuditoria = {},
): Promise<ListadoAuditoriaDTO> {
  const { data } = await api.get<Respuesta<ListadoAuditoriaDTO>>('/v1/admin/auditoria', {
    params: filtros,
  });
  return data.data;
}

export interface FiltrosHistorial {
  seccionId?: string;
  periodo?: string;
  estado?: EstadoAsignacion;
  pagina?: number;
  limite?: number;
}

/** GET /v1/admin/asignaciones/historial[?seccionId=&periodo=&estado=] (Issue 4.32). */
export async function obtenerHistorial(
  filtros: FiltrosHistorial = {},
): Promise<ListadoHistorialDTO> {
  const { data } = await api.get<Respuesta<ListadoHistorialDTO>>(
    '/v1/admin/asignaciones/historial',
    {
      params: filtros,
    },
  );
  return data.data;
}

/** GET /v1/admin/reporte/asignaciones[?periodo=] (Issue 4.33). */
export async function obtenerReporteAsignaciones(
  periodo?: string,
): Promise<ReporteAsignacionesDTO> {
  const { data } = await api.get<Respuesta<ReporteAsignacionesDTO>>(
    '/v1/admin/reporte/asignaciones',
    {
      params: periodo ? { periodo } : undefined,
    },
  );
  return data.data;
}

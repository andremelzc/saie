import api from './api';
import type {
  AlertaDTO,
  EspacioAdminDTO,
  ListadoSoftwareDTO,
  ResultadoImportacionDTO,
  ResumenAsignacionDTO,
  SeccionesEscaladasDTO,
  TipoEspacio,
  TipoImportacion,
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

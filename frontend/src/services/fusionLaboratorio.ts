import api from './api';
import type {
  DecisionLaboratorio,
  SolicitudesLaboratorioAdminDTO,
  SolicitudLaboratorioDTO,
} from '../types/fusionLaboratorio';

interface Respuesta<T> {
  success: boolean;
  data: T;
}

/** GET /v1/docente/solicitudes-laboratorio (Issue 7.17): las del docente autenticado. */
export async function obtenerMisSolicitudesLaboratorio(): Promise<SolicitudLaboratorioDTO[]> {
  const { data } = await api.get<Respuesta<SolicitudLaboratorioDTO[]>>(
    '/v1/docente/solicitudes-laboratorio',
  );
  return data.data;
}

/** POST /v1/docente/solicitudes-laboratorio (Issue 7.17). */
export async function crearSolicitudLaboratorio(entrada: {
  seccionTeoriaId: string;
  justificacion: string;
}): Promise<SolicitudLaboratorioDTO> {
  const { data } = await api.post<Respuesta<SolicitudLaboratorioDTO>>(
    '/v1/docente/solicitudes-laboratorio',
    entrada,
  );
  return data.data;
}

/** GET /v1/admin/solicitudes-laboratorio (Issue 7.17): pendientes y últimas resueltas. */
export async function obtenerSolicitudesLaboratorio(): Promise<SolicitudesLaboratorioAdminDTO> {
  const { data } = await api.get<Respuesta<SolicitudesLaboratorioAdminDTO>>(
    '/v1/admin/solicitudes-laboratorio',
  );
  return data.data;
}

/**
 * PATCH /v1/admin/solicitudes-laboratorio/:id/resolver (Issue 7.17). Al aprobar, el servidor
 * junta las secciones y reasigna el laboratorio: puede tardar algunos segundos.
 */
export async function resolverSolicitudLaboratorio(
  id: string,
  decision: DecisionLaboratorio,
): Promise<SolicitudLaboratorioDTO> {
  const { data } = await api.patch<Respuesta<SolicitudLaboratorioDTO>>(
    `/v1/admin/solicitudes-laboratorio/${encodeURIComponent(id)}/resolver`,
    decision,
    { timeout: 60000 },
  );
  return data.data;
}

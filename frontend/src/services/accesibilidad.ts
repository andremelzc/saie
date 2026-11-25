import api from './api';
import type {
  AccesibilidadAdminDTO,
  AccesibilidadDocenteDTO,
  DecisionAccesibilidad,
  SolicitudAccesibilidadAdminDTO,
} from '../types/accesibilidad';

interface Respuesta<T> {
  success: boolean;
  data: T;
}

/** GET /v1/admin/accesibilidad (Issue 3.60): pendientes y aprobadas con sus secciones. */
export async function obtenerAccesibilidad(): Promise<AccesibilidadAdminDTO> {
  const { data } = await api.get<Respuesta<AccesibilidadAdminDTO>>('/v1/admin/accesibilidad');
  return data.data;
}

/**
 * PATCH /v1/admin/accesibilidad/:id/resolver (Issue 3.60). Al aprobar, el servidor reasigna las
 * secciones del alumno: puede tardar algunos segundos.
 */
export async function resolverAccesibilidad(
  id: string,
  decision: DecisionAccesibilidad,
): Promise<SolicitudAccesibilidadAdminDTO> {
  const { data } = await api.patch<Respuesta<SolicitudAccesibilidadAdminDTO>>(
    `/v1/admin/accesibilidad/${encodeURIComponent(id)}/resolver`,
    decision,
    { timeout: 60000 },
  );
  return data.data;
}

/** GET /v1/docente/accesibilidad (Issue 3.61): el estado de la declaración del docente. */
export async function obtenerAccesibilidadDocente(): Promise<AccesibilidadDocenteDTO> {
  const { data } = await api.get<Respuesta<AccesibilidadDocenteDTO>>('/v1/docente/accesibilidad');
  return data.data;
}

/**
 * PUT /v1/docente/accesibilidad (Issue 3.61). Declarar crea una solicitud que Coordinación
 * aprueba; retirarla quita la pendiente o la condición aprobada.
 */
export async function declararAccesibilidadDocente(entrada: {
  declarado: boolean;
  fechaFin?: string | null;
}): Promise<AccesibilidadDocenteDTO> {
  const { data } = await api.put<Respuesta<AccesibilidadDocenteDTO>>(
    '/v1/docente/accesibilidad',
    entrada,
  );
  return data.data;
}

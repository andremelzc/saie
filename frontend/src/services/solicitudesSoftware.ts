import api from './api';
import type {
  EstadoSolicitud,
  ListadoSolicitudesDTO,
  NuevaSolicitudSoftware,
  ResultadoAprobacionDTO,
  SolicitudSoftwareDTO,
} from '../types/solicitudesSoftware';

/** Cliente de las solicitudes de software (Issue 4.29): lado del docente y de Coordinación. */

interface Respuesta<T> {
  success: boolean;
  data: T;
}

/** GET /v1/docente/solicitudes-software — solo las propias, con estado y motivo de rechazo. */
export async function obtenerMisSolicitudes(): Promise<SolicitudSoftwareDTO[]> {
  const { data } = await api.get<Respuesta<SolicitudSoftwareDTO[]>>(
    '/v1/docente/solicitudes-software',
  );
  return data.data;
}

/** POST /v1/docente/solicitudes-software — 409 si el software ya está en el catálogo. */
export async function crearSolicitud(
  solicitud: NuevaSolicitudSoftware,
): Promise<SolicitudSoftwareDTO> {
  const { data } = await api.post<Respuesta<SolicitudSoftwareDTO>>(
    '/v1/docente/solicitudes-software',
    solicitud,
  );
  return data.data;
}

/** GET /v1/admin/solicitudes-software[?estado=] — Coordinación. */
export async function obtenerSolicitudes(estado?: EstadoSolicitud): Promise<ListadoSolicitudesDTO> {
  const { data } = await api.get<Respuesta<ListadoSolicitudesDTO>>(
    '/v1/admin/solicitudes-software',
    { params: { ...(estado ? { estado } : {}), limit: 100 } },
  );
  return data.data;
}

/** PATCH /v1/admin/solicitudes-software/:id/aprobar — crea el software; no lo instala en ningún laboratorio. */
export async function aprobarSolicitud(
  id: string,
  opciones: { agregarASeccion: boolean },
): Promise<ResultadoAprobacionDTO> {
  const { data } = await api.patch<Respuesta<ResultadoAprobacionDTO>>(
    `/v1/admin/solicitudes-software/${encodeURIComponent(id)}/aprobar`,
    opciones,
  );
  return data.data;
}

/** PATCH /v1/admin/solicitudes-software/:id/rechazar — el motivo es obligatorio. */
export async function rechazarSolicitud(
  id: string,
  motivoRechazo: string,
): Promise<SolicitudSoftwareDTO> {
  const { data } = await api.patch<Respuesta<SolicitudSoftwareDTO>>(
    `/v1/admin/solicitudes-software/${encodeURIComponent(id)}/rechazar`,
    { motivoRechazo },
  );
  return data.data;
}

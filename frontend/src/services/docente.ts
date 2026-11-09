import api from './api';
import type {
  CrearIncidenciaDTO,
  EstadoLaboratorioDocenteDTO,
  ExploradorEspaciosDTO,
  FiltrosExplorador,
  HorarioDocenteDTO,
  IncidenciaRegistradaDTO,
} from '../types/docente';

/**
 * Cliente del portal docente (Issues 7.2 a 7.5, integrados en el Issue 7.12). El docente lo
 * identifica el token de la sesión: ninguna llamada envía su código.
 */

interface Respuesta<T> {
  success: boolean;
  data: T;
}

/** Clave de caché compartida: inicio, horario, espacios e incidencias reutilizan la respuesta. */
export const CLAVE_HORARIO_DOCENTE = 'docente:horario';

/** GET /v1/docente/horario — semana completa y asignaciones activas del periodo vigente. */
export async function obtenerHorarioDocente(): Promise<HorarioDocenteDTO> {
  const { data } = await api.get<Respuesta<HorarioDocenteDTO>>('/v1/docente/horario');
  return data.data;
}

/** GET /v1/docente/espacios/explorador — disponibilidad en una franja (por defecto, ahora). */
export async function explorarEspacios(
  filtros: FiltrosExplorador = {},
): Promise<ExploradorEspaciosDTO> {
  const params: Record<string, string> = {};
  if (filtros.tipo) params.tipo = filtros.tipo;
  if (filtros.pabellon) params.pabellon = filtros.pabellon;
  if (filtros.piso !== undefined) params.piso = String(filtros.piso);
  if (filtros.capacidadMinima !== undefined)
    params.capacidadMinima = String(filtros.capacidadMinima);
  if (filtros.soloDisponibles) params.soloDisponibles = 'true';
  // La franja solo se envía completa: el backend rechaza una franja a medias.
  if (filtros.dia && filtros.horaInicio && filtros.horaFin) {
    params.dia = filtros.dia;
    params.horaInicio = filtros.horaInicio;
    params.horaFin = filtros.horaFin;
  }
  const { data } = await api.get<Respuesta<ExploradorEspaciosDTO>>(
    '/v1/docente/espacios/explorador',
    { params },
  );
  return data.data;
}

/** GET /v1/docente/laboratorio-estado/:espacioId — solo laboratorios con una clase suya. */
export async function obtenerEstadoLaboratorio(
  espacioId: string,
): Promise<EstadoLaboratorioDocenteDTO> {
  const { data } = await api.get<Respuesta<EstadoLaboratorioDocenteDTO>>(
    `/v1/docente/laboratorio-estado/${encodeURIComponent(espacioId)}`,
  );
  return data.data;
}

/** POST /v1/docente/incidencias — devuelve el identificador de seguimiento (INC-XXXXXXXX). */
export async function reportarIncidencia(
  incidencia: CrearIncidenciaDTO,
): Promise<IncidenciaRegistradaDTO> {
  const { data } = await api.post<Respuesta<IncidenciaRegistradaDTO>>(
    '/v1/docente/incidencias',
    incidencia,
  );
  return data.data;
}

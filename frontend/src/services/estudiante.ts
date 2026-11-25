import api from './api';
import type { CursoMatriculadoDTO, HorarioSemanalDTO } from '../types/horario';
import type { MapaOcupacionEntrada } from '../components/mapa2d/enlacePlano';
import type { Franja } from '../components/mapa2d/franja';
import type { RutaReferencia } from '../components/ruta/tipos';
import type { CambiosPerfil, EstadoTelegramDTO, PerfilAlumnoDTO } from '../types/perfil';

/**
 * Cliente del portal del alumno (Issues 3.10, 3.11 y 3.12). Todo sale de la base de datos vía
 * el backend: el alumno lo identifica el token de la sesión, nunca un parámetro.
 */

interface Respuesta<T> {
  success: boolean;
  data: T;
}

/** GET /v1/estudiante/horario — semana completa agrupada por día. */
export async function obtenerHorario(): Promise<HorarioSemanalDTO> {
  const { data } = await api.get<Respuesta<HorarioSemanalDTO>>('/v1/estudiante/horario');
  return data.data;
}

/** GET /v1/estudiante/cursos — cursos matriculados del periodo vigente. */
export async function obtenerCursos(): Promise<{
  periodo: string | null;
  cursos: CursoMatriculadoDTO[];
}> {
  const { data } =
    await api.get<Respuesta<{ periodo: string | null; cursos: CursoMatriculadoDTO[] }>>(
      '/v1/estudiante/cursos',
    );
  return data.data;
}

/** GET /v1/estudiante/perfil — datos personales y ficha médica del propio alumno. */
export async function obtenerPerfil(): Promise<PerfilAlumnoDTO> {
  const { data } = await api.get<Respuesta<PerfilAlumnoDTO>>('/v1/estudiante/perfil');
  return data.data;
}

/** PATCH /v1/estudiante/perfil — devuelve el perfil ya actualizado. */
export async function guardarPerfil(cambios: CambiosPerfil): Promise<PerfilAlumnoDTO> {
  const { data } = await api.patch<Respuesta<PerfilAlumnoDTO>>('/v1/estudiante/perfil', cambios);
  return data.data;
}

/** GET /v1/estudiante/telegram — estado de la vinculación con el bot (Issue 3.28). */
export async function obtenerTelegram(): Promise<EstadoTelegramDTO> {
  const { data } = await api.get<Respuesta<EstadoTelegramDTO>>('/v1/estudiante/telegram');
  return data.data;
}

/** DELETE /v1/estudiante/telegram — da de baja la vinculación activa (Issue 3.28). */
export async function desvincularTelegram(): Promise<EstadoTelegramDTO> {
  const { data } = await api.delete<Respuesta<EstadoTelegramDTO>>('/v1/estudiante/telegram');
  return data.data;
}

/**
 * GET /v1/estudiante/mapa-ocupacion — estado (libre u ocupado) de cada espacio de un piso de un
 * pabellón (Issue 3.13). Sin franja, el momento actual en hora de Lima.
 */
export async function obtenerMapaOcupacion(
  pabellon: string,
  piso: number,
  franja: Franja | null,
): Promise<MapaOcupacionEntrada> {
  const { data } = await api.get<Respuesta<MapaOcupacionEntrada>>('/v1/estudiante/mapa-ocupacion', {
    params: { pabellon, piso, ...(franja ?? {}) },
  });
  return data.data;
}

/** GET /v1/estudiante/ruta/:asignacionId — ruta de referencia hacia el espacio asignado (3.14 y 3.15). */
export async function obtenerRuta(asignacionId: string): Promise<RutaReferencia> {
  const { data } = await api.get<Respuesta<RutaReferencia>>(
    `/v1/estudiante/ruta/${encodeURIComponent(asignacionId)}`,
  );
  return data.data;
}

/** Mensaje legible para mostrar a la persona usuaria (ver `services/errores.ts`). */
export { mensajeDeError } from './errores';

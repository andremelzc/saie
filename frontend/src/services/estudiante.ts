import api from './api';
import type { CursoMatriculadoDTO, HorarioSemanalDTO } from '../types/horario';
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

/** Mensaje legible para mostrar a la persona usuaria (ver `services/errores.ts`). */
export { mensajeDeError } from './errores';

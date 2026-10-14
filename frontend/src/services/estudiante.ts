import axios from 'axios';
import api from './api';
import type { CursoMatriculadoDTO, HorarioSemanalDTO } from '../types/horario';
import type { CambiosPerfil, PerfilAlumnoDTO } from '../types/perfil';

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
  const { data } = await api.get<
    Respuesta<{ periodo: string | null; cursos: CursoMatriculadoDTO[] }>
  >('/v1/estudiante/cursos');
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

/** Mensaje legible para mostrar al alumno a partir de un error de red o del backend. */
export function mensajeDeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const mensaje = (error.response?.data as { message?: unknown } | undefined)?.message;
    if (typeof mensaje === 'string' && mensaje.length > 0) return mensaje;
    if (!error.response) return 'Revisa tu conexión e inténtalo de nuevo.';
  }
  return 'Inténtalo de nuevo en unos minutos.';
}

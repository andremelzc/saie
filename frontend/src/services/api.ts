import axios from 'axios';
import { borrarSesion, obtenerToken } from './sesion';

/**
 * Tiempo máximo de espera por defecto. La base de datos es Supabase con pooler y las consultas
 * de horario y espacios tardan varios segundos: 10 s cortaban peticiones válidas. Los endpoints
 * pesados (corrida de asignación, importación) amplían este valor en su propia llamada.
 */
export const TIMEOUT_POR_DEFECTO = 30000;

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: TIMEOUT_POR_DEFECTO,
});

/** Endpoints de login: no llevan token y un 401 aquí significa "credenciales inválidas". */
const RUTA_LOGIN = /\/auth\/(admin|alumno|docente)\/login\/?$/;

export function esPeticionDeLogin(url?: string): boolean {
  return Boolean(url) && RUTA_LOGIN.test((url as string).split('?')[0]);
}

let manejadorSesionExpirada: (() => void) | null = null;

/** El AuthProvider registra aquí qué hacer cuando el servidor rechaza el token (401). */
export function registrarManejadorSesionExpirada(manejador: (() => void) | null): void {
  manejadorSesionExpirada = manejador;
}

/**
 * Resumen legible de un fallo de red para la consola del navegador: método, ruta, código y
 * motivo. Antes se imprimía el objeto de la respuesta tal cual ("Object"), que no decía nada.
 */
export function describirError(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : 'Error desconocido';
  }

  const metodo = (error.config?.method ?? 'get').toUpperCase();
  const url = error.config?.url ?? '(ruta desconocida)';
  const codigo = error.response?.status;

  if (!error.response) {
    const causa = error.code === 'ECONNABORTED' ? 'tiempo de espera agotado' : 'sin respuesta';
    return `${metodo} ${url} — ${causa} (${error.message})`;
  }

  const cuerpo = error.response.data as { message?: unknown; error?: unknown } | undefined;
  const detalle =
    typeof cuerpo?.message === 'string'
      ? cuerpo.message
      : typeof cuerpo?.error === 'string'
        ? cuerpo.error
        : 'sin detalle';

  return `${metodo} ${url} — HTTP ${codigo}: ${detalle}`;
}

// Interceptor de petición: adjunta el token a cada petición (excepto a las de login).
api.interceptors.request.use((config) => {
  const token = obtenerToken();
  if (token && !esPeticionDeLogin(config.url)) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// Interceptor de respuesta: ante un 401 de una petición autenticada cierra la sesión.
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const esLogin = esPeticionDeLogin(error.config?.url);
      // Un 401 en el login es "credenciales inválidas": el formulario lo muestra y no se cierra
      // ninguna sesión. Solo el 401 de una petición ya autenticada invalida la sesión.
      if (error.response?.status === 401 && !esLogin) {
        console.warn('Error en petición API:', describirError(error));
      } else {
        console.error('Error en petición API:', describirError(error));
      }

      const eraAutenticada = Boolean(error.config?.headers?.has('Authorization'));
      // `obtenerToken()` evita procesar varios 401 simultáneos: solo el primero cierra la sesión.
      if (error.response?.status === 401 && eraAutenticada && !esLogin && obtenerToken()) {
        if (manejadorSesionExpirada) {
          manejadorSesionExpirada();
        } else {
          borrarSesion();
        }
      }
    } else {
      console.error('Error en petición API:', error);
    }
    return Promise.reject(error);
  },
);

export default api;

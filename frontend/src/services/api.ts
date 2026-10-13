import axios from 'axios';
import { borrarSesion, obtenerToken } from './sesion';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
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
      console.error('Error en petición API:', error.response?.data || error.message);

      const eraAutenticada = Boolean(error.config?.headers?.has('Authorization'));
      const esLogin = esPeticionDeLogin(error.config?.url);
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

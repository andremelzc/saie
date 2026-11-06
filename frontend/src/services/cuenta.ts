import api from './api';

/** Longitud mínima y máxima de la clave nueva; las mismas que valida el backend (Issue 4.21). */
export const LONGITUD_MINIMA_CLAVE = 8;
export const LONGITUD_MAXIMA_CLAVE = 72;

export interface CambioClaveDTO {
  claveActual: string;
  claveNueva: string;
}

/** Respuesta de `cambiar-clave`: trae un token nuevo, ya sin la marca de clave pendiente. */
export interface ClaveCambiadaDTO {
  debeCambiarClave: false;
  token: string;
  expiresIn: string;
}

/**
 * POST /v1/auth/cambiar-clave (Issue 4.21, los cuatro roles). La cuenta sale del token. Devuelve
 * un token nuevo: quien cambia la clave inicial sigue en el sistema sin volver a iniciar sesión.
 * 400 si la clave actual es incorrecta o la nueva no cumple las reglas.
 */
export async function cambiarClave(cambio: CambioClaveDTO): Promise<ClaveCambiadaDTO> {
  const { data } = await api.post<{ success: boolean; data: ClaveCambiadaDTO }>(
    '/v1/auth/cambiar-clave',
    cambio,
  );
  return data.data;
}

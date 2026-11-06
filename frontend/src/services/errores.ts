import axios from 'axios';
import { TEXTOS_ERROR } from '../config/textos';
import { etiquetaCampoEspacio } from '../utils/diccionarios';

/**
 * Traduce un error de red o del backend a una frase para la persona usuaria.
 *
 * El backend responde `{ success: false, message, errors? }` con frases en español pensadas para
 * personas en los errores de validación y de reglas de negocio (400, 403, 409, 413, 422) y en
 * algunos 404 de consulta. Esas frases se muestran. No se muestra nunca el `message` cuando:
 *  - el estado es 5xx o la respuesta no trae `success: false` (por ejemplo el manejador global de
 *    errores, que fuera de producción devuelve el texto técnico de la excepción);
 *  - el mensaje contiene un identificador interno («El espacio con ID '…' no existe»).
 */

interface CuerpoError {
  success?: unknown;
  error?: unknown;
  message?: unknown;
  errors?: unknown;
}

const ESTADOS_CON_MENSAJE_PROPIO = new Set([400, 403, 404, 409, 413, 422]);

/** UUID o fragmentos «ID '…'»: son datos de la base de datos, no información para personas. */
const IDENTIFICADOR_TECNICO =
  /\bID\s*'[^']*'|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Forma mínima de un error de red: la de `AxiosError` o cualquier objeto con `response`. */
interface ErrorHttp {
  code?: string;
  response?: { status: number; data?: unknown };
}

function comoErrorHttp(error: unknown): ErrorHttp | undefined {
  if (axios.isAxiosError(error)) return error;
  if (typeof error === 'object' && error !== null && 'response' in error) return error as ErrorHttp;
  return undefined;
}

function cuerpoDe(error: unknown): CuerpoError | undefined {
  const datos = comoErrorHttp(error)?.response?.data;
  return datos && typeof datos === 'object' ? (datos as CuerpoError) : undefined;
}

/** Estado HTTP de la respuesta, o `undefined` si no hubo (sin conexión, tiempo agotado). */
export function estadoHttp(error: unknown): number | undefined {
  return comoErrorHttp(error)?.response?.status;
}

/** Lista de causas que el backend detalla en `errors` (por ejemplo, qué campo está mal). */
export function detallesDeError(error: unknown): string[] {
  const errores = cuerpoDe(error)?.errors;
  if (!Array.isArray(errores)) return [];
  return errores.filter((e): e is string => typeof e === 'string' && e.trim() !== '');
}

/**
 * El `message` del backend cuando es seguro mostrarlo; `undefined` si no lo es. Lo usan los
 * formularios que redactan su propio mensaje de respaldo (login y consulta pública).
 */
export function mensajeSeguroDelServidor(error: unknown): string | undefined {
  const respuesta = comoErrorHttp(error)?.response;
  if (!respuesta) return undefined;
  const { status } = respuesta;
  const cuerpo = cuerpoDe(error);
  const mensaje = typeof cuerpo?.message === 'string' ? cuerpo.message.trim() : '';
  // `success: false` es la forma del backend para errores de dominio; `{ error, message }` (sin
  // `success`) es la de las rutas inexistentes y la de los errores no controlados.
  const formaDeDominio =
    cuerpo?.success === false || (cuerpo?.success === undefined && cuerpo?.error === undefined);
  const confiable =
    formaDeDominio &&
    ESTADOS_CON_MENSAJE_PROPIO.has(status) &&
    mensaje !== '' &&
    !IDENTIFICADOR_TECNICO.test(mensaje);
  return confiable ? mensaje : undefined;
}

/** «Tu rol no puede editar: identificador, pabellon» → «Tu rol no puede editar el código y el pabellón.» */
function traducirCamposNoEditables(mensaje: string): string {
  const campos = mensaje
    .slice(mensaje.indexOf(':') + 1)
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
    .map(etiquetaCampoEspacio);
  if (campos.length === 0) return TEXTOS_ERROR.sinPermiso;
  const lista =
    campos.length === 1
      ? campos[0]
      : `${campos.slice(0, -1).join(', ')} y ${campos[campos.length - 1]}`;
  return `Tu rol no puede editar ${lista}.`;
}

/**
 * ¿La petición agotó el tiempo de espera sin respuesta? El servidor pudo terminar igualmente la
 * operación: por eso no se debe afirmar que falló (Issue 4.56).
 */
export function esTiempoAgotado(error: unknown): boolean {
  const errorHttp = comoErrorHttp(error);
  return (
    errorHttp !== undefined &&
    !errorHttp.response &&
    (errorHttp.code === 'ECONNABORTED' || errorHttp.code === 'ETIMEDOUT')
  );
}

export function mensajeDeError(error: unknown): string {
  const errorHttp = comoErrorHttp(error);
  if (!errorHttp) return TEXTOS_ERROR.generico;

  if (!errorHttp.response) {
    // Un tiempo de espera agotado no es una falla de conexión: la operación pudo completarse.
    return errorHttp.code === 'ECONNABORTED' || errorHttp.code === 'ETIMEDOUT'
      ? TEXTOS_ERROR.tiempoAgotado
      : TEXTOS_ERROR.sinConexion;
  }

  const { status } = errorHttp.response;
  if (status === 401) return TEXTOS_ERROR.sesionVencida;
  if (status >= 500) return TEXTOS_ERROR.servidor;

  const mensaje = mensajeSeguroDelServidor(error);
  if (!mensaje) {
    if (status === 403) return TEXTOS_ERROR.sinPermiso;
    if (status === 404) return TEXTOS_ERROR.noEncontrado;
    return TEXTOS_ERROR.generico;
  }

  if (status === 403 && /^Tu rol no puede editar/i.test(mensaje)) {
    return traducirCamposNoEditables(mensaje);
  }

  // En un 400 de validación el mensaje es solo «Parámetros inválidos»: la causa viene en `errors`.
  if (status === 400 && /^Parámetros inválidos$/i.test(mensaje)) {
    const detalles = detallesDeError(error);
    return detalles.length > 0
      ? `${TEXTOS_ERROR.datosInvalidos} ${detalles.join(' ')}`
      : TEXTOS_ERROR.datosInvalidos;
  }

  return mensaje;
}

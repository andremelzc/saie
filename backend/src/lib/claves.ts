import { randomInt } from 'crypto';

/**
 * Alfabeto legible sin caracteres ambiguos (0/O, 1/l/I) para claves que puedan
 * ser dictadas o copiadas a mano (mismo alfabeto usado en restablecerClave).
 */
const ALFABETO_CLAVE = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const LONGITUD_CLAVE_INICIAL = 10;

/**
 * Genera una clave aleatoria criptográficamente segura, nunca derivable del código de usuario.
 */
export function generarClaveInicial(): string {
  return Array.from(
    { length: LONGITUD_CLAVE_INICIAL },
    () => ALFABETO_CLAVE[randomInt(ALFABETO_CLAVE.length)],
  ).join('');
}


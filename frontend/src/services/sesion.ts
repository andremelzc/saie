import type { LoginResponseDTO, RolCuenta } from '../types/auth';

/**
 * Manejo de la sesión del usuario (Issue #217 / 4.25).
 *
 * DECISIÓN DE ALMACENAMIENTO DEL TOKEN: se guarda en `sessionStorage`.
 *  - Ventaja: sobrevive a recargas (F5) dentro de la misma pestaña y se destruye al cerrarla,
 *    por lo que no queda una sesión abierta en un equipo compartido (laboratorios, biblioteca).
 *  - Alternativa descartada: solo en memoria. Es más difícil de robar, pero obligaría a iniciar
 *    sesión en cada recarga de página.
 *  - Alternativa descartada: `localStorage`. Persiste entre pestañas y reinicios del navegador,
 *    lo que amplía el tiempo en que un token robado sería utilizable.
 *
 * RIESGO: cualquier script que se ejecute en la página (una vulnerabilidad XSS) puede leer el
 * `sessionStorage` y robar el token. Se mitiga no renderizando HTML sin sanitizar, sin cargar
 * scripts de terceros y con el vencimiento del token (JWT_EXPIRES_IN, 8 h por defecto).
 * Si el almacenamiento no está disponible, la sesión se mantiene solo en memoria.
 */

export interface Sesion {
  token: string;
  rol: RolCuenta;
  debeCambiarClave: boolean;
}

export const MENSAJE_SESION_VENCIDA = 'Tu sesión venció. Inicia sesión nuevamente para continuar.';

const CLAVE_SESION = 'saie.sesion';
const ROLES_VALIDOS: RolCuenta[] = [
  'COORDINACION_ACADEMICA',
  'JEFATURA_LABORATORIOS',
  'DOCENTE',
  'ALUMNO',
];

let respaldoEnMemoria: Sesion | null = null;

function almacen(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function guardarSesion(resultado: LoginResponseDTO): Sesion {
  const sesion: Sesion = {
    token: resultado.token,
    rol: resultado.rol,
    debeCambiarClave: resultado.debeCambiarClave === true,
  };
  respaldoEnMemoria = sesion;
  try {
    almacen()?.setItem(CLAVE_SESION, JSON.stringify(sesion));
  } catch {
    // Almacenamiento lleno o bloqueado: se usa solo el respaldo en memoria.
  }
  return sesion;
}

/** Lee la sesión guardada sin comprobar su vencimiento. */
export function leerSesionAlmacenada(): Sesion | null {
  try {
    const crudo = almacen()?.getItem(CLAVE_SESION);
    if (crudo) {
      const datos = JSON.parse(crudo) as Partial<Sesion>;
      if (
        typeof datos.token === 'string' &&
        datos.token.length > 0 &&
        ROLES_VALIDOS.includes(datos.rol as RolCuenta)
      ) {
        return {
          token: datos.token,
          rol: datos.rol as RolCuenta,
          debeCambiarClave: datos.debeCambiarClave === true,
        };
      }
      return null;
    }
  } catch {
    // JSON corrupto o almacenamiento inaccesible: se ignora y se usa el respaldo.
  }
  return almacen() === null ? respaldoEnMemoria : null;
}

export function borrarSesion(): void {
  respaldoEnMemoria = null;
  try {
    almacen()?.removeItem(CLAVE_SESION);
  } catch {
    // Nada que borrar si el almacenamiento no está disponible.
  }
}

export function obtenerToken(): string | null {
  return leerSesionAlmacenada()?.token ?? null;
}

/** Instante de expiración del JWT (campo `exp`) en milisegundos, o null si no se puede leer. */
export function obtenerExpiracion(token: string): number | null {
  const partes = token.split('.');
  if (partes.length !== 3) return null;
  try {
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const relleno = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const payload = JSON.parse(atob(relleno)) as { exp?: unknown };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function tokenVencido(token: string, ahora: number = Date.now()): boolean {
  const expiracion = obtenerExpiracion(token);
  return expiracion !== null && expiracion <= ahora;
}

/**
 * Devuelve la sesión guardada si su token sigue vigente. Si estaba vencida, la borra e
 * informa `vencida: true` para poder mostrar el mensaje de sesión vencida.
 */
export function obtenerSesionValida(): { sesion: Sesion | null; vencida: boolean } {
  const sesion = leerSesionAlmacenada();
  if (sesion && tokenVencido(sesion.token)) {
    borrarSesion();
    return { sesion: null, vencida: true };
  }
  return { sesion, vencida: false };
}

/** Utilidades de prueba para la sesión (Issue #217 / 4.25). */

function aBase64Url(objeto: object): string {
  return btoa(JSON.stringify(objeto)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Crea un JWT de prueba (sin firma real) que vence en `exp` (segundos desde la época). */
export function crearToken(exp: number, rol: string = 'ALUMNO'): string {
  return `${aBase64Url({ alg: 'HS256', typ: 'JWT' })}.${aBase64Url({ rol, sub: '1', exp })}.firma`;
}

export function ahoraEnSegundos(): number {
  return Math.floor(Date.now() / 1000);
}

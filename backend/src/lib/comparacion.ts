import { timingSafeEqual } from 'crypto';

/** Compara dos secretos en tiempo constante; si la longitud difiere ya no son iguales. */
export function igualesEnTiempoConstante(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

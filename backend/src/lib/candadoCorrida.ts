import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

/**
 * Candado de las corridas del motor (Issues 2.15 y 5.33 / R28).
 *
 * Combina un flag en memoria (una corrida a la vez en este proceso) con un advisory lock de
 * PostgreSQL (una corrida a la vez entre varias instancias del backend).
 *
 * El advisory lock es **de sesión**: lo suelta la misma sesión que lo tomó, o Postgres cuando esa
 * sesión se cierra. Por eso no puede pasar por el cliente de Prisma de la aplicación, que en
 * producción va por el pooler de Supabase (Supavisor) en modo transacción (`DATABASE_URL`, puerto
 * 6543): cada consulta puede caer en una conexión distinta, el `pg_advisory_unlock` se ejecuta en
 * otra sesión (devuelve `false`) y el candado queda retenido para siempre por una conexión
 * inactiva del pooler, con 409 «Ya hay una corrida de asignación en curso» sin que haya ninguna.
 *
 * Aquí el lock se toma y se suelta con un cliente propio sobre `DIRECT_URL` (conexión de sesión)
 * y `connection_limit=1`: siempre la misma sesión. Si esa sesión muere, Postgres libera el lock
 * solo. Sin `DIRECT_URL` queda solo el candado en memoria.
 */

export const ID_BLOQUEO_CORRIDA = 7142026;

/** Lo mínimo que se usa del cliente del candado (permite inyectar uno falso en las pruebas). */
export interface ClienteCandado {
  $queryRaw<T = unknown>(consulta: TemplateStringsArray, ...valores: unknown[]): Promise<T>;
  $disconnect(): Promise<void>;
}

/**
 * Duración máxima de una corrida antes de considerar el candado en memoria abandonado. Es un
 * resguardo: el candado se suelta siempre en `finally`, pero si algo quedara colgado no debe
 * bloquear las corridas indefinidamente. Configurable con `CANDADO_CORRIDA_LEASE_MS`.
 */
const LEASE_POR_DEFECTO_MS = 30 * 60 * 1000;

function leaseMs(): number {
  const valor = Number(process.env.CANDADO_CORRIDA_LEASE_MS);
  return Number.isFinite(valor) && valor > 0 ? valor : LEASE_POR_DEFECTO_MS;
}

let corridaEnCurso = false;
let inicioCorrida = 0;
/** `undefined`: aún no se intentó crear; `null`: no hay `DIRECT_URL` (solo memoria). */
let clienteCandado: ClienteCandado | null | undefined;

/** URL de sesión con una sola conexión, para que lock y unlock vayan por la misma sesión. */
export function urlSesionCandado(directUrl: string): string {
  try {
    const url = new URL(directUrl);
    url.searchParams.set('connection_limit', '1');
    // El modo pgbouncer de Prisma es para el pooler en modo transacción: aquí no corresponde.
    url.searchParams.delete('pgbouncer');
    return url.toString();
  } catch {
    return directUrl;
  }
}

function obtenerClienteCandado(): ClienteCandado | null {
  if (clienteCandado !== undefined) return clienteCandado;
  const directUrl = process.env.DIRECT_URL?.trim();
  // En las pruebas no se abre una conexión real salvo que se inyecte un cliente.
  if (!directUrl || process.env.NODE_ENV === 'test') {
    clienteCandado = null;
    return clienteCandado;
  }
  clienteCandado = new PrismaClient({
    datasources: { db: { url: urlSesionCandado(directUrl) } },
    log: ['error'],
  });
  return clienteCandado;
}

/** Solo para pruebas: inyecta el cliente del candado (`null` = solo memoria) y reinicia el estado. */
export function establecerClienteCandado(cliente: ClienteCandado | null | undefined): void {
  clienteCandado = cliente;
  corridaEnCurso = false;
  inicioCorrida = 0;
}

/**
 * Cierra la sesión del candado: Postgres suelta cualquier advisory lock que esa sesión retuviera.
 * La próxima consulta del cliente abre una sesión nueva.
 */
async function descartarSesion(cliente: ClienteCandado): Promise<void> {
  try {
    await cliente.$disconnect();
  } catch (error) {
    logger.warn({ err: error }, 'No se pudo cerrar la sesión del candado de corridas');
  }
}

export function hayCorridaEnCurso(): boolean {
  return corridaEnCurso;
}

export async function adquirirCandado(): Promise<boolean> {
  if (corridaEnCurso) {
    const transcurrido = Date.now() - inicioCorrida;
    if (transcurrido < leaseMs()) return false;
    // Resguardo: una corrida que supera el lease se da por abandonada.
    logger.warn(
      { transcurridoMs: transcurrido },
      'Candado de corridas retenido más allá del lease: se libera para no bloquear las corridas',
    );
    await liberarCandado();
  }

  corridaEnCurso = true;
  inicioCorrida = Date.now();

  const cliente = obtenerClienteCandado();
  if (!cliente) return true;

  try {
    const res = await cliente.$queryRaw<
      { locked: boolean }[]
    >`SELECT pg_try_advisory_lock(${ID_BLOQUEO_CORRIDA}) AS locked`;
    if (res?.[0]?.locked === false) {
      corridaEnCurso = false;
      return false;
    }
  } catch (error) {
    // Sin base disponible para el lock se conserva el candado en memoria (una instancia).
    logger.warn(
      { err: error },
      'No se pudo tomar el advisory lock de la corrida; se usa solo el candado en memoria',
    );
  }
  return true;
}

export async function liberarCandado(): Promise<void> {
  const cliente = obtenerClienteCandado();
  try {
    if (!cliente) return;
    try {
      const res = await cliente.$queryRaw<
        { unlocked: boolean }[]
      >`SELECT pg_advisory_unlock(${ID_BLOQUEO_CORRIDA}) AS unlocked`;
      if (res?.[0]?.unlocked === false) {
        // La sesión no tenía el lock (se reconectó o se perdió): se cierra por si acaso, para
        // que ningún lock quede retenido por ella.
        logger.warn(
          'pg_advisory_unlock devolvió false: la sesión del candado no tenía el lock; se cierra la sesión',
        );
        await descartarSesion(cliente);
      }
    } catch (error) {
      logger.warn(
        { err: error },
        'No se pudo soltar el advisory lock de la corrida; se cierra la sesión para liberarlo',
      );
      await descartarSesion(cliente);
    }
  } finally {
    corridaEnCurso = false;
    inicioCorrida = 0;
  }
}

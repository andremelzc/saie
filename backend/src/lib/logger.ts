import pino from 'pino';

/**
 * Issue 1.15 — Logger estructurado (JSON, una línea por evento). Nivel por `LOG_LEVEL`
 * (`fatal|error|warn|info|debug|trace|silent`); por defecto `info`, y `silent` con
 * `NODE_ENV=test` para no ensuciar la salida de las pruebas.
 *
 * Reglas de uso (RNF-09): nunca registrar claves, tokens ni datos personales. En los errores se
 * registra el tipo (`err.name`), no el mensaje, salvo en el manejador global de errores no
 * controlados, donde el detalle técnico es necesario para diagnosticar.
 */
export const NIVELES_LOG = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

export function nivelDeLog(): string {
  const configurado = process.env.LOG_LEVEL?.trim().toLowerCase();
  if (configurado && (NIVELES_LOG as readonly string[]).includes(configurado)) {
    return configurado;
  }
  return process.env.NODE_ENV === 'test' ? 'silent' : 'info';
}

export const logger = pino({
  level: nivelDeLog(),
  base: { service: 'saie-backend' },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;

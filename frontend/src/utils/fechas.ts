/**
 * Único módulo de fechas de la aplicación (Issue 3.50). Todas se muestran en hora de Lima, estén
 * donde estén la persona y el servidor, porque el informe y los horarios se publican así.
 */

/** Todas las fechas se muestran en hora de Lima, estén donde estén la persona y el servidor. */
export const ZONA_HORARIA = 'America/Lima';

export function formatearFechaAlerta(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: ZONA_HORARIA,
  });
}

/** Fecha compacta para «Última carga: 12 oct, 10:32». */
export function formatearFechaCorta(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleString('es-PE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: ZONA_HORARIA,
  });
}

/**
 * «hace 5 min», «hace 3 h»; pasadas 24 horas (o si la fecha es futura) la fecha corta. Sirve para
 * lo que importa por su frescura, como la última carga o la detección de una alerta.
 */
export function formatearFechaRelativa(iso: string, ahora: Date = new Date()): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  const minutos = Math.round((ahora.getTime() - fecha.getTime()) / 60000);
  if (minutos < 0) return formatearFechaCorta(iso);
  if (minutos < 1) return 'ahora mismo';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  return formatearFechaCorta(iso);
}

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** ISO 8601 → «1 de octubre de 2026» (día de Lima). Devuelve null si no es una fecha válida. */
export function formatearFechaLarga(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return null;
  return fecha.toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: ZONA_HORARIA,
  });
}

/**
 * Fecha civil sin hora, «2003-04-12» → «12 de abril de 2003». No pasa por `Date` a propósito: una
 * fecha de nacimiento no es un instante y no debe correrse un día por la zona horaria.
 */
export function formatearFechaCivil(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!coincidencia) return null;
  const [, anio, mes, dia] = coincidencia;
  const nombreMes = MESES[Number(mes) - 1];
  if (!nombreMes) return null;
  return `${Number(dia)} de ${nombreMes} de ${anio}`;
}

/** «domingo 18 de octubre», con el día de Lima. */
export function fechaLarga(fecha: Date): string {
  return new Intl.DateTimeFormat('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: ZONA_HORARIA,
  }).format(fecha);
}

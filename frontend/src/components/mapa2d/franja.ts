export type DiaSemana = 'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES' | 'SABADO';

export const DIAS: { valor: DiaSemana; etiqueta: string }[] = [
  { valor: 'LUNES', etiqueta: 'Lunes' },
  { valor: 'MARTES', etiqueta: 'Martes' },
  { valor: 'MIERCOLES', etiqueta: 'Miércoles' },
  { valor: 'JUEVES', etiqueta: 'Jueves' },
  { valor: 'VIERNES', etiqueta: 'Viernes' },
  { valor: 'SABADO', etiqueta: 'Sábado' },
];

/** Franja a consultar; `null` es «ahora» (el backend usa la hora de Lima). Mismos nombres que 3.13. */
export interface Franja {
  dia: DiaSemana;
  horaInicio: string;
  horaFin: string;
}

export const HORAS = Array.from({ length: 16 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`);

export function franjaPorDefecto(): Franja {
  return { dia: 'LUNES', horaInicio: '08:00', horaFin: '10:00' };
}

/** Número estable por franja: con datos de ejemplo hace que el mapa cambie al elegir otra. */
export function semillaDeFranja(f: Franja | null): number {
  if (!f) return 0;
  let h = 7;
  for (const c of `${f.dia}${f.horaInicio}${f.horaFin}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 1000;
}

export function esFranjaValida(f: Franja): boolean {
  return f.horaInicio < f.horaFin;
}

const DIAS_VALIDOS = new Set<string>(DIAS.map((d) => d.valor));

/** Franja a partir de los parámetros de la URL, o `null` si falta alguno o no es válido. */
export function leerFranja(
  dia: string | null,
  desde: string | null,
  hasta: string | null,
): Franja | null {
  if (!dia || !desde || !hasta || !DIAS_VALIDOS.has(dia)) return null;
  if (!HORAS.includes(desde) || !HORAS.includes(hasta)) return null;
  const f = { dia: dia as DiaSemana, horaInicio: desde, horaFin: hasta };
  return esFranjaValida(f) ? f : null;
}

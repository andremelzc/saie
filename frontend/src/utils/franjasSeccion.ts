import type { DiaSemana } from '../types/consulta';
import type { ResultadoEdicionSeccionDTO } from '../types/admin';
import { DIAS_LECTIVOS, ETIQUETA_DIA, aMinutos } from './horario';
import { plural } from './texto';

/**
 * Issue 4.62 — edición del horario de una sección desde la pantalla de Secciones.
 *
 * Coordinación agrega, cambia y quita franjas sin volver a cargar el CSV completo. Aquí está la
 * validación que se hace antes de enviar (el backend la repite): formato HH:mm, inicio antes
 * que el fin y que las franjas de la misma sección no se crucen.
 */

/** Días que se pueden elegir: lunes a sábado y, al final, domingo. */
export const DIAS_FRANJA: DiaSemana[] = [...DIAS_LECTIVOS, 'DOMINGO'];

export interface Franja {
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
}

/** Una franja en el formulario: lleva una clave estable para React mientras se edita. */
export interface FranjaEditable extends Franja {
  clave: string;
}

const HORA_HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

let siguienteClave = 0;
function nuevaClave(): string {
  siguienteClave += 1;
  return `franja-${siguienteClave}`;
}

/** Las franjas actuales de la sección, listas para editar. */
export function aFranjasEditables(franjas: Franja[]): FranjaEditable[] {
  return franjas.map((f) => ({
    clave: nuevaClave(),
    diaSemana: f.diaSemana,
    horaInicio: f.horaInicio.slice(0, 5),
    horaFin: f.horaFin.slice(0, 5),
  }));
}

/**
 * Franja nueva: el día siguiente a la última franja (o lunes) de 08:00 a 10:00, para que el
 * formulario no arranque con una franja que ya choca con otra.
 */
export function nuevaFranja(existentes: Franja[]): FranjaEditable {
  const ultima = existentes[existentes.length - 1];
  const indice = ultima ? DIAS_FRANJA.indexOf(ultima.diaSemana) : -1;
  const dia = DIAS_FRANJA[(indice + 1) % DIAS_LECTIVOS.length];
  return { clave: nuevaClave(), diaSemana: dia, horaInicio: '08:00', horaFin: '10:00' };
}

/** «Lunes 08:00 – 10:00». */
export function textoFranja(f: Franja): string {
  return `${ETIQUETA_DIA[f.diaSemana]} ${f.horaInicio} – ${f.horaFin}`;
}

function seCruzan(a: Franja, b: Franja): boolean {
  return (
    a.diaSemana === b.diaSemana &&
    aMinutos(a.horaInicio) < aMinutos(b.horaFin) &&
    aMinutos(b.horaInicio) < aMinutos(a.horaFin)
  );
}

/** Error de cada franja, por su clave. Una franja sin error no aparece en el resultado. */
export function validarFranjas(franjas: FranjaEditable[]): Record<string, string> {
  const errores: Record<string, string> = {};
  franjas.forEach((f, i) => {
    if (!HORA_HHMM.test(f.horaInicio) || !HORA_HHMM.test(f.horaFin)) {
      errores[f.clave] = 'Escribe la hora de inicio y la de fin (HH:mm).';
      return;
    }
    if (aMinutos(f.horaInicio) >= aMinutos(f.horaFin)) {
      errores[f.clave] = 'La hora de inicio debe ser anterior a la hora de fin.';
      return;
    }
    const cruce = franjas.slice(0, i).find((otra) => !errores[otra.clave] && seCruzan(f, otra));
    if (cruce) errores[f.clave] = `Se cruza con la franja ${textoFranja(cruce)}.`;
  });
  return errores;
}

function clave(franjas: Franja[]): string {
  return franjas
    .map(
      (f) =>
        `${DIAS_FRANJA.indexOf(f.diaSemana)}|${f.horaInicio.slice(0, 5)}|${f.horaFin.slice(0, 5)}`,
    )
    .sort()
    .join(';');
}

/** ¿Son las mismas franjas, sin importar el orden? */
export function mismasFranjas(a: Franja[], b: Franja[]): boolean {
  return clave(a) === clave(b);
}

/** Lo que se envía al backend: sin la clave del formulario. */
export function aFranjas(franjas: FranjaEditable[]): Franja[] {
  return franjas.map(({ diaSemana, horaInicio, horaFin }) => ({ diaSemana, horaInicio, horaFin }));
}

/** Id del primer campo de una franja: el resumen de errores lleva el foco ahí. */
export function idCampoFranja(idBase: string, clave: string): string {
  return `${idBase}-${clave}-dia`;
}

/**
 * Mensaje al guardar (Issue 4.62): si el horario cambió, dice cómo quedó la sección al
 * reasignarla; si además hubo alertas, las cuenta.
 */
export function mensajeGuardadoSeccion(resultado: ResultadoEdicionSeccionDTO): {
  tono: 'exito' | 'info';
  texto: string;
} {
  const partes: string[] = [];
  const r = resultado.reasignacion;
  if (r?.estado === 'ESCALADA') {
    partes.push(
      `El horario se guardó, pero la sección quedó en revisión: ${r.motivoEscalamiento ?? 'no se encontró un aula libre'}.`,
    );
  } else if (r?.conservada) {
    partes.push('El horario se guardó y la sección conserva su aula.');
  } else if (r) {
    partes.push('El horario se guardó y la sección se reasignó.');
  }
  if (resultado.alertas.length > 0) {
    partes.push(
      `${partes.length > 0 ? 'Además, se generó' : 'La sección se guardó y generó'} ${plural(resultado.alertas.length, 'alerta', 'alertas')} en el panel.`,
    );
  }
  if (partes.length === 0) return { tono: 'exito', texto: 'Sección actualizada.' };
  const tono = r?.estado === 'ESCALADA' || resultado.alertas.length > 0 ? 'info' : 'exito';
  return { tono, texto: partes.join(' ') };
}

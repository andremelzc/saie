import { LONGITUD_MAXIMA_CLAVE, LONGITUD_MINIMA_CLAVE } from '../services/cuenta';

export interface ErroresCambioClave {
  claveActual?: string;
  claveNueva?: string;
  confirmacion?: string;
}

/** Reglas que se pueden comprobar sin el servidor; las demás (clave actual, código) las dice él. */
export function validarCambioClave(
  claveActual: string,
  claveNueva: string,
  confirmacion: string,
): ErroresCambioClave {
  const errores: ErroresCambioClave = {};
  if (claveActual === '') errores.claveActual = 'Escribe tu clave actual.';
  if (claveNueva.length < LONGITUD_MINIMA_CLAVE) {
    errores.claveNueva = `La clave nueva debe tener al menos ${LONGITUD_MINIMA_CLAVE} caracteres.`;
  } else if (claveNueva.length > LONGITUD_MAXIMA_CLAVE) {
    errores.claveNueva = `La clave nueva no puede superar los ${LONGITUD_MAXIMA_CLAVE} caracteres.`;
  } else if (claveActual !== '' && claveNueva === claveActual) {
    errores.claveNueva = 'La clave nueva debe ser distinta de la actual.';
  }
  if (confirmacion !== claveNueva) errores.confirmacion = 'Las dos claves nuevas no coinciden.';
  return errores;
}

/**
 * Preferencias de la app del alumno (Issue 3.17). Son ajustes de este dispositivo, no datos de
 * la cuenta: se guardan en `localStorage` y no pasan por el backend. Si el almacenamiento no
 * está disponible (modo privado, política del navegador) la app sigue funcionando con los
 * valores por defecto.
 */

export interface PreferenciasApp {
  /** Quita animaciones y transiciones. */
  reducirMovimiento: boolean;
  /** Aumenta el tamaño base del texto. */
  textoGrande: boolean;
}

export const PREFERENCIAS_POR_DEFECTO: PreferenciasApp = {
  reducirMovimiento: false,
  textoGrande: false,
};

export const CLAVE_PREFERENCIAS = 'saie.preferencias';

const CLASE_SIN_MOVIMIENTO = 'saie-sin-movimiento';
const CLASE_TEXTO_GRANDE = 'saie-texto-grande';

/** Si el sistema operativo pide menos movimiento, ese es el valor inicial (guía de estilos). */
function sistemaPideMenosMovimiento(): boolean {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  } catch {
    return false;
  }
}

export function leerPreferencias(): PreferenciasApp {
  try {
    const crudo = window.localStorage.getItem(CLAVE_PREFERENCIAS);
    if (!crudo) {
      return { ...PREFERENCIAS_POR_DEFECTO, reducirMovimiento: sistemaPideMenosMovimiento() };
    }
    const datos = JSON.parse(crudo) as Partial<PreferenciasApp> | null;
    return {
      reducirMovimiento: datos?.reducirMovimiento === true,
      textoGrande: datos?.textoGrande === true,
    };
  } catch {
    return { ...PREFERENCIAS_POR_DEFECTO, reducirMovimiento: sistemaPideMenosMovimiento() };
  }
}

export function guardarPreferencias(preferencias: PreferenciasApp): void {
  try {
    window.localStorage.setItem(CLAVE_PREFERENCIAS, JSON.stringify(preferencias));
  } catch {
    // Sin almacenamiento: la preferencia vale solo mientras la pestaña siga abierta.
  }
}

/** Refleja las preferencias en <html> para que los estilos globales las apliquen. */
export function aplicarPreferencias(preferencias: PreferenciasApp): void {
  const raiz = document.documentElement;
  raiz.classList.toggle(CLASE_SIN_MOVIMIENTO, preferencias.reducirMovimiento);
  raiz.classList.toggle(CLASE_TEXTO_GRANDE, preferencias.textoGrande);
}

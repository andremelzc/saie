import { useEffect } from 'react';

export const TITULO_BASE = 'SAIE · Sistema de Asignación Inteligente de Espacios';

/**
 * Pone el título de la pestaña del navegador según la pantalla («Espacios · SAIE»). Sin esto
 * todas las rutas se llamaban igual y un lector de pantalla no podía distinguirlas (WCAG 2.4.2).
 * Al salir de la pantalla se restaura el título base.
 */
export function useTituloPagina(titulo?: string): void {
  useEffect(() => {
    document.title = titulo ? `${titulo} · SAIE` : TITULO_BASE;
    return () => {
      document.title = TITULO_BASE;
    };
  }, [titulo]);

  // Al navegar dentro de la SPA el foco queda en el enlace anterior y el lector de pantalla no
  // anuncia la página nueva: se mueve al <h1> (Issue 3.45).
  useEffect(() => {
    if (pantallaInicial) {
      // La carga inicial no es una navegación: el foco se queda donde el navegador lo pone. El
      // aplazamiento evita que el doble efecto de StrictMode, en desarrollo, la cuente como tal.
      setTimeout(() => {
        pantallaInicial = false;
      }, 0);
      return;
    }
    moverFocoAlEncabezado();
  }, [titulo]);
}

let pantallaInicial = true;

/** Lo que la persona está haciendo ahora y no se debe interrumpir (escribir, un diálogo abierto). */
function hayInteraccionEnCurso(activo: Element | null): boolean {
  if (!activo || activo === document.body) return false;
  if (activo.closest('[role="dialog"], [aria-modal="true"]')) return true;
  return activo.matches('input, textarea, select, [contenteditable="true"]');
}

function moverFocoAlEncabezado(): void {
  if (hayInteraccionEnCurso(document.activeElement)) return;
  const encabezado = document.querySelector<HTMLElement>('h1');
  if (!encabezado) return;
  if (!encabezado.hasAttribute('tabindex')) encabezado.setAttribute('tabindex', '-1');
  encabezado.focus({ preventScroll: true });
}

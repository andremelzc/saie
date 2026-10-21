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
}

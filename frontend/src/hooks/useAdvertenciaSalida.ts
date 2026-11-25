import { useEffect } from 'react';

/**
 * Pide confirmación al navegador antes de cerrar la pestaña o recargar la página mientras haya
 * cambios sin guardar. (La navegación interna entre pantallas no se intercepta: la aplicación
 * usa `BrowserRouter`, que no admite bloquear rutas.)
 */
export function useAdvertenciaSalida(hayCambios: boolean): void {
  useEffect(() => {
    if (!hayCambios) return;
    const alSalir = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
    };
    window.addEventListener('beforeunload', alSalir);
    return () => window.removeEventListener('beforeunload', alSalir);
  }, [hayCambios]);
}

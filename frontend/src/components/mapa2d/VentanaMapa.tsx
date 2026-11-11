import { clasesBoton } from '../ui/clasesBoton';
import React, { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAtraparFoco } from '../../hooks/useAtraparFoco';

export interface VentanaMapaProps {
  titulo: string;
  onCerrar: () => void;
  children: React.ReactNode;
}

/**
 * Ventana modal que cubre casi toda la página y contiene solo el mapa. No es la pantalla completa
 * del navegador: la página queda detrás, atenuada, y se vuelve a ella con «Cerrar», Escape o un
 * clic fuera. El foco queda dentro de la ventana y regresa al botón que la abrió.
 */
export const VentanaMapa: React.FC<VentanaMapaProps> = ({ titulo, onCerrar, children }) => {
  const idTitulo = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);

  useAtraparFoco({
    activo: true,
    contenedorRef: panelRef,
    alEscape: onCerrar,
    focoInicial: () => cerrarRef.current,
  });

  return createPortal(
    <div className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4">
      <div
        className="saie-velo absolute inset-0 bg-saie-text/60"
        aria-hidden="true"
        onClick={onCerrar}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className="saie-deslizar relative flex h-full max-h-[calc(100vh-1rem)] w-full max-w-[calc(100vw-1rem)] flex-col gap-3 overflow-hidden rounded-2xl bg-saie-canvas p-3 shadow-lg sm:max-h-[calc(100vh-2rem)] sm:max-w-[calc(100vw-2rem)] sm:p-4"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id={idTitulo} className="m-0 text-lg font-bold text-saie-text">
            {titulo}
          </h2>
          <button
            ref={cerrarRef}
            type="button"
            onClick={onCerrar}
            className={`${clasesBoton('cancelar', 'sm')} shrink-0`}
          >
            Cerrar
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
};

export default VentanaMapa;

import React, { useEffect, useId, useRef } from 'react';

export interface DrawerProps {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  children: React.ReactNode;
}

const SELECTOR_ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Panel lateral accesible: diálogo modal, cierre con Escape y con el fondo, foco inicial
 * en el botón de cierre y foco devuelto al elemento que lo abrió.
 */
export const Drawer: React.FC<DrawerProps> = ({ abierto, onCerrar, titulo, children }) => {
  const idTitulo = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const alCerrarRef = useRef(onCerrar);

  useEffect(() => {
    alCerrarRef.current = onCerrar;
  }, [onCerrar]);

  useEffect(() => {
    if (!abierto) return;

    const anterior = document.activeElement as HTMLElement | null;
    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cerrarRef.current?.focus();

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        alCerrarRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      const enfocables = panelRef.current?.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLES);
      if (!enfocables || enfocables.length === 0) return;
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('keydown', alTeclear);
      document.body.style.overflow = overflowOriginal;
      anterior?.focus?.();
    };
  }, [abierto]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-saie-text/40" onClick={onCerrar} aria-hidden="true" />
      {/*
        Se usa `role="dialog"` en un div y no el elemento `<dialog>`: el nativo exige
        `showModal()` (que jsdom no implementa) y reimplementa el foco, lo que rompería el
        cierre con Escape y la devolución del foco al elemento que lo abrió. La excepción
        está documentada en `sonar-project.properties` (regla typescript:S6819).
      */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className="saie-fundido relative flex h-full w-full max-w-2xl flex-col bg-saie-canvas shadow-[var(--saie-shadow-3)]"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-saie-divider bg-white px-5 py-4">
          <h2 id={idTitulo} className="m-0 text-lg font-bold text-saie-text">
            {titulo}
          </h2>
          <button
            ref={cerrarRef}
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-saie-border bg-white text-xl text-saie-text hover:bg-saie-canvas"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
};

export default Drawer;

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ContextoAvisos, type TonoAvisoGlobal } from './avisosContexto';

const ESTILOS: Record<TonoAvisoGlobal, string> = {
  exito: 'border-saie-success/40 bg-saie-success-soft text-saie-success-strong',
  error: 'border-saie-danger/40 bg-saie-danger-soft text-saie-danger-strong',
  info: 'border-saie-divider bg-white text-saie-text',
};

interface AvisoItem {
  id: number;
  tono: TonoAvisoGlobal;
  texto: string;
}

/**
 * Región viva siempre montada para confirmaciones y errores transitorios.
 * Los errores que exigen corregir algo deben ir inline junto al control, no solo en un toast.
 */
export const ProveedorAvisos: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [avisos, setAvisos] = useState<AvisoItem[]>([]);
  const temporizadores = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(
    () => () => {
      temporizadores.current.forEach((t) => clearTimeout(t));
    },
    [],
  );

  const cerrar = useCallback((id: number) => {
    setAvisos((previos) => previos.filter((a) => a.id !== id));
  }, []);

  const mostrar = useCallback(
    (tono: TonoAvisoGlobal, texto: string) => {
      const id = Date.now() + Math.random();
      setAvisos((previos) => [...previos, { id, tono, texto }]);
      const temporizador = setTimeout(
        () => {
          cerrar(id);
          temporizadores.current = temporizadores.current.filter((t) => t !== temporizador);
        },
        tono === 'error' ? 8000 : 5000,
      );
      temporizadores.current.push(temporizador);
    },
    [cerrar],
  );

  const valor = useMemo(() => ({ mostrar }), [mostrar]);

  return (
    <ContextoAvisos.Provider value={valor}>
      {children}
      {/* La región vive siempre en el DOM: si se monta con el mensaje, el lector no lo anuncia. */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex flex-col items-end gap-2 md:bottom-6 md:left-auto md:right-6 md:w-96"
      >
        {avisos.map((a) => (
          <div
            key={a.id}
            className={`pointer-events-auto flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-[var(--saie-shadow-3)] ${ESTILOS[a.tono]}`}
          >
            <span className="min-w-0 flex-1">{a.texto}</span>
            <button
              type="button"
              onClick={() => cerrar(a.id)}
              aria-label="Cerrar aviso"
              className="-mr-1 shrink-0 rounded-md px-1.5 text-base leading-6 opacity-70 hover:opacity-100"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        ))}
      </div>
    </ContextoAvisos.Provider>
  );
};

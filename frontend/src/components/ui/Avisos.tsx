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
 * Secuencia incremental para identificar cada aviso. No se usa un número aleatorio: el id solo
 * sirve para distinguir los avisos dentro de la sesión y un contador es suficiente.
 */
let secuencia = 0;

/** Tiempo visible de un aviso; los errores duran más. */
const DURACION_MS = { normal: 5000, error: 8000 };
/** Si el cursor o el foco están sobre los avisos, se vuelve a comprobar pasado este tiempo. */
const REINTENTO_PAUSA_MS = 2000;

/**
 * Avisos transitorios (confirmaciones y errores) en dos regiones vivas siempre montadas: una
 * amable (`status`) para éxito e información y otra asertiva (`alert`) para errores, que se
 * anuncian de inmediato. Si la persona tiene el cursor o el foco sobre un aviso, no se cierra
 * (WCAG 2.2.1). Los errores que exigen corregir algo deben ir también junto al control.
 */
export const ProveedorAvisos: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [avisos, setAvisos] = useState<AvisoItem[]>([]);
  const temporizadores = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pausado = useRef(false);

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
      const id = (secuencia += 1);
      setAvisos((previos) => [...previos, { id, tono, texto }]);

      const programar = (espera: number) => {
        const temporizador = setTimeout(() => {
          temporizadores.current = temporizadores.current.filter((t) => t !== temporizador);
          if (pausado.current) {
            programar(REINTENTO_PAUSA_MS);
            return;
          }
          cerrar(id);
        }, espera);
        temporizadores.current.push(temporizador);
      };
      programar(tono === 'error' ? DURACION_MS.error : DURACION_MS.normal);
    },
    [cerrar],
  );

  const valor = useMemo(() => ({ mostrar }), [mostrar]);

  const tarjeta = (a: AvisoItem) => (
    <div
      key={a.id}
      className={`pointer-events-auto flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-saie-pop ${ESTILOS[a.tono]}`}
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
  );

  return (
    <ContextoAvisos.Provider value={valor}>
      {children}
      {/* Las regiones viven siempre en el DOM: si se montan con el mensaje, el lector no lo anuncia.
          Solo llevan `aria-live` (sin `role`) para no aparecer como alertas vacías en el árbol. */}
      <div
        onMouseEnter={() => (pausado.current = true)}
        onMouseLeave={() => (pausado.current = false)}
        onFocus={() => (pausado.current = true)}
        onBlur={() => (pausado.current = false)}
        className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex flex-col items-end gap-2 md:bottom-6 md:left-auto md:right-6 md:w-96"
      >
        <div
          aria-live="polite"
          aria-atomic="false"
          className="flex w-full flex-col items-end gap-2"
        >
          {avisos.filter((a) => a.tono !== 'error').map(tarjeta)}
        </div>
        <div
          aria-live="assertive"
          aria-atomic="false"
          className="flex w-full flex-col items-end gap-2"
        >
          {avisos.filter((a) => a.tono === 'error').map(tarjeta)}
        </div>
      </div>
    </ContextoAvisos.Provider>
  );
};

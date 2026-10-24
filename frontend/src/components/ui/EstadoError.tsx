import React, { useState } from 'react';
import { Boton } from './Boton';

export interface EstadoErrorProps {
  /** Qué pasó y, si se sabe, cómo seguir (ya traducido: nunca texto técnico del backend). */
  mensaje: React.ReactNode;
  /** Si se da, muestra el botón «Reintentar». */
  onReintentar?: () => void | Promise<void>;
  /** Fuerza el estado de carga; si no se da, se deduce de la promesa que devuelve `onReintentar`. */
  reintentando?: boolean;
  /** Texto del botón; «Reintentar» por defecto. Tras un tiempo agotado conviene «Actualizar». */
  etiquetaAccion?: string;
  className?: string;
}

/**
 * Bloque de error de carga: ícono + mensaje + «Reintentar». Es el único con este aspecto en todo
 * el sistema (antes había siete variantes, unas con la paleta de error y otras con colores
 * ajenos). Es una alerta: se anuncia en cuanto aparece.
 *
 * «Reintentar» queda deshabilitado y con «Reintentando…» mientras dura la operación, para que un
 * segundo clic no lance una petición duplicada (Issue 3.42). Si `onReintentar` devuelve una
 * promesa, el estado se deduce de ella; si no, lo controla quien llama con `reintentando`.
 */
export const EstadoError: React.FC<EstadoErrorProps> = ({
  mensaje,
  onReintentar,
  reintentando = false,
  etiquetaAccion = 'Reintentar',
  className = '',
}) => {
  const [pendiente, setPendiente] = useState(false);

  const alReintentar = () => {
    const resultado = onReintentar?.();
    if (resultado instanceof Promise) {
      setPendiente(true);
      void resultado.finally(() => setPendiente(false));
    }
  };

  return (
    <div
      role="alert"
      className={`flex flex-col items-start gap-3 rounded-xl border border-saie-danger/30 bg-saie-danger-soft p-4 text-sm font-medium text-saie-danger-strong sm:flex-row sm:flex-wrap sm:items-center sm:justify-between ${className}`}
    >
      <p className="m-0 flex min-w-0 flex-1 items-start gap-2">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mt-0.5 h-5 w-5 shrink-0"
        >
          <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{mensaje}</span>
      </p>
      {onReintentar && (
        <Boton
          variante="secundario"
          tamano="sm"
          onClick={alReintentar}
          cargando={reintentando || pendiente}
          textoCargando="Reintentando…"
        >
          {etiquetaAccion}
        </Boton>
      )}
    </div>
  );
};

export default EstadoError;

import React from 'react';
import { Boton } from './Boton';

export interface EstadoErrorProps {
  /** Qué pasó y, si se sabe, cómo seguir (ya traducido: nunca texto técnico del backend). */
  mensaje: React.ReactNode;
  /** Si se da, muestra el botón «Reintentar». */
  onReintentar?: () => void;
  reintentando?: boolean;
  className?: string;
}

/**
 * Bloque de error de carga: ícono + mensaje + «Reintentar». Es el único con este aspecto en todo
 * el sistema (antes había siete variantes, unas con la paleta de error y otras con colores
 * ajenos). Es una alerta: se anuncia en cuanto aparece.
 */
export const EstadoError: React.FC<EstadoErrorProps> = ({
  mensaje,
  onReintentar,
  reintentando = false,
  className = '',
}) => (
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
        onClick={onReintentar}
        cargando={reintentando}
        textoCargando="Reintentando…"
      >
        Reintentar
      </Boton>
    )}
  </div>
);

export default EstadoError;

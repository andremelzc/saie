import React, { useState } from 'react';

export interface AcordeonProps {
  titulo: string;
  abiertoInicial?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Acordeón basado en `<details>` nativo (el mismo patrón accesible de `AyudaAlumno`).
 * Conserva el foco visible, el teclado y el anuncio del estado sin JavaScript extra.
 */
export const Acordeon: React.FC<AcordeonProps> = ({
  titulo,
  abiertoInicial = false,
  className = '',
  children,
}) => {
  const [abierto, setAbierto] = useState(abiertoInicial);

  return (
    <details
      open={abierto}
      onToggle={(e) => setAbierto(e.currentTarget.open)}
      className={`group rounded-xl border border-saie-divider bg-white ${className}`}
    >
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-5 py-3 font-semibold text-saie-text hover:bg-saie-canvas focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-saie-text [&::-webkit-details-marker]:hidden">
        <span>{titulo}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-5 w-5 shrink-0 text-saie-primary transition-transform motion-reduce:transition-none ${
            abierto ? 'rotate-180' : ''
          }`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <div className="border-t border-saie-divider px-5 py-4 text-sm leading-6">{children}</div>
    </details>
  );
};

export default Acordeon;

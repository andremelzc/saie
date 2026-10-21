import React, { useId } from 'react';

import { clasesBoton } from './clasesBoton';
import type { TamanoBoton, VarianteBoton } from './clasesBoton';

export type { TamanoBoton, VarianteBoton } from './clasesBoton';

export interface BotonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: VarianteBoton;
  tamano?: TamanoBoton;
  cargando?: boolean;
  textoCargando?: string;
  /** Motivo visible y accesible de por qué el botón no se puede usar. */
  motivoDeshabilitado?: string;
  /** En móvil ocupa el ancho disponible; desde `sm` se ajusta al contenido. */
  anchoCompleto?: boolean;
}

/**
 * Botón único del sistema: variantes, tamaño táctil y estado de carga.
 * Cuando está deshabilitado puede explicar el motivo, en lugar de dejar al usuario adivinando.
 */
export const Boton = React.forwardRef<HTMLButtonElement, BotonProps>(function Boton(
  {
    variante = 'primario',
    tamano = 'md',
    cargando = false,
    textoCargando,
    motivoDeshabilitado,
    anchoCompleto = false,
    disabled,
    children,
    className = '',
    type = 'button',
    ...props
  },
  ref,
) {
  const generado = useId();
  const id = props.id ?? generado;
  const idMotivo = `${id}-motivo`;
  const inactivo = disabled || cargando;

  return (
    <span
      className={`inline-flex flex-col items-start gap-1 ${anchoCompleto ? 'w-full sm:w-auto' : ''}`}
    >
      <button
        {...props}
        ref={ref}
        id={id}
        type={type}
        disabled={inactivo}
        aria-busy={cargando || undefined}
        aria-describedby={motivoDeshabilitado && disabled ? idMotivo : undefined}
        className={`${clasesBoton(variante, tamano, anchoCompleto)} ${className}`}
      >
        {cargando && (
          <svg
            className="h-5 w-5 animate-spin motion-reduce:animate-none"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              className="opacity-25"
            />
            <path
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              fill="currentColor"
              className="opacity-75"
            />
          </svg>
        )}
        <span>{cargando ? (textoCargando ?? children) : children}</span>
      </button>
      {motivoDeshabilitado && disabled && !cargando && (
        <span id={idMotivo} className="text-xs text-saie-muted">
          {motivoDeshabilitado}
        </span>
      )}
    </span>
  );
});

export default Boton;

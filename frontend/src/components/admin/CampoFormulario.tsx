import React from 'react';
import { CLASE_AYUDA, CLASE_CAMPO, CLASE_ETIQUETA } from '../ui/campos';

export interface CampoFormularioProps {
  id: string;
  etiqueta: string;
  valor: string;
  onCambio: (valor: string) => void;
  type?: 'text' | 'email' | 'tel' | 'date' | 'password';
  obligatorio?: boolean;
  maxLength?: number;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  /** Fecha máxima admitida (solo `type="date"`), en formato `AAAA-MM-DD`. */
  max?: string;
  ayuda?: string;
  /** Mensaje de error del campo; sustituye a la ayuda mientras exista. */
  error?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Campo de texto de los formularios del panel: etiqueta siempre visible, marca de obligatorio
 * que un lector de pantalla también anuncia, y el error o la ayuda enlazados con `aria-describedby`.
 */
export const CampoFormulario: React.FC<CampoFormularioProps> = ({
  id,
  etiqueta,
  valor,
  onCambio,
  type = 'text',
  obligatorio = false,
  maxLength,
  autoComplete,
  inputMode,
  max,
  ayuda,
  error,
  disabled,
  className = '',
}) => {
  const idError = `${id}-error`;
  const idAyuda = `${id}-ayuda`;

  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <label htmlFor={id} className={CLASE_ETIQUETA}>
        {etiqueta}
        {obligatorio ? (
          <>
            <span aria-hidden="true" className="ml-1 font-bold text-saie-danger">
              *
            </span>
            <span className="sr-only"> (obligatorio)</span>
          </>
        ) : (
          <span className="ml-1 font-normal text-saie-muted">(opcional)</span>
        )}
      </label>
      <input
        id={id}
        type={type}
        value={valor}
        maxLength={maxLength}
        max={max}
        autoComplete={autoComplete ?? 'off'}
        inputMode={inputMode}
        disabled={disabled}
        aria-required={obligatorio ? true : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? idError : ayuda ? idAyuda : undefined}
        onChange={(e) => onCambio(e.target.value)}
        className={`${CLASE_CAMPO} ${error ? 'border-saie-danger' : ''}`}
      />
      {error ? (
        <p id={idError} className="m-0 text-sm font-medium text-saie-danger-strong">
          {error}
        </p>
      ) : (
        ayuda && (
          <p id={idAyuda} className={CLASE_AYUDA}>
            {ayuda}
          </p>
        )
      )}
    </div>
  );
};

export default CampoFormulario;

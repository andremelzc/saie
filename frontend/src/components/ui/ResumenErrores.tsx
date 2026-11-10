import React from 'react';

export interface ErrorDeCampo {
  /** `id` del control con el error: el enlace del resumen lo enfoca. */
  idCampo: string;
  /** Nombre visible del campo («Celular»). */
  etiqueta: string;
  mensaje: string;
}

/**
 * Resumen de errores al enviar un formulario (Issue 3.41): una lista con cada campo mal llenado
 * y un enlace que lleva a él. Se anuncia como alerta; el foco va al primer campo con error, así
 * que el resumen no lo roba.
 */
export const ResumenErrores: React.FC<{ errores: ErrorDeCampo[]; className?: string }> = ({
  errores,
  className = '',
}) => {
  if (errores.length === 0) return null;
  return (
    <div
      role="alert"
      className={`rounded-xl border border-saie-danger/40 bg-saie-danger-soft px-4 py-3 text-sm text-saie-danger-strong ${className}`}
    >
      <p className="m-0 font-semibold">
        {errores.length === 1
          ? 'Corrige 1 dato para continuar:'
          : `Corrige ${errores.length} datos para continuar:`}
      </p>
      <ul className="m-0 mt-1 list-disc pl-5">
        {errores.map((e) => (
          <li key={e.idCampo}>
            <a
              href={`#${e.idCampo}`}
              onClick={(ev) => {
                ev.preventDefault();
                document.getElementById(e.idCampo)?.focus();
              }}
              className="text-saie-danger-strong underline"
            >
              {e.etiqueta}
            </a>
            : {e.mensaje}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ResumenErrores;

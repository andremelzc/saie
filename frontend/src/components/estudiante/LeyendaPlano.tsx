import React from 'react';

const Muestra: React.FC<{ clases: string; children?: React.ReactNode }> = ({
  clases,
  children,
}) => (
  <span
    aria-hidden="true"
    className={`inline-flex h-5 w-7 shrink-0 items-center justify-center rounded-md border-2 ${clases}`}
  >
    {children}
  </span>
);

export interface LeyendaPlanoProps {
  /** Muestra «Libre» y «Ocupado» (solo cuando el plano trae el estado de cada espacio). */
  conEstados?: boolean;
  /** Muestra «Tu aula» (cuando hay espacios resaltados). */
  conMiAula?: boolean;
  className?: string;
}

/** Qué significa cada color del plano; siempre con texto, nunca solo color. */
export const LeyendaPlano: React.FC<LeyendaPlanoProps> = ({
  conEstados = true,
  conMiAula = true,
  className = '',
}) => (
  <ul
    aria-label="Leyenda del plano"
    className={`m-0 flex list-none flex-wrap items-center gap-x-5 gap-y-2 p-0 text-sm text-saie-text ${className}`}
  >
    {conEstados && (
      <>
        <li className="flex items-center gap-2">
          <Muestra clases="border-[#1E8E4E] bg-[#CDEBD6]" />
          <span>
            <strong className="font-semibold">Libre</strong> en esa franja
          </span>
        </li>
        <li className="flex items-center gap-2">
          <Muestra clases="saie-rayado border-[#5B6B7F]" />
          <span>
            <strong className="font-semibold">Ocupado</strong>
          </span>
        </li>
      </>
    )}
    {conMiAula && (
      <li className="flex items-center gap-2">
        <Muestra clases="border-saie-primary bg-white">
          <span className="block h-2 w-2 rounded-full bg-saie-primary" />
        </Muestra>
        <span>
          <strong className="font-semibold">Tu aula</strong> (con pin)
        </span>
      </li>
    )}
    <li className="flex items-center gap-2 text-saie-muted">
      <Muestra clases="border-[#222] bg-[#EEE5D6]" />
      <span>Toca un espacio para ver su detalle</span>
    </li>
  </ul>
);

export default LeyendaPlano;

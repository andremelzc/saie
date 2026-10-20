import React from 'react';

export type TonoBadge = 'exito' | 'peligro' | 'advertencia' | 'neutro' | 'info';

const ESTILOS: Record<TonoBadge, string> = {
  exito: 'bg-saie-success-soft text-saie-success-strong',
  peligro: 'bg-saie-danger-soft text-saie-danger-strong',
  advertencia: 'bg-saie-warning-soft text-saie-warning-strong',
  neutro: 'border border-saie-divider bg-saie-canvas text-saie-muted',
  info: 'bg-saie-primary/10 text-saie-primary',
};

const TRAZOS: Record<TonoBadge, string> = {
  exito: 'M5 13l4 4L19 7',
  peligro:
    'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  advertencia: 'M12 8v4m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z',
  neutro: 'M12 8v4m0 4h.01M12 3a9 9 0 100 18 9 9 0 000-18z',
  info: 'M12 8h.01M11 12h1v4h1m-1-13a9 9 0 100 18 9 9 0 000-18z',
};

export interface BadgeEstadoProps {
  tono: TonoBadge;
  children: React.ReactNode;
  className?: string;
  /** Permite ocultar el ícono en espacios muy compactos. */
  conIcono?: boolean;
}

/** Badge de estado con los tres canales que exige la guía: color, ícono y texto. */
export const BadgeEstado: React.FC<BadgeEstadoProps> = ({
  tono,
  children,
  className = '',
  conIcono = true,
}) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${ESTILOS[tono]} ${className}`}
  >
    {conIcono && (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-3.5 w-3.5 shrink-0"
      >
        <path d={TRAZOS[tono]} />
      </svg>
    )}
    <span>{children}</span>
  </span>
);

export default BadgeEstado;

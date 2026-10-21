import React from 'react';
import type { PortalId } from '../../config/portales';

const ICONOS: Record<PortalId, React.ReactNode> = {
  estudiante: (
    <path d="M22 10 12 5 2 10l10 5 10-5Zm-16 3.2V17c0 1.7 2.7 3 6 3s6-1.3 6-3v-3.8l-6 3-6-3Z" />
  ),
  docente: (
    <path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-6l1.5 3H8.5L10 17H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm1 2v9h14V6H5Z" />
  ),
  admin: (
    <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Zm0 2.1 6 2.2V11c0 3.9-2.5 7.4-6 8.9-3.5-1.5-6-5-6-8.9V6.3l6-2.2Z" />
  ),
};

export interface IconoPortalProps {
  portal: PortalId;
  className?: string;
}

/** Ícono de cada portal (el mismo que usan las tarjetas de la Home). Es decorativo. */
export const IconoPortal: React.FC<IconoPortalProps> = ({ portal, className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={`fill-current ${className}`}>
    {ICONOS[portal]}
  </svg>
);

export default IconoPortal;

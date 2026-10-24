import React from 'react';
import type { PortalId } from '../../config/portales';
import { ICONOS } from '../ui/iconos';

const ICONO_DE_PORTAL: Record<PortalId, React.ReactNode> = {
  estudiante: <path d={ICONOS.graduacion} />,
  docente: <path d={ICONOS.pizarra} />,
  admin: <path d={ICONOS.escudo} />,
};

export interface IconoPortalProps {
  portal: PortalId;
  className?: string;
}

/** Ícono de cada portal (el mismo que usan las tarjetas de la Home). Es decorativo. */
export const IconoPortal: React.FC<IconoPortalProps> = ({ portal, className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={`fill-current ${className}`}>
    {ICONO_DE_PORTAL[portal]}
  </svg>
);

export default IconoPortal;

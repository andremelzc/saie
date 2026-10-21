import React from 'react';
import { useAuth } from '../../context/useAuth';

/** Cierra la sesión (borra el token y vuelve al login del rol). Reutilizable en todos los portales. */
export const BotonCerrarSesion: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { cerrarSesion } = useAuth();

  return (
    <button
      type="button"
      onClick={() => cerrarSesion('manual')}
      className={`h-12 px-6 rounded-[12px] font-medium text-base text-saie-primary bg-white border border-saie-primary hover:bg-saie-canvas focus:outline-hidden focus:ring-3 focus:ring-saie-text focus:ring-offset-2 transition-colors cursor-pointer ${className}`}
    >
      Cerrar sesión
    </button>
  );
};

export default BotonCerrarSesion;

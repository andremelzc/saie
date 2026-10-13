import React from 'react';
import { useAuth } from '../../context/useAuth';

/** Cierra la sesión (borra el token y vuelve al login del rol). Reutilizable en todos los portales. */
export const BotonCerrarSesion: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { cerrarSesion } = useAuth();

  return (
    <button
      type="button"
      onClick={() => cerrarSesion('manual')}
      className={`h-12 px-6 rounded-[12px] font-medium text-base text-[#7B1113] bg-white border border-[#7B1113] hover:bg-[#FAF6ED] focus:outline-hidden focus:ring-3 focus:ring-[#222222] focus:ring-offset-2 transition-colors cursor-pointer ${className}`}
    >
      Cerrar sesión
    </button>
  );
};

export default BotonCerrarSesion;

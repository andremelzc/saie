import React from 'react';
import { useAuth } from '../../context/useAuth';
import { Boton } from '../ui/Boton';

/** Cierra la sesión (borra el token y vuelve al login del rol). Reutilizable en todos los portales. */
export const BotonCerrarSesion: React.FC<{ className?: string; compacto?: boolean }> = ({
  className = '',
  compacto = false,
}) => {
  const { cerrarSesion } = useAuth();

  return (
    <Boton
      variante="secundario"
      tamano={compacto ? 'sm' : 'md'}
      onClick={() => cerrarSesion('manual')}
      className={className}
    >
      Cerrar sesión
    </Boton>
  );
};

export default BotonCerrarSesion;

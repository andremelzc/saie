import React from 'react';
import { Link } from 'react-router-dom';
import BotonCerrarSesion from './auth/BotonCerrarSesion';
import logoBlanco from '../assets/logo-blanco.svg';
import { useAuth } from '../context/useAuth';
import { etiquetaRol } from '../utils/admin';

export interface CabeceraPortalProps {
  /** Nombre del portal que se muestra en la cabecera. Por defecto, el rol de la sesión. */
  portal?: string;
  /** Destino del logo (el inicio del portal). */
  inicioTo?: string;
  className?: string;
}

/**
 * Cabecera única de las áreas privadas (alumno, docente y panel administrativo).
 * El rol se muestra una sola vez, con su nombre legible, junto al logo.
 */
export const CabeceraPortal: React.FC<CabeceraPortalProps> = ({
  portal,
  inicioTo = '/',
  className = '',
}) => {
  const { sesion } = useAuth();
  const etiqueta = portal ?? etiquetaRol(sesion?.rol);

  return (
    <header className={`bg-saie-primary text-white ${className}`}>
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link to={inicioTo} aria-label="Ir al inicio de SAIE" className="shrink-0">
            <img src={logoBlanco} alt="SAIE" className="h-9 w-auto" />
          </Link>
          <span className="hidden truncate rounded-full bg-white/15 px-3 py-1 text-sm font-medium sm:inline-flex">
            {etiqueta}
          </span>
        </div>
        <BotonCerrarSesion className="h-10! shrink-0 border-white/30! bg-white/10! px-4! text-sm! text-white! hover:bg-white/20!" />
      </div>
    </header>
  );
};

export default CabeceraPortal;

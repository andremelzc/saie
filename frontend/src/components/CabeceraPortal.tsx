import React from 'react';
import { Link } from 'react-router-dom';
import BotonCerrarSesion from './auth/BotonCerrarSesion';
import logoBlanco from '../assets/logo-blanco.svg';
import { useAuth } from '../context/useAuth';

export interface CabeceraPortalProps {
  /** Nombre del portal que se muestra en la cabecera (Estudiante, Docente, etc.). */
  portal: string;
}

/** Cabecera común de las pantallas de portal (alumno, docente y estados de desarrollo). */
export const CabeceraPortal: React.FC<CabeceraPortalProps> = ({ portal }) => {
  const { sesion } = useAuth();

  return (
    <header className="bg-saie-primary text-white">
      <div className="mx-auto flex h-[85px] w-full max-w-6xl items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-4">
          <Link to="/" aria-label="Ir al inicio de SAIE" className="shrink-0">
            <img src={logoBlanco} alt="SAIE" className="h-10 w-auto" />
          </Link>
          <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
            {portal}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <p className="m-0 hidden text-right text-xs leading-4 text-white/80 sm:block">
            Sesión activa
            <strong className="block text-sm font-bold text-white">{sesion?.rol}</strong>
          </p>
          <BotonCerrarSesion className="h-11! border-white/30! bg-white/10! px-5! text-sm! text-white! hover:bg-white/20!" />
        </div>
      </div>
    </header>
  );
};

export default CabeceraPortal;

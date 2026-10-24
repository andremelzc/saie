import React from 'react';
import { Link } from 'react-router-dom';
import BotonCerrarSesion from './auth/BotonCerrarSesion';
import logoBlanco from '../assets/logo-blanco.svg';
import { useAuth } from '../context/useAuth';
import { Contenedor } from './ui/Contenedor';
import { etiquetaRol } from '../utils/admin';

export interface CabeceraPortalProps {
  /** Nombre del portal que se muestra en la cabecera (Estudiante, Docente, etc.). */
  portal: string;
}

/** Cabecera común de las pantallas de portal (alumno, docente y estados de desarrollo). */
export const CabeceraPortal: React.FC<CabeceraPortalProps> = ({ portal }) => {
  const { sesion } = useAuth();

  return (
    <header className="bg-saie-primary text-white">
      <Contenedor ancho="normal" className="flex h-18 items-center justify-between gap-3">
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
            <strong className="block text-sm font-bold text-white">
              {etiquetaRol(sesion?.rol)}
            </strong>
          </p>
          <BotonCerrarSesion
            compacto
            className="border-white/30! bg-white/10! text-white! hover:bg-white/20!"
          />
        </div>
      </Contenedor>
    </header>
  );
};

export default CabeceraPortal;

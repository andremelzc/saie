import React from 'react';
import { Link } from 'react-router-dom';
import BotonCerrarSesion from '../auth/BotonCerrarSesion';
import logoBlanco from '../../assets/logo-blanco.svg';
import { RUTAS } from '../../config/rutas';
import { useAuth } from '../../context/useAuth';
import { etiquetaRol } from '../../utils/admin';
import { Contenedor } from '../ui/Contenedor';
import type { AnchoContenedor } from '../ui/Contenedor';

export interface CabeceraAlumnoProps {
  /** Ancho máximo: debe ser el mismo de la barra de pestañas y del contenido de la pantalla. */
  ancho?: AnchoContenedor;
}

/**
 * Cabecera única del área del estudiante (Issue 3.33).
 *
 * Todas las pantallas del alumno (el inicio y las internas) comparten este marco: logo, insignia
 * de rol con su etiqueta legible y «Cerrar sesión», siempre visibles y con el mismo alto (72 px),
 * de modo que la sesión se puede cerrar desde cualquier pantalla y la cabecera no cambia al
 * navegar entre pestañas. El título de cada pantalla va como encabezado de página dentro del
 * contenido, no en la cabecera.
 */
export const CabeceraAlumno: React.FC<CabeceraAlumnoProps> = ({ ancho = 'normal' }) => {
  const { sesion } = useAuth();

  return (
    <header className="bg-saie-primary text-white">
      <Contenedor ancho={ancho} className="flex h-18 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link to={RUTAS.inicioAlumno} className="flex min-h-11 shrink-0 items-center">
            <img src={logoBlanco} alt="SAIE" className="h-9 w-auto" />
          </Link>
          <span className="inline-flex min-w-0 items-center truncate rounded-full bg-white/15 px-3 py-1 text-xs font-medium sm:text-sm">
            {etiquetaRol(sesion?.rol ?? 'ALUMNO')}
          </span>
        </div>
        <BotonCerrarSesion
          compacto
          className="shrink-0 border-white/30! bg-white/10! text-white! hover:bg-white/20!"
        />
      </Contenedor>
    </header>
  );
};

export default CabeceraAlumno;

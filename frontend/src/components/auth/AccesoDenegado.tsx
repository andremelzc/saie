import React from 'react';
import { Link } from 'react-router-dom';
import { rutaInicioDeRol } from '../../config/rutas';
import { useTituloPagina } from '../../hooks/useTituloPagina';
import type { RolCuenta } from '../../types/auth';
import BotonCerrarSesion from './BotonCerrarSesion';

/** Mensaje claro cuando un usuario con sesión entra a una ruta que su rol no permite. */
export const AccesoDenegado: React.FC<{ rol: RolCuenta }> = ({ rol }) => {
  useTituloPagina('Acceso no autorizado');
  return (
    <main
      className="min-h-screen bg-saie-canvas text-saie-text flex flex-col justify-center items-center px-4 py-8"
      aria-label="Acceso no autorizado"
    >
      <div className="w-full max-w-md bg-white border border-saie-divider rounded-2xl shadow-sm p-6 sm:p-8 flex flex-col gap-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Acceso no autorizado</h1>
        <p role="alert" className="text-base text-saie-text">
          Tu cuenta no tiene permiso para ver esta sección.
        </p>
        <p className="text-sm text-saie-muted">
          Si crees que es un error, comunícate con Coordinación Académica.
        </p>
        <div className="flex flex-col gap-3 mt-2">
          <Link
            to={rutaInicioDeRol(rol)}
            className="h-12 px-6 rounded-xl font-medium text-base text-white bg-saie-primary hover:bg-saie-primary-dark flex items-center justify-center focus:outline-hidden focus:ring-3 focus:ring-saie-text focus:ring-offset-2 transition-colors"
          >
            Ir a mi portal
          </Link>
          <BotonCerrarSesion />
        </div>
      </div>
    </main>
  );
};

export default AccesoDenegado;

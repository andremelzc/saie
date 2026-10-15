import React from 'react';
import { Link } from 'react-router-dom';
import { rutaInicioDeRol } from '../../config/rutas';
import type { RolCuenta } from '../../types/auth';
import BotonCerrarSesion from './BotonCerrarSesion';

/** Mensaje claro cuando un usuario con sesión entra a una ruta que su rol no permite. */
export const AccesoDenegado: React.FC<{ rol: RolCuenta }> = ({ rol }) => {
  return (
    <main
      className="min-h-screen bg-[#FAF6ED] text-[#222222] flex flex-col justify-center items-center px-4 py-8"
      aria-label="Acceso no autorizado"
    >
      <div className="w-full max-w-md bg-white border border-[#E6DFD0] rounded-2xl shadow-[0_2px_8px_rgba(34,34,34,0.08)] p-6 sm:p-8 flex flex-col gap-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Acceso no autorizado</h1>
        <p role="alert" className="text-base text-[#222222]">
          Tu cuenta no tiene permiso para ver esta sección.
        </p>
        <p className="text-sm text-[#666666]">
          Si crees que es un error, comunícate con Coordinación Académica.
        </p>
        <div className="flex flex-col gap-3 mt-2">
          <Link
            to={rutaInicioDeRol(rol)}
            className="h-12 px-6 rounded-[12px] font-medium text-base text-white bg-[#7B1113] hover:bg-[#5C0D0E] flex items-center justify-center focus:outline-hidden focus:ring-3 focus:ring-[#222222] focus:ring-offset-2 transition-colors"
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

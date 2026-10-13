import React from 'react';
import BotonCerrarSesion from '../components/auth/BotonCerrarSesion';

/**
 * PLACEHOLDER TEMPORAL — Issue #217 / 4.25.
 * Destino de la redirección cuando el login informa que la clave debe cambiarse.
 * La pantalla real corresponde al Issue 4.21 y debe reemplazar a este componente.
 */
export const CambiarClavePlaceholder: React.FC = () => {
  return (
    <main
      className="min-h-screen bg-[#FAF6ED] text-[#222222] flex flex-col justify-center items-center px-4 py-8"
      aria-label="Cambio de clave"
    >
      <div className="w-full max-w-md bg-white border border-[#E6DFD0] rounded-2xl shadow-[0_2px_8px_rgba(34,34,34,0.08)] p-6 sm:p-8 flex flex-col gap-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Cambio de clave</h1>
        <p className="text-base">Debes cambiar tu clave inicial para continuar.</p>
        <p className="text-sm text-[#666666]">
          Pantalla temporal: el formulario de cambio de clave se construye en el Issue 4.21.
        </p>
        <BotonCerrarSesion className="mt-2" />
      </div>
    </main>
  );
};

export default CambiarClavePlaceholder;

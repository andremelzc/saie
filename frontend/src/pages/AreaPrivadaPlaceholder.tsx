import React from 'react';
import BotonCerrarSesion from '../components/auth/BotonCerrarSesion';
import { useAuth } from '../context/useAuth';

/**
 * PLACEHOLDER TEMPORAL — Issue #217 / 4.25.
 * Área privada mínima de cada rol, para poder comprobar el cierre de sesión y las rutas
 * protegidas. Cada portal real (estudiante, docente, panel administrativo) la reemplazará.
 */
export interface AreaPrivadaPlaceholderProps {
  titulo: string;
}

export const AreaPrivadaPlaceholder: React.FC<AreaPrivadaPlaceholderProps> = ({ titulo }) => {
  const { sesion } = useAuth();

  return (
    <main className="min-h-screen bg-[#FAF6ED] text-[#222222] flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md bg-white border border-[#E6DFD0] rounded-2xl shadow-[0_2px_8px_rgba(34,34,34,0.08)] p-6 sm:p-8 flex flex-col gap-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight">{titulo}</h1>
        <p className="text-sm text-[#666666]">
          Sesión iniciada como <strong>{sesion?.rol}</strong>. Área en construcción.
        </p>
        <BotonCerrarSesion className="mt-2" />
      </div>
    </main>
  );
};

export default AreaPrivadaPlaceholder;

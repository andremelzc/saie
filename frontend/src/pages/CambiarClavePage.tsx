import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import FormularioCambioClave from '../components/auth/FormularioCambioClave';
import isotipoPlaca from '../assets/isotipo-placa.svg';
import { RUTAS, rutaInicioDeRol } from '../config/rutas';
import { useAuth } from '../context/useAuth';
import { useTituloPagina } from '../hooks/useTituloPagina';

/**
 * Cambio de la clave inicial (Issues 4.21 y 4.45), común a los cuatro roles. A esta pantalla
 * llevan el login y `RutaProtegida` mientras la cuenta deba cambiar la clave que le entregó
 * Coordinación; mientras tanto el servidor rechaza el resto de las peticiones. Al guardar, la
 * persona pasa a su área sin volver a iniciar sesión.
 */
export const CambiarClavePage: React.FC = () => {
  useTituloPagina('Cambia tu clave');
  const { sesion, cerrarSesion } = useAuth();
  const navigate = useNavigate();

  if (!sesion) return <Navigate to={RUTAS.loginAlumno} replace />;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-saie-canvas px-4 py-8 text-saie-text">
      <main className="relative w-full max-w-md overflow-hidden rounded-xl border border-saie-divider bg-white p-6 shadow-lg sm:p-8">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-saie-primary to-saie-primary-light"
        />
        <header className="flex flex-col items-center gap-2 pb-4 text-center">
          <img src={isotipoPlaca} alt="" aria-hidden="true" className="h-16 w-16 rounded-2xl" />
          <h1 className="m-0 text-2xl font-bold tracking-tight">Cambia tu clave</h1>
          <p className="m-0 text-sm text-saie-muted">
            {sesion.debeCambiarClave
              ? 'Ingresaste con la clave inicial que te entregó Coordinación Académica. Elige una clave propia para continuar.'
              : 'Escribe tu clave actual y elige la nueva.'}
          </p>
        </header>

        <FormularioCambioClave onCambiada={() => void navigate(rutaInicioDeRol(sesion.rol))} />

        <button
          type="button"
          onClick={() => cerrarSesion()}
          className="mt-4 min-h-11 w-full cursor-pointer rounded-xl bg-transparent px-4 text-sm font-medium text-saie-primary hover:bg-saie-primary/5"
        >
          Cerrar sesión
        </button>
      </main>
    </div>
  );
};

export default CambiarClavePage;

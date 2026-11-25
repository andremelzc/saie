import React from 'react';
import { BotonEnlace } from '../components/ui/BotonEnlace';
import { rutaInicioDeRol } from '../config/rutas';
import { useAuth } from '../context/useAuth';
import { useTituloPagina } from '../hooks/useTituloPagina';

/**
 * Ruta inexistente: antes `*` mostraba la portada sin explicar nada y la dirección errónea
 * seguía en la barra. Ahora se avisa y se ofrece volver al inicio que corresponde al rol.
 */
export const NoEncontrada: React.FC = () => {
  const { sesion } = useAuth();
  const destino = sesion ? rutaInicioDeRol(sesion.rol) : '/';
  useTituloPagina('Página no encontrada');

  return (
    <main
      id="contenido"
      tabIndex={-1}
      className="flex min-h-screen flex-col items-center justify-center bg-saie-canvas px-4 py-8 text-saie-text focus:outline-none"
    >
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-saie-divider bg-white p-6 text-center shadow-sm sm:p-8">
        <h1 className="m-0 text-2xl font-bold tracking-tight">No encontramos esta página</h1>
        <p className="m-0 text-base text-saie-muted">
          La dirección no existe o ya no está disponible. Revisa que esté bien escrita o vuelve al
          inicio.
        </p>
        <BotonEnlace to={destino} variante="primario">
          {sesion ? 'Ir a mi portal' : 'Ir al inicio'}
        </BotonEnlace>
      </div>
    </main>
  );
};

export default NoEncontrada;

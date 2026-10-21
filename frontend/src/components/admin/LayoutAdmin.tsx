import React from 'react';
import { NavLink } from 'react-router-dom';
import CabeceraPortal from '../CabeceraPortal';
import { RUTAS } from '../../config/rutas';
import { AvisoError } from '../ui/AvisoError';
import { useAuth } from '../../context/useAuth';
import { pestanasDeRol } from '../../utils/admin';

/**
 * Marco común del panel administrativo.
 *
 * Decisión de navegación (Issue 4.20): el inicio de Coordinación SÍ lleva la misma barra de
 * pestañas que el resto del panel, por consistencia. La barra va abajo en móvil y arriba,
 * bajo la cabecera, en escritorio. Jefatura ve solo sus pestañas (Inicio, Alertas, Laboratorio).
 */

const Icono: React.FC<{ trazo: string }> = ({ trazo }) => (
  <svg
    className="h-5 w-5"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d={trazo} />
  </svg>
);

export interface LayoutAdminProps {
  titulo: string;
  subtitulo?: string;
  /** Acciones de la pantalla (p. ej. «Actualizar» o «Guía y plantillas»). */
  acciones?: React.ReactNode;
  /**
   * Modo tablero: la pantalla ocupa exactamente el alto de la ventana y no hace scroll;
   * los paneles largos llevan su propio scroll interno. Es el modo de las pantallas que
   * muestran todo de una vez (Issue 4.20).
   */
  dashboard?: boolean;
  children: React.ReactNode;
}

export const LayoutAdmin: React.FC<LayoutAdminProps> = ({
  titulo,
  subtitulo,
  acciones,
  dashboard = false,
  children,
}) => {
  const { sesion } = useAuth();
  const pestanas = pestanasDeRol(sesion?.rol);

  const claseLink = ({ isActive }: { isActive: boolean }) =>
    `flex flex-1 flex-col items-center gap-0.5 px-2 py-2 text-xs transition-colors md:flex-none md:flex-row md:gap-2 md:rounded-lg md:px-4 md:text-sm ${
      isActive
        ? 'bg-saie-primary/10 font-bold text-saie-primary md:bg-saie-primary md:font-medium md:text-white'
        : 'font-medium text-saie-muted hover:text-saie-primary'
    }`;

  return (
    <div
      className={`flex min-h-screen flex-col bg-saie-canvas pb-20 md:pb-0 ${
        dashboard ? 'lg:h-screen lg:overflow-hidden' : ''
      }`}
    >
      <CabeceraPortal inicioTo={RUTAS.inicioAdmin} className="saie-no-imprimir" />

      <nav
        aria-label="Navegación del panel"
        className="saie-no-imprimir fixed inset-x-0 bottom-0 z-30 border-t border-saie-divider bg-white md:static md:border-b md:border-t-0"
      >
        <ul className="mx-auto m-0 flex w-full max-w-7xl list-none gap-1 p-0 md:px-4 md:py-2">
          {pestanas.map((p) => (
            <li
              key={p.to}
              className={`flex flex-1 md:flex-none ${p.soloEscritorio ? 'hidden md:flex' : ''}`}
            >
              <NavLink to={p.to} end className={claseLink}>
                <Icono trazo={p.trazo} />
                {p.etiqueta}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <main
        className={`mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-4 ${
          dashboard ? 'lg:min-h-0 lg:overflow-hidden' : ''
        }`}
      >
        <div className="saie-no-imprimir flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="m-0 font-serif text-2xl font-bold text-saie-text sm:text-3xl">
              {titulo}
            </h1>
            {subtitulo && <p className="m-0 mt-1 text-sm text-saie-muted">{subtitulo}</p>}
          </div>
          {acciones}
        </div>
        {children}
      </main>
    </div>
  );
};

/** Se reexporta para las pantallas que ya lo importaban desde aquí. */
export { AvisoError };

export default LayoutAdmin;

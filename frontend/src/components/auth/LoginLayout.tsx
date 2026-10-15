import React from 'react';
import { Link } from 'react-router-dom';
import LogoEdificioGuinda from '../LogoEdificioGuinda';
import logoBlanco from '../../assets/logo-blanco.svg';
import { PORTALES } from '../../config/portales';
import type { PortalId } from '../../config/portales';
import IconoPortal from './IconoPortal';

/** Titular de la columna de marca para cada portal (solo escritorio). */
const TITULARES: Record<PortalId, string> = {
  estudiante: 'Tu aula, a un paso de ti',
  docente: 'Tus espacios, siempre al día',
  admin: 'Toda la infraestructura, bajo control',
};

export interface LoginLayoutProps {
  portal: PortalId;
  /** Etiqueta accesible del <main> (p. ej. "Página de inicio de sesión de estudiante"). */
  ariaLabel: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Estructura compartida de las tres pantallas de login (mismo lenguaje visual que la Home).
 * - Móvil / tablet: franja guinda con el logo y el formulario sobre ella.
 * - Escritorio (≥ 1024 px): panel de marca guinda a la izquierda y formulario a la derecha.
 */
export const LoginLayout: React.FC<LoginLayoutProps> = ({
  portal,
  ariaLabel,
  children,
  className = '',
}) => {
  const actual = PORTALES.find((p) => p.id === portal) ?? PORTALES[0];
  const otros = PORTALES.filter((p) => p.id !== actual.id);

  return (
    <div
      className={`min-h-screen bg-saie-canvas text-saie-text lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] ${className}`}
    >
      {/* Panel de marca (solo escritorio) */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-saie-primary to-saie-primary-dark text-white px-12 xl:px-16 py-10">
        {/* Trama isométrica muy tenue */}
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.08]"
        >
          <defs>
            <pattern id="saie-trama" width="56" height="28" patternUnits="userSpaceOnUse">
              <path d="M28 0 56 14 28 28 0 14Z" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#saie-trama)" />
        </svg>

        {/* Isotipo grande que flota (se detiene con «Reducir movimiento») */}
        <div
          aria-hidden="true"
          className="saie-float pointer-events-none absolute -right-12 bottom-16 opacity-25"
        >
          <LogoEdificioGuinda variant="mark" className="h-80 w-80" />
        </div>

        <Link to="/" className="relative self-start rounded-lg">
          <img src={logoBlanco} alt="SAIE" className="h-12 w-auto" />
        </Link>

        <div className="relative max-w-md saie-rise">
          <span className="inline-flex items-center gap-2 h-7 px-3 rounded-full bg-white/15 text-xs font-medium tracking-[0.2px]">
            <IconoPortal portal={actual.id} className="h-4 w-4" />
            {actual.etiqueta}
          </span>
          <p className="mt-5 mb-0 font-serif text-4xl xl:text-[44px] xl:leading-[52px] leading-[44px] font-bold">
            {TITULARES[actual.id]}
          </p>
          <p className="mt-4 mb-0 text-lg text-white/90">{actual.descripcion}</p>

          <ul className="mt-6 space-y-2.5 list-none p-0">
            {actual.funciones.map((f) => (
              <li key={f} className="flex items-center gap-3 text-white/95">
                <span
                  aria-hidden="true"
                  className="h-6 w-6 rounded-full bg-white/15 flex items-center justify-center shrink-0"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5 fill-none stroke-current"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m5 12.5 4.5 4.5L19 7.5" />
                  </svg>
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative m-0 text-xs text-white/70">
          Facultad de Ingeniería de Sistemas e Informática · UNMSM
        </p>
      </aside>

      {/* Columna del formulario */}
      <div className="relative flex min-h-screen flex-col overflow-hidden">
        {/* Manchas de color suaves de fondo */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-28 -right-28 hidden lg:block h-80 w-80 rounded-full bg-saie-primary/5 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-saie-primary/5 blur-3xl"
        />

        {/* Franja guinda en móvil/tablet; en escritorio solo queda el enlace de volver */}
        <header className="relative flex items-center justify-between px-4 md:px-8 pt-4 pb-16 bg-gradient-to-br from-saie-primary to-saie-primary-dark text-white lg:bg-none lg:text-saie-primary lg:justify-end lg:px-10 lg:pt-8 lg:pb-0">
          <Link to="/" className="lg:hidden rounded-lg">
            <img src={logoBlanco} alt="SAIE" className="h-10 w-auto" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 h-11 px-3 rounded-lg text-sm font-medium no-underline text-white hover:bg-white/10 lg:text-saie-primary lg:hover:bg-saie-primary/10 transition-colors"
          >
            <span aria-hidden="true">&larr;</span>
            <span>Volver al inicio</span>
          </Link>
        </header>

        <main
          aria-label={ariaLabel}
          className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5 px-4 pb-8 -mt-10 lg:mt-0 lg:py-8"
        >
          {children}

          {/* Salida hacia los otros portales */}
          <nav
            aria-label="Otros portales"
            className="saie-rise flex flex-wrap items-center justify-center gap-2 text-sm text-saie-muted"
            style={{ animationDelay: '0.25s' }}
          >
            <span>¿Buscas otro portal?</span>
            {otros.map((p) => (
              <Link
                key={p.id}
                to={p.loginPath}
                className="inline-flex items-center gap-1.5 h-11 px-4 rounded-full border border-saie-divider bg-white text-saie-text font-medium no-underline hover:border-saie-primary hover:text-saie-primary transition-colors"
              >
                <IconoPortal portal={p.id} className="h-4 w-4 text-saie-primary" />
                {p.etiqueta}
              </Link>
            ))}
          </nav>
        </main>

        <footer className="relative px-4 pb-6 text-center text-xs text-saie-muted">
          SAIE &copy; {new Date().getFullYear()} · UNMSM · Grupo 6
        </footer>
      </div>
    </div>
  );
};

export default LoginLayout;

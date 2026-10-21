import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PORTALES } from '../config/portales';
import { RUTAS } from '../config/rutas';
import type { Portal, PortalId } from '../config/portales';
import LogoEdificioGuinda from '../components/LogoEdificioGuinda';
import logoBlanco from '../assets/logo-blanco.svg';
import logoHorizontal from '../assets/logo-horizontal.svg';
import { EnlaceSaltar, ID_CONTENIDO } from '../components/ui/EnlaceSaltar';

const ICONOS: Record<PortalId, React.ReactNode> = {
  estudiante: (
    <path d="M22 10 12 5 2 10l10 5 10-5Zm-16 3.2V17c0 1.7 2.7 3 6 3s6-1.3 6-3v-3.8l-6 3-6-3Z" />
  ),
  docente: (
    <path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-6l1.5 3H8.5L10 17H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm1 2v9h14V6H5Z" />
  ),
  admin: (
    <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Zm0 2.1 6 2.2V11c0 3.9-2.5 7.4-6 8.9-3.5-1.5-6-5-6-8.9V6.3l6-2.2Z" />
  ),
};

const CHIPS = ['Aulas y laboratorios', 'Rutas accesibles', 'Alertas e incidencias'];

const PortalCard: React.FC<{ portal: Portal; indice: number }> = ({ portal: p, indice }) => {
  // Luz suave que sigue al cursor dentro de la tarjeta
  const seguirCursor = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, []);

  return (
    <li className="saie-rise" style={{ animationDelay: `${0.15 + indice * 0.1}s` }}>
      <Link
        to={p.loginPath}
        data-testid={`portal-${p.id}`}
        aria-label={`Ingresar al ${p.titulo}`}
        onMouseMove={seguirCursor}
        className="group relative overflow-hidden h-full flex flex-col bg-white rounded-xl p-5 shadow-saie-card hover:shadow-saie-pop hover:-translate-y-1 active:translate-y-0 active:bg-saie-canvas transition-all duration-300 no-underline text-saie-text"
      >
        {/* Brillo que sigue al cursor */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background:
              'radial-gradient(260px circle at var(--mx, 50%) var(--my, 50%), rgba(123,17,19,0.08), transparent 70%)',
          }}
        />
        {/* Acento superior que se despliega al pasar el mouse */}
        <span
          aria-hidden="true"
          className="absolute top-0 left-0 h-1 w-full origin-left scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100 bg-saie-primary transition-transform duration-300"
        />

        <span
          aria-hidden="true"
          className="relative h-11 w-11 rounded-xl bg-saie-primary/10 text-saie-primary group-hover:bg-saie-primary group-hover:text-white flex items-center justify-center transition-colors duration-300"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
            {ICONOS[p.id]}
          </svg>
        </span>

        <span className="relative mt-3 inline-flex self-start items-center h-6 px-2.5 rounded-full bg-saie-primary/10 text-saie-primary text-xs font-medium tracking-[0.2px]">
          {p.etiqueta}
        </span>

        <h4 className="relative mt-2 text-lg font-bold">{p.titulo}</h4>
        <p className="relative mt-1 text-sm text-saie-muted">{p.descripcion}</p>

        {/* La lista de funciones se muestra siempre: en pantallas bajas la página crece
            hacia abajo en lugar de ocultar contenido. */}
        <ul className="relative mt-3 space-y-1 text-sm list-none p-0">
          {p.funciones.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <span
                aria-hidden="true"
                className="mt-[7px] h-1.5 w-1.5 rounded-full bg-saie-primary shrink-0"
              />
              {f}
            </li>
          ))}
        </ul>

        <span className="relative mt-auto pt-4">
          <span className="inline-flex items-center justify-center w-full h-11 rounded-xl bg-saie-primary group-hover:bg-saie-primary-dark text-white font-medium transition-colors">
            Ingresar
            <span className="sr-only">&nbsp;al {p.titulo}</span>
            <span
              aria-hidden="true"
              className="ml-2 inline-block transition-transform duration-300 group-hover:translate-x-1.5"
            >
              &rarr;
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
};

/**
 * Portada del SAIE: una sola página vertical, igual que las pantallas de login. Todo el
 * contenido vive en un único documento que crece hacia abajo cuando no cabe en la pantalla
 * (nunca se corta ni queda contenido oculto); en pantallas bajas se compacta el ritmo vertical
 * para que entre todo en un solo pantallazo.
 */
export const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-saie-canvas text-saie-text flex flex-col">
      <EnlaceSaltar />
      {/* Barra superior */}
      <header className="sticky top-0 z-10 shrink-0 bg-saie-primary text-white shadow-saie-card">
        <div className="max-w-saie-normal mx-auto px-4 md:px-6 h-18 flex items-center">
          <h1 className="m-0 flex items-center">
            <img src={logoBlanco} alt="SAIE" className="h-10 w-auto" />
          </h1>
          <span className="ml-4 hidden sm:inline text-sm text-white/80 border-l border-white/25 pl-4">
            Sistema de Asignación Inteligente de Espacios
          </span>
        </div>
      </header>

      {/* Contenido: la página crece hacia abajo cuando no cabe en la pantalla (un solo bloque) */}
      <main id={ID_CONTENIDO} tabIndex={-1} className="flex-1 focus:outline-none">
        <div className="max-w-saie-normal w-full mx-auto px-4 md:px-6 py-6 md:py-8">
          {/* Bienvenida (tarjeta destacada: una por pantalla) */}
          <section className="saie-rise relative overflow-hidden rounded-xl bg-gradient-to-br from-saie-primary to-saie-primary-dark text-white p-6 md:p-8 shadow-saie-pop">
            <div
              aria-hidden="true"
              className="saie-float pointer-events-none absolute -right-4 md:right-10 top-1/2 -translate-y-1/2 hidden md:block"
            >
              <LogoEdificioGuinda variant="mark" className="h-32 w-32 md:h-44 md:w-44" />
            </div>

            <div className="relative max-w-xl">
              <h2 className="m-0 text-2xl md:text-3xl font-bold">Bienvenido a SAIE</h2>
              <p className="mt-2 text-white/90">
                Consulta, asigna y supervisa aulas y laboratorios de la Facultad de Ingeniería de
                Sistemas e Informática. Elige tu portal para iniciar sesión.
              </p>
              <ul className="mt-4 flex flex-wrap gap-2 list-none p-0">
                {CHIPS.map((c) => (
                  <li
                    key={c}
                    className="inline-flex items-center h-6 px-2.5 rounded-full bg-white/15 text-xs font-medium tracking-[0.2px]"
                  >
                    {c}
                  </li>
                ))}
              </ul>
              {/* Consulta pública: no requiere iniciar sesión (Issue 3.7) */}
              <Link
                to={RUTAS.consulta}
                data-testid="enlace-consulta"
                className="mt-5 inline-flex items-center justify-center gap-2 min-h-12 px-5 rounded-xl bg-white text-saie-primary font-medium no-underline hover:bg-saie-canvas focus:outline-hidden focus-visible:ring-3 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-saie-primary transition-colors"
              >
                Consultar mi aula sin iniciar sesión
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </section>

          {/* Portales */}
          <section aria-labelledby="portales-titulo" className="mt-6 md:mt-8">
            <h3 id="portales-titulo" className="text-lg font-bold">
              Elige tu portal
            </h3>
            <ul className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 list-none p-0">
              {PORTALES.map((p, i) => (
                <PortalCard key={p.id} portal={p} indice={i} />
              ))}
            </ul>
          </section>
        </div>
      </main>

      <footer className="shrink-0 border-t border-saie-divider bg-white">
        <div className="max-w-saie-normal mx-auto px-4 md:px-6 py-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <img src={logoHorizontal} alt="" aria-hidden="true" className="h-7 w-auto self-start" />
          <div className="text-xs text-saie-muted sm:text-right">
            <p className="m-0">SAIE &copy; {new Date().getFullYear()} · UNMSM · Grupo 6</p>
            <p className="m-0">Facultad de Ingeniería de Sistemas e Informática</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;

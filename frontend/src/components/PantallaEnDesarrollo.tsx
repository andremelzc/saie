import React from 'react';
import { Link } from 'react-router-dom';
import CabeceraPortal from './CabeceraPortal';

/** Texto único de todas las pantallas aún no construidas. */
export const MENSAJE_EN_DESARROLLO = 'Está en planes de desarrollo para la siguiente funcionalidad';

/** Segunda línea que aclara cuándo se verá la pantalla terminada. */
export const PREVISION_EN_DESARROLLO = 'Se va a tener listo para otra presentación.';

const TRAZO_HERRAMIENTA =
  'M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z';

const TRAZO_FLECHA = 'M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75';

export interface AvisoEnDesarrolloProps {
  /** Título visible. En el panel administrativo lo pone `LayoutAdmin`, así que se omite. */
  titulo?: string;
  /** Qué ofrecerá la pantalla cuando esté disponible. */
  descripcion: string;
  /** Funcionalidades previstas (se listan como viñetas). */
  funciones?: string[];
  /** Issue(s) del repositorio donde se implementará la pantalla. */
  issue?: string;
}

/**
 * Tarjeta que anuncia una funcionalidad todavía no construida. Se usa tal cual en las pantallas
 * de portal y dentro de `LayoutAdmin` en el panel administrativo.
 */
export const AvisoEnDesarrollo: React.FC<AvisoEnDesarrolloProps> = ({
  titulo,
  descripcion,
  funciones = [],
  issue,
}) => (
  <section
    aria-label={titulo ? undefined : 'Funcionalidad en desarrollo'}
    aria-labelledby={titulo ? 'titulo-pantalla' : undefined}
    className="relative overflow-hidden rounded-2xl border border-saie-divider bg-white p-6 shadow-[0_2px_8px_rgba(34,34,34,0.08)] sm:p-8"
  >
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-saie-primary/10"
    />
    <div className="relative flex flex-col gap-4">
      <span
        aria-hidden="true"
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-saie-canvas text-saie-primary"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d={TRAZO_HERRAMIENTA} />
        </svg>
      </span>

      <div className="flex flex-col gap-2">
        {titulo && (
          <h1 id="titulo-pantalla" className="m-0 font-serif text-2xl font-bold sm:text-3xl">
            {titulo}
          </h1>
        )}
        <p className="m-0 text-base text-saie-muted">{descripcion}</p>
      </div>

      <div className="flex flex-col gap-1 rounded-xl border border-saie-primary/25 bg-saie-canvas px-4 py-3">
        <p role="status" className="m-0 text-sm font-bold text-saie-primary">
          {MENSAJE_EN_DESARROLLO}
        </p>
        <p className="m-0 text-sm text-saie-muted">{PREVISION_EN_DESARROLLO}</p>
      </div>

      {funciones.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="m-0 text-sm font-bold uppercase tracking-wide text-saie-muted">
            Lo que incluirá
          </h2>
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
            {funciones.map((funcion) => (
              <li key={funcion} className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-saie-primary"
                />
                <span>{funcion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {issue && (
        <p className="m-0 text-xs text-saie-muted">
          Seguimiento en el repositorio: <span className="font-semibold">{issue}</span>
        </p>
      )}
    </div>
  </section>
);

export interface PantallaEnDesarrolloProps extends Omit<AvisoEnDesarrolloProps, 'titulo'> {
  /** Título de la pantalla, por ejemplo "Mapa de ocupación". */
  titulo: string;
  /** Botón principal para volver al portal del rol. */
  volverA: { to: string; etiqueta: string };
  /** Etiqueta del portal en la cabecera (por defecto, "Estudiante"). */
  portal?: string;
}

/**
 * Pantalla completa para las funcionalidades que todavía no se construyen. Mantiene la navegación
 * del portal y comunica con claridad que la sección está en camino, en lugar de dejar un enlace
 * roto o esconder la opción del menú.
 */
export const PantallaEnDesarrollo: React.FC<PantallaEnDesarrolloProps> = ({
  titulo,
  descripcion,
  funciones = [],
  volverA,
  issue,
  portal = 'Estudiante',
}) => (
  <div className="min-h-screen bg-saie-canvas text-saie-text">
    <CabeceraPortal portal={portal} />

    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <nav aria-label="Ruta de navegación" className="text-sm">
        <Link
          to={volverA.to}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-saie-primary px-4 font-medium text-saie-primary no-underline transition-colors hover:bg-white"
        >
          <span aria-hidden="true" className="rotate-180">
            <IconoFlecha />
          </span>
          {volverA.etiqueta}
        </Link>
      </nav>

      <AvisoEnDesarrollo
        titulo={titulo}
        descripcion={descripcion}
        funciones={funciones}
        issue={issue}
      />
    </main>
  </div>
);

const IconoFlecha: React.FC = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d={TRAZO_FLECHA} />
  </svg>
);

export default PantallaEnDesarrollo;

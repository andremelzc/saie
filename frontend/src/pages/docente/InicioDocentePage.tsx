import React from 'react';
import { Link } from 'react-router-dom';
import CabeceraPortal from '../../components/CabeceraPortal';
import {
  MENSAJE_EN_DESARROLLO,
  PREVISION_EN_DESARROLLO,
} from '../../components/PantallaEnDesarrollo';

/**
 * Portal del docente. Todavía no hay un flujo real que ofrecer, así que la pantalla lo dice
 * una sola vez y da una salida clara; no se publican tarjetas que lleven a pantallas vacías.
 */
export const InicioDocentePage: React.FC = () => (
  <div className="min-h-screen bg-saie-canvas text-saie-text">
    <CabeceraPortal portal="Docente" />

    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <h1 className="m-0 font-serif text-2xl font-bold sm:text-3xl">Portal del docente</h1>

      <section
        aria-label="Portal en preparación"
        className="flex flex-col gap-4 rounded-2xl border border-saie-divider bg-white p-6 shadow-[var(--saie-shadow-1)]"
      >
        <p role="status" className="m-0 text-base font-bold text-saie-primary">
          {MENSAJE_EN_DESARROLLO}
        </p>
        <p className="m-0 text-sm text-saie-muted">{PREVISION_EN_DESARROLLO}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-saie-primary px-5 text-base font-medium text-white no-underline hover:bg-saie-primary-dark"
          >
            Volver al inicio
          </Link>
          <Link
            to="/consulta"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-saie-primary px-5 text-base font-medium text-saie-primary no-underline hover:bg-saie-primary/5"
          >
            Consultar espacios
          </Link>
        </div>
      </section>
    </main>
  </div>
);

export default InicioDocentePage;

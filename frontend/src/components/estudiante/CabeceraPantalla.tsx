import React from 'react';
import { Link } from 'react-router-dom';
import { RUTAS } from '../../config/rutas';
import { useTituloPagina } from '../../hooks/useTituloPagina';
import { Contenedor } from '../ui/Contenedor';
import type { AnchoContenedor } from '../ui/Contenedor';
import { EnlaceSaltar } from '../ui/EnlaceSaltar';
import { Icono } from './ElementosHorario';
import NavegacionEstudiante from './NavegacionEstudiante';

export interface CabeceraPantallaProps {
  titulo: string;
  subtitulo?: string;
  /** Destino del enlace «Volver»; por defecto, el inicio del alumno. */
  volverA?: string;
  etiquetaVolver?: string;
  /** Trazo del ícono que acompaña al título. */
  trazoIcono?: string;
  /** Ancho máximo del contenido (debe coincidir con el de la pantalla). */
  ancho?: Exclude<AnchoContenedor, 'ancho'>;
  /** Contenido extra a la derecha (insignias, datos rápidos). */
  extra?: React.ReactNode;
}

/** Banda guinda con enlace de retorno y título, común a las pantallas internas del alumno. */
export const CabeceraPantalla: React.FC<CabeceraPantallaProps> = ({
  titulo,
  subtitulo,
  volverA = RUTAS.inicioAlumno,
  etiquetaVolver = 'Volver al inicio',
  trazoIcono,
  ancho = 'normal',
  extra,
}) => {
  useTituloPagina(titulo);

  return (
    <>
      <EnlaceSaltar />
      <header className="relative overflow-hidden bg-gradient-to-br from-saie-primary to-saie-primary-dark text-white">
        <span
          aria-hidden="true"
          className="saie-plano-fondo pointer-events-none absolute inset-0"
        />
        <svg
          aria-hidden="true"
          viewBox="0 0 320 140"
          className="pointer-events-none absolute -right-6 bottom-0 hidden h-36 w-80 text-white/25 sm:block"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            className="saie-trazo"
            pathLength="1"
            d="M10 130V30h120v100M130 60h90v70M220 30h90v100M10 130h300"
          />
          <path
            className="saie-trazo"
            pathLength="1"
            d="M50 130V90h30v40M250 130V90h30v40M160 130V90h30v40"
          />
        </svg>
        <Contenedor ancho={ancho} className="relative flex flex-col gap-2 pb-7 pt-3">
          <Link
            to={volverA}
            className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-sm font-medium text-white no-underline transition-colors hover:bg-white/20 focus-visible:outline-white"
          >
            <span aria-hidden="true">&larr;</span>
            <span>{etiquetaVolver}</span>
          </Link>
          <div className="saie-rise mt-1 flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              {trazoIcono && (
                <span
                  aria-hidden="true"
                  className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 sm:flex"
                >
                  <Icono trazo={trazoIcono} className="h-7 w-7" />
                </span>
              )}
              <div className="min-w-0">
                <h1 className="m-0 text-3xl font-bold sm:text-4xl tracking-tight">{titulo}</h1>
                {subtitulo && <p className="m-0 mt-1 text-sm text-white/85">{subtitulo}</p>}
              </div>
            </div>
            {extra}
          </div>
        </Contenedor>
      </header>
      <NavegacionEstudiante ancho={ancho} />
    </>
  );
};

export default CabeceraPantalla;

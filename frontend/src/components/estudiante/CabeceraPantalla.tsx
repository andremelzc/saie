import React from 'react';
import { Link } from 'react-router-dom';
import { RUTAS } from '../../config/rutas';
import { useTituloPagina } from '../../hooks/useTituloPagina';
import { Contenedor } from '../ui/Contenedor';
import type { AnchoContenedor } from '../ui/Contenedor';
import { EnlaceSaltar } from '../ui/EnlaceSaltar';
import CabeceraAlumno from './CabeceraAlumno';
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
  /** Contenido extra a la derecha del título (insignias, datos rápidos). */
  extra?: React.ReactNode;
}

/**
 * Marco de las pantallas internas del alumno (Issue 3.33): la misma cabecera que el inicio
 * (logo, rol y «Cerrar sesión»), la barra de pestañas y, dentro del contenido, el encabezado de
 * la página con su título. Ya no hay una banda decorativa distinta de la del inicio.
 */
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
      <CabeceraAlumno ancho={ancho} />
      <NavegacionEstudiante ancho={ancho} />
      <Contenedor ancho={ancho} className="flex flex-col gap-2 pt-4">
        <Link
          to={volverA}
          className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-full text-sm font-medium text-saie-primary no-underline hover:underline"
        >
          <span aria-hidden="true">&larr;</span>
          <span>{etiquetaVolver}</span>
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {trazoIcono && (
              <span
                aria-hidden="true"
                className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-saie-primary/10 text-saie-primary sm:flex"
              >
                <Icono trazo={trazoIcono} className="h-6 w-6" />
              </span>
            )}
            <div className="min-w-0">
              <h1 className="m-0 text-2xl font-bold leading-8 tracking-tight text-saie-text sm:text-3xl">
                {titulo}
              </h1>
              {subtitulo && <p className="m-0 mt-0.5 text-sm text-saie-muted">{subtitulo}</p>}
            </div>
          </div>
          {extra}
        </div>
      </Contenedor>
    </>
  );
};

export default CabeceraPantalla;

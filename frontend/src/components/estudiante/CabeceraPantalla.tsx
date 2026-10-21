import React from 'react';
import { RUTAS } from '../../config/rutas';
import CabeceraPortal from '../CabeceraPortal';
import { Icono } from './ElementosHorario';
import NavegacionEstudiante from './NavegacionEstudiante';

export interface CabeceraPantallaProps {
  titulo: string;
  subtitulo?: string;
  /** Trazo del ícono que acompaña al título. */
  trazoIcono?: string;
  /** Ancho máximo del contenido (debe coincidir con el de la pantalla). */
  ancho?: 'max-w-4xl' | 'max-w-7xl';
  /** Contenido extra a la derecha (insignias, datos rápidos). */
  extra?: React.ReactNode;
}

/**
 * Cabecera de las pantallas internas del alumno. Usa la misma cabecera y la misma barra de
 * navegación que el inicio del área, así todas las pantallas se sienten parte de un solo
 * producto; el inicio está siempre a un clic desde la barra.
 */
export const CabeceraPantalla: React.FC<CabeceraPantallaProps> = ({
  titulo,
  subtitulo,
  trazoIcono,
  ancho = 'max-w-7xl',
  extra,
}) => (
  <>
    <CabeceraPortal portal="Estudiante" inicioTo={RUTAS.inicioAlumno} />
    <NavegacionEstudiante />
    <div
      className={`mx-auto flex w-full ${ancho} flex-wrap items-end justify-between gap-3 px-4 pt-6`}
    >
      <div className="flex min-w-0 items-center gap-3">
        {trazoIcono && (
          <span
            aria-hidden="true"
            className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-saie-primary/10 text-saie-primary sm:flex"
          >
            <Icono trazo={trazoIcono} className="h-6 w-6" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="m-0 font-serif text-2xl font-bold leading-8 text-saie-text sm:text-3xl">
            {titulo}
          </h1>
          {subtitulo && <p className="m-0 mt-0.5 text-sm text-saie-muted">{subtitulo}</p>}
        </div>
      </div>
      {extra}
    </div>
  </>
);

export default CabeceraPantalla;

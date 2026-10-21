import React from 'react';
import CabeceraPortal from '../CabeceraPortal';
import { RUTAS } from '../../config/rutas';
import NavegacionEstudiante from './NavegacionEstudiante';

export interface LayoutEstudianteProps {
  titulo: string;
  subtitulo?: string;
  /** Contenido extra a la derecha del título (insignias, datos rápidos). */
  extra?: React.ReactNode;
  /**
   * Modo tablero: la pantalla ocupa el alto de la ventana y no hace scroll; los paneles
   * largos llevan su propio scroll interno (Issue 3.29).
   */
  dashboard?: boolean;
  children: React.ReactNode;
}

/**
 * Marco común del área del estudiante (Issue 3.29).
 *
 * La barra de navegación es lo que permite que la portada sea un tablero: cada destino está
 * a un clic y no hay que volver al inicio para cambiar de sección. En móvil la barra va abajo,
 * como en el panel administrativo.
 */
export const LayoutEstudiante: React.FC<LayoutEstudianteProps> = ({
  titulo,
  subtitulo,
  extra,
  dashboard = false,
  children,
}) => {
  return (
    <div
      className={`flex min-h-screen flex-col bg-saie-canvas pb-6 md:pb-0 ${
        dashboard ? 'lg:h-screen lg:overflow-hidden' : ''
      }`}
    >
      <CabeceraPortal portal="Estudiante" inicioTo={RUTAS.inicioAlumno} />

      <NavegacionEstudiante />

      <main
        className={`mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-4 ${
          dashboard ? 'lg:min-h-0 lg:overflow-hidden' : ''
        }`}
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="m-0 font-serif text-2xl font-bold leading-8 text-saie-text sm:text-3xl">
              {titulo}
            </h1>
            {subtitulo && <p className="m-0 mt-0.5 text-sm text-saie-muted">{subtitulo}</p>}
          </div>
          {extra}
        </div>
        {children}
      </main>
    </div>
  );
};

export default LayoutEstudiante;

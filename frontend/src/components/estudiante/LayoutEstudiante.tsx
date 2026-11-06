import React from 'react';
import { useTituloPagina } from '../../hooks/useTituloPagina';
import { Contenedor } from '../ui/Contenedor';
import { EnlaceSaltar, ID_CONTENIDO } from '../ui/EnlaceSaltar';
import CabeceraAlumno from './CabeceraAlumno';
import NavegacionEstudiante from './NavegacionEstudiante';

export interface LayoutEstudianteProps {
  titulo: string;
  subtitulo?: string;
  /** Contenido extra a la derecha del título (insignias, datos rápidos). */
  extra?: React.ReactNode;
  /**
   * Modo tablero: la pantalla ocupa el alto de la ventana y no hace scroll; los paneles
   * largos llevan su propio scroll interno (Issue 3.29). Solo en escritorio y con alto de
   * ventana de al menos 800 px; por debajo, la página se desplaza con normalidad (Issue 4.36).
   */
  dashboard?: boolean;
  children: React.ReactNode;
}

/**
 * Marco común del área del estudiante (Issue 3.29).
 *
 * La barra de navegación es lo que permite que la portada sea un tablero: cada destino está
 * a un clic y no hay que volver al inicio para cambiar de sección. Por debajo de `lg` la barra va
 * fija abajo, como en el panel administrativo (Issue 3.34).
 */
export const LayoutEstudiante: React.FC<LayoutEstudianteProps> = ({
  titulo,
  subtitulo,
  extra,
  dashboard = false,
  children,
}) => {
  useTituloPagina(titulo);

  return (
    <div
      className={`flex min-h-screen flex-col bg-saie-canvas pb-6 md:pb-0 ${
        dashboard ? 'saie-tablero' : ''
      }`}
    >
      <EnlaceSaltar />
      <CabeceraAlumno ancho="normal" />

      <NavegacionEstudiante />

      <Contenedor
        como="main"
        ancho="normal"
        id={ID_CONTENIDO}
        tabIndex={-1}
        className={`flex flex-1 flex-col gap-4 py-4 focus:outline-none ${
          dashboard ? 'saie-tablero-main' : ''
        }`}
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="m-0 text-2xl font-bold leading-8 text-saie-text sm:text-3xl tracking-tight">
              {titulo}
            </h1>
            {subtitulo && <p className="m-0 mt-0.5 text-sm text-saie-muted">{subtitulo}</p>}
          </div>
          {extra}
        </div>
        {children}
      </Contenedor>
    </div>
  );
};

export default LayoutEstudiante;

import React from 'react';
import { Link } from 'react-router-dom';
import BotonCerrarSesion from '../auth/BotonCerrarSesion';
import logoBlanco from '../../assets/logo-blanco.svg';
import { RUTAS } from '../../config/rutas';
import { useAuth } from '../../context/useAuth';
import { useTituloPagina } from '../../hooks/useTituloPagina';
import { etiquetaRol } from '../../utils/admin';
import { Contenedor } from '../ui/Contenedor';
import { EnlaceSaltar, ID_CONTENIDO } from '../ui/EnlaceSaltar';
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
  const { sesion } = useAuth();
  useTituloPagina(titulo);

  return (
    <div
      className={`flex min-h-screen flex-col bg-saie-canvas pb-6 md:pb-0 ${
        dashboard ? 'lg:h-screen lg:overflow-hidden' : ''
      }`}
    >
      <EnlaceSaltar />
      <header className="bg-saie-primary text-white">
        <Contenedor ancho="normal" className="flex h-18 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-4">
            <Link to={RUTAS.inicioAlumno} className="flex shrink-0 items-center">
              <img src={logoBlanco} alt="SAIE" className="h-9 w-auto" />
            </Link>
            <span className="hidden rounded-full bg-white/15 px-3 py-1 text-sm font-medium sm:inline-flex">
              Estudiante
            </span>
          </div>
          <div className="flex items-center gap-4">
            <p className="m-0 hidden text-right text-xs leading-4 text-white/80 sm:block">
              Sesión activa
              <strong className="block text-sm font-bold text-white">
                {etiquetaRol(sesion?.rol)}
              </strong>
            </p>
            <BotonCerrarSesion
              compacto
              className="border-white/30! bg-white/10! text-white! hover:bg-white/20!"
            />
          </div>
        </Contenedor>
      </header>

      <NavegacionEstudiante />

      <Contenedor
        como="main"
        ancho="normal"
        id={ID_CONTENIDO}
        tabIndex={-1}
        className={`flex flex-1 flex-col gap-4 py-4 focus:outline-none ${
          dashboard ? 'lg:min-h-0 lg:overflow-hidden' : ''
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

import React from 'react';
import { NavLink } from 'react-router-dom';
import { RUTAS } from '../../config/rutas';
import { Contenedor } from '../ui/Contenedor';
import type { AnchoContenedor } from '../ui/Contenedor';
import { ICONOS } from '../ui/iconos';

const TRAZO_HORARIO = ICONOS.calendario;
const TRAZO_PERFIL = ICONOS.usuario;
const TRAZO_MAPA = ICONOS.mapa;
const TRAZO_RUTA = ICONOS.ruta;
const TRAZO_TELEGRAM = ICONOS.enviar;

interface EnlaceEstudiante {
  to: string;
  etiqueta: string;
  trazo: string;
}

/** Las secciones del portal del estudiante, en el orden en que se recorren. */
const ENLACES_ESTUDIANTE: EnlaceEstudiante[] = [
  { to: RUTAS.horarioAlumno, etiqueta: 'Horario', trazo: TRAZO_HORARIO },
  { to: RUTAS.perfilAlumno, etiqueta: 'Perfil', trazo: TRAZO_PERFIL },
  { to: RUTAS.mapaAlumno, etiqueta: 'Mapa', trazo: TRAZO_MAPA },
  { to: RUTAS.rutaAlumno, etiqueta: 'Ruta', trazo: TRAZO_RUTA },
  { to: RUTAS.telegramAlumno, etiqueta: 'Telegram', trazo: TRAZO_TELEGRAM },
];

const claseLink = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center gap-0.5 px-1 py-2 text-xs transition-colors md:flex-none md:flex-row md:gap-2 md:rounded-lg md:px-4 md:text-sm ${
    isActive
      ? 'bg-saie-primary/10 font-bold text-saie-primary md:bg-saie-primary md:font-medium md:text-white'
      : 'font-medium text-saie-muted hover:text-saie-primary'
  }`;

/**
 * Barra de navegación del área del estudiante (Issue 3.29).
 *
 * Es lo que permite que la portada sea un tablero: cada sección está a un clic y no hay que
 * volver al inicio para cambiar de sitio. En móvil se fija abajo; en escritorio va bajo la
 * cabecera, como en el panel administrativo.
 */
export interface NavegacionEstudianteProps {
  /**
   * Ancho máximo del contenido: la barra debe medir lo mismo que la cabecera y el contenido de
   * la pantalla para que sus bordes calcen (en las pantallas de lectura es más estrecho).
   */
  ancho?: AnchoContenedor;
}

export const NavegacionEstudiante: React.FC<NavegacionEstudianteProps> = ({ ancho = 'normal' }) => (
  <nav
    aria-label="Navegación del área del estudiante"
    className="z-30 border-b border-saie-divider bg-white md:static"
  >
    <Contenedor como="ul" ancho={ancho} className="m-0 flex list-none gap-1 py-0 md:py-2">
      {ENLACES_ESTUDIANTE.map((enlace) => (
        <li key={enlace.to} className="flex flex-1 md:flex-none">
          <NavLink to={enlace.to} className={claseLink}>
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <path d={enlace.trazo} />
            </svg>
            {enlace.etiqueta}
          </NavLink>
        </li>
      ))}
    </Contenedor>
  </nav>
);

export default NavegacionEstudiante;

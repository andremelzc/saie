import React from 'react';
import { NavLink } from 'react-router-dom';
import { RUTAS } from '../../config/rutas';

const TRAZO_HORARIO =
  'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5';
const TRAZO_PERFIL =
  'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z';
const TRAZO_MAPA =
  'M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.19.69-.19 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z';
const TRAZO_RUTA =
  'M9 6.75V15m6-6v8.25m0 0a3 3 0 11-6 0 3 3 0 016 0zM15 9.75a3 3 0 11-6 0 3 3 0 016 0z';
const TRAZO_TELEGRAM =
  'M6 12 3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L5.999 12Z';

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
  `flex flex-1 flex-col items-center gap-0.5 px-2 py-2 text-xs transition-colors md:flex-none md:flex-row md:gap-2 md:rounded-lg md:px-4 md:text-sm ${
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
export const NavegacionEstudiante: React.FC = () => (
  <nav
    aria-label="Navegación del área del estudiante"
    className="z-30 border-b border-saie-divider bg-white md:static"
  >
    <ul className="mx-auto m-0 flex w-full max-w-7xl list-none gap-1 p-0 md:px-4 md:py-2">
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
    </ul>
  </nav>
);

export default NavegacionEstudiante;

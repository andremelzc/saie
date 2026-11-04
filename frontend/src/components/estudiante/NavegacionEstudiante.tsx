import React from 'react';
import { NavLink } from 'react-router-dom';
import { RUTAS } from '../../config/rutas';
import { Contenedor } from '../ui/Contenedor';
import type { AnchoContenedor } from '../ui/Contenedor';
import { ICONOS } from '../ui/iconos';
import { MenuMas } from '../ui/MenuMas';

const TRAZO_INICIO = ICONOS.inicio;
const TRAZO_AYUDA = ICONOS.ayuda;
const TRAZO_AJUSTES = ICONOS.ajustes;
const TRAZO_HORARIO = ICONOS.calendario;
const TRAZO_PERFIL = ICONOS.usuario;
const TRAZO_MAPA = ICONOS.mapa;
const TRAZO_RUTA = ICONOS.ruta;
const TRAZO_TELEGRAM = ICONOS.enviar;

interface EnlaceEstudiante {
  to: string;
  etiqueta: string;
  trazo: string;
  /** Por debajo de `lg` se llega desde la pestaña «Más», no desde la barra inferior. */
  secundaria?: boolean;
  /** Desde `lg`, empuja este enlace y los siguientes al extremo derecho de la barra. */
  alFinal?: boolean;
}

/** Las secciones del portal del estudiante, en el orden en que se recorren. */
const ENLACES_ESTUDIANTE: EnlaceEstudiante[] = [
  { to: RUTAS.inicioAlumno, etiqueta: 'Inicio', trazo: TRAZO_INICIO },
  { to: RUTAS.horarioAlumno, etiqueta: 'Horario', trazo: TRAZO_HORARIO },
  { to: RUTAS.perfilAlumno, etiqueta: 'Perfil', trazo: TRAZO_PERFIL },
  { to: RUTAS.mapaAlumno, etiqueta: 'Mapa', trazo: TRAZO_MAPA },
  { to: RUTAS.rutaAlumno, etiqueta: 'Ruta', trazo: TRAZO_RUTA },
  { to: RUTAS.telegramAlumno, etiqueta: 'Telegram', trazo: TRAZO_TELEGRAM, secundaria: true },
  { to: RUTAS.ayudaAlumno, etiqueta: 'Ayuda', trazo: TRAZO_AYUDA, secundaria: true, alFinal: true },
  {
    to: RUTAS.configuracionAlumno,
    etiqueta: 'Configuración',
    trazo: TRAZO_AJUSTES,
    secundaria: true,
  },
];

const SECUNDARIAS = ENLACES_ESTUDIANTE.filter((e) => e.secundaria);

const claseLink = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-14 flex-1 flex-col items-center gap-0.5 border-t-2 px-1 py-2 text-xs transition-colors lg:min-h-0 lg:flex-none lg:flex-row lg:gap-2 lg:rounded-lg lg:border-t-0 lg:px-4 lg:text-sm ${
    isActive
      ? 'border-saie-primary bg-saie-primary/10 font-bold text-saie-primary lg:bg-saie-primary lg:font-medium lg:text-white'
      : 'border-transparent font-medium text-saie-muted hover:text-saie-primary'
  }`;

/**
 * Barra de navegación del área del estudiante (Issue 3.29).
 *
 * Es lo que permite que la portada sea un tablero: cada sección está a un clic y no hay que
 * volver al inicio para cambiar de sitio. Por debajo de `lg` (1024 px) se fija abajo con las
 * secciones principales y una pestaña «Más» (Telegram, Ayuda y Configuración); desde `lg` va bajo
 * la cabecera con todo en una fila, como en el panel administrativo (Issue 3.34).
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
    data-barra-inferior
    className="saie-no-imprimir fixed inset-x-0 bottom-0 z-30 border-t border-saie-divider bg-white lg:static lg:border-b lg:border-t-0"
  >
    <Contenedor como="ul" ancho={ancho} className="m-0 flex list-none gap-1 py-0 lg:py-2">
      {ENLACES_ESTUDIANTE.map((enlace) => (
        <li
          key={enlace.to}
          className={`flex flex-1 lg:flex-none ${enlace.secundaria ? 'hidden lg:flex' : ''} ${
            enlace.alFinal ? 'lg:ml-auto' : ''
          }`}
        >
          <NavLink to={enlace.to} end className={claseLink}>
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
      <li className="flex flex-1 lg:hidden">
        <MenuMas pestanas={SECUNDARIAS} />
      </li>
    </Contenedor>
  </nav>
);

export default NavegacionEstudiante;

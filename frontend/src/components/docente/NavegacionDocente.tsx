import React from 'react';
import { NavLink } from 'react-router-dom';
import { RUTAS } from '../../config/rutas';
import { Contenedor } from '../ui/Contenedor';
import { ICONOS } from '../ui/iconos';

interface EnlaceDocente {
  to: string;
  etiqueta: string;
  trazo: string;
}

/** Las secciones del portal docente, en el orden en que se recorren. */
const ENLACES_DOCENTE: EnlaceDocente[] = [
  { to: RUTAS.inicioDocente, etiqueta: 'Inicio', trazo: ICONOS.inicio },
  { to: RUTAS.horarioDocente, etiqueta: 'Horario', trazo: ICONOS.calendario },
  { to: RUTAS.espaciosDocente, etiqueta: 'Espacios', trazo: ICONOS.edificio },
  {
    to: RUTAS.incidenciasDocente,
    etiqueta: 'Incidencias',

    trazo: ICONOS.alerta,
  },
  {
    to: RUTAS.solicitudesSoftwareDocente,
    etiqueta: 'Software',

    trazo: ICONOS.monitor,
  },
];

const claseLink = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-14 flex-1 flex-col items-center gap-0.5 border-t-2 px-1 py-2 text-xs transition-colors lg:min-h-0 lg:flex-none lg:flex-row lg:gap-2 lg:rounded-lg lg:border-t-0 lg:px-4 lg:text-sm ${
    isActive
      ? 'border-saie-primary bg-saie-primary/10 font-bold text-saie-primary lg:bg-saie-primary lg:font-medium lg:text-white'
      : 'border-transparent font-medium text-saie-muted hover:text-saie-primary'
  }`;

/**
 * Barra de navegación del portal docente: el mismo patrón que la del alumno y la del panel
 * (fija abajo por debajo de `lg`, bajo la cabecera desde `lg`), para que los tres portales se
 * recorran igual.
 */
export const NavegacionDocente: React.FC = () => (
  <nav
    aria-label="Navegación del portal docente"
    data-barra-inferior
    className="saie-no-imprimir fixed inset-x-0 bottom-0 z-30 border-t border-saie-divider bg-white lg:static lg:border-b lg:border-t-0"
  >
    <Contenedor como="ul" ancho="normal" className="m-0 flex list-none gap-1 py-0 lg:py-2">
      {ENLACES_DOCENTE.map((enlace) => (
        <li key={enlace.to} className="flex flex-1 lg:flex-none">
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
    </Contenedor>
  </nav>
);

export default NavegacionDocente;

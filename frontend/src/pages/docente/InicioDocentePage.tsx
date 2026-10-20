import React from 'react';
import { Link } from 'react-router-dom';
import CabeceraPortal from '../../components/CabeceraPortal';
import {
  MENSAJE_EN_DESARROLLO,
  PREVISION_EN_DESARROLLO,
} from '../../components/PantallaEnDesarrollo';
import { RUTAS } from '../../config/rutas';

interface AccesoDocente {
  to: string;
  titulo: string;
  descripcion: string;
  issue: string;
}

/** Accesos del portal docente; todos están todavía en desarrollo (Issues 7.8 a 7.11). */
const ACCESOS: AccesoDocente[] = [
  {
    to: RUTAS.horarioDocente,
    titulo: 'Mi horario y asignaciones',
    descripcion: 'Consulta tus cursos, secciones y el espacio asignado para cada clase.',
    issue: '#205 (7.8)',
  },
  {
    to: RUTAS.espaciosDocente,
    titulo: 'Explorar espacios y equipos',
    descripcion: 'Busca aulas y laboratorios disponibles y revisa su equipamiento.',
    issue: '#206 (7.9)',
  },
  {
    to: RUTAS.incidenciasDocente,
    titulo: 'Reportar una incidencia',
    descripcion: 'Informa fallas de equipos o del espacio directamente desde tu clase.',
    issue: '#207 (7.10)',
  },
];

/**
 * Portal del docente (Issues 7.8 a 7.12). Se construye en la siguiente entrega; por ahora el
 * inicio existe y enlaza a cada pantalla pendiente para que la navegación no quede rota.
 */
export const InicioDocentePage: React.FC = () => (
  <div className="min-h-screen bg-saie-canvas text-saie-text">
    <CabeceraPortal portal="Docente" />

    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-serif text-2xl font-bold sm:text-3xl">Portal del docente</h1>
        <p className="m-0 text-base text-saie-muted">
          Desde aquí consultarás tu horario, los espacios asignados y el equipamiento de cada
          laboratorio, y podrás reportar incidencias.
        </p>
      </div>

      <div className="flex flex-col gap-1 rounded-xl border border-saie-primary/25 bg-white px-4 py-3">
        <p role="status" className="m-0 text-sm font-bold text-saie-primary">
          {MENSAJE_EN_DESARROLLO}
        </p>
        <p className="m-0 text-sm text-saie-muted">{PREVISION_EN_DESARROLLO}</p>
      </div>

      <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {ACCESOS.map((acceso) => (
          <li key={acceso.to}>
            <Link
              to={acceso.to}
              className="group flex h-full flex-col gap-2 rounded-xl border border-saie-divider bg-white p-5 no-underline shadow-[var(--saie-shadow-1)] transition-shadow hover:border-saie-primary hover:shadow-[var(--saie-shadow-3)]"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-base font-bold text-saie-text">{acceso.titulo}</span>
                <span className="rounded-full bg-saie-canvas px-2.5 py-0.5 text-xs font-bold text-saie-primary">
                  En desarrollo
                </span>
              </span>
              <span className="text-sm text-saie-muted">{acceso.descripcion}</span>
              <span className="mt-auto text-sm font-semibold text-saie-primary group-hover:underline">
                Ver más →
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="m-0 text-xs text-saie-muted">
        Seguimiento en el repositorio: #205, #206, #207 (7.8 a 7.10) y #208 para la revisión de
        incidencias de Jefatura.
      </p>
    </main>
  </div>
);

export default InicioDocentePage;

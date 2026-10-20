import React from 'react';
import { Link } from 'react-router-dom';
import LayoutAdmin from '../../components/admin/LayoutAdmin';
import {
  MENSAJE_EN_DESARROLLO,
  PREVISION_EN_DESARROLLO,
} from '../../components/PantallaEnDesarrollo';
import { RUTAS } from '../../config/rutas';
import { useAuth } from '../../context/useAuth';

interface AccesoPendiente {
  to: string;
  titulo: string;
  descripcion: string;
  issue: string;
}

/** Pantallas de Coordinación Académica que se construyen en la siguiente entrega. */
const COORDINACION: AccesoPendiente[] = [
  {
    to: RUTAS.mapaAdmin,
    titulo: 'Mapa de ocupación por piso',
    descripcion: 'Planos por pabellón con la ocupación de cada aula y laboratorio.',
    issue: '#164, #165',
  },
  {
    to: RUTAS.laboratoriosAdmin,
    titulo: 'Laboratorios y equipos',
    descripcion: 'Estado de las PCs, el aforo y el software de cada laboratorio.',
    issue: '#167',
  },
  {
    to: RUTAS.altaAlumnoAdmin,
    titulo: 'Alta de alumnos',
    descripcion: 'Registro individual de un alumno fuera de la carga masiva.',
    issue: '#168',
  },
  {
    to: RUTAS.altaDocenteAdmin,
    titulo: 'Alta de docentes',
    descripcion: 'Registro individual y habilitación del acceso al portal docente.',
    issue: '#169',
  },
  {
    to: RUTAS.clavesAdmin,
    titulo: 'Claves y contraseñas',
    descripcion: 'Cambio de tu clave y restablecimiento de claves de usuarios.',
    issue: '#213, #218',
  },
  {
    to: RUTAS.softwareAdmin,
    titulo: 'Catálogo de software',
    descripcion: 'Alta y asignación del software disponible en los laboratorios.',
    issue: '#276',
  },
  {
    to: RUTAS.solicitudesSoftwareAdmin,
    titulo: 'Solicitudes de software',
    descripcion: 'Aprobación o rechazo de lo que solicitan los docentes.',
    issue: '#275',
  },
];

/** Pantallas de Jefatura de Laboratorios que se construyen en la siguiente entrega. */
const JEFATURA: AccesoPendiente[] = [
  {
    to: RUTAS.incidenciasAdmin,
    titulo: 'Revisión de incidencias',
    descripcion: 'Atención de las fallas de equipos y espacios reportadas por docentes.',
    issue: '#208',
  },
  {
    to: RUTAS.clavesAdmin,
    titulo: 'Claves y contraseñas',
    descripcion: 'Cambio de tu clave de acceso al panel.',
    issue: '#213',
  },
];

const Tarjeta: React.FC<{ acceso: AccesoPendiente }> = ({ acceso }) => (
  <li>
    <Link
      to={acceso.to}
      className="group flex h-full flex-col gap-2 rounded-xl border border-saie-divider bg-white p-5 no-underline shadow-[var(--saie-shadow-1)] transition-shadow hover:border-saie-primary hover:shadow-[var(--saie-shadow-3)]"
    >
      <span className="flex items-start justify-between gap-2">
        <span className="text-base font-bold text-saie-text">{acceso.titulo}</span>
        <span className="shrink-0 rounded-full bg-saie-canvas px-2.5 py-0.5 text-xs font-bold text-saie-primary">
          En desarrollo
        </span>
      </span>
      <span className="text-sm text-saie-muted">{acceso.descripcion}</span>
      <span className="mt-auto text-xs text-saie-muted">Issue {acceso.issue}</span>
    </Link>
  </li>
);

/**
 * Índice de las pantallas administrativas pendientes. Existe para que Coordinación y Jefatura
 * puedan ver el alcance de la siguiente entrega sin encontrar enlaces rotos en el panel.
 */
export const ProximamenteAdminPage: React.FC = () => {
  const { sesion } = useAuth();
  const esJefatura = sesion?.rol === 'JEFATURA_LABORATORIOS';
  const accesos = esJefatura ? JEFATURA : COORDINACION;

  return (
    <LayoutAdmin
      titulo="Próximamente"
      subtitulo={esJefatura ? 'Jefatura de Laboratorios' : 'Coordinación Académica'}
    >
      <div className="flex flex-col gap-1 rounded-xl border border-saie-primary/25 bg-white px-4 py-3">
        <p role="status" className="m-0 text-sm font-bold text-saie-primary">
          {MENSAJE_EN_DESARROLLO}
        </p>
        <p className="m-0 text-sm text-saie-muted">{PREVISION_EN_DESARROLLO}</p>
      </div>

      <section aria-labelledby="titulo-pendientes" className="flex flex-col gap-3">
        <h2 id="titulo-pendientes" className="m-0 text-lg font-bold text-saie-text">
          Pantallas de esta entrega
        </h2>
        <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {accesos.map((acceso) => (
            <Tarjeta key={acceso.to} acceso={acceso} />
          ))}
        </ul>
      </section>
    </LayoutAdmin>
  );
};

export default ProximamenteAdminPage;

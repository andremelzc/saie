import React from 'react';
import LayoutAdmin from '../../components/admin/LayoutAdmin';
import { BadgeEstado } from '../../components/ui/BadgeEstado';
import {
  MENSAJE_EN_DESARROLLO,
  PREVISION_EN_DESARROLLO,
} from '../../components/PantallaEnDesarrollo';
import { useAuth } from '../../context/useAuth';

interface Pendiente {
  titulo: string;
  descripcion: string;
}

/** Capacidades de Coordinación Académica que se construyen en la siguiente entrega. */
const COORDINACION: Pendiente[] = [
  {
    titulo: 'Catálogo y solicitudes de software',
    descripcion: 'Alta del software disponible y revisión de lo que solicitan los docentes.',
  },
];

/**
 * Capacidades de Jefatura de Laboratorios que se construyen en la siguiente entrega. Hoy no queda
 * ninguna: la revisión de incidencias (Issue 7.11) y el cambio de clave (Issue 4.21) ya funcionan.
 */
const JEFATURA: Pendiente[] = [];

/**
 * Hoja de ruta del panel. Es informativa: no enlaza a pantallas vacías ni muestra números
 * de issue. Las secciones que ya funcionan siguen accesibles desde el inicio.
 */
export const ProximamenteAdminPage: React.FC = () => {
  const { sesion } = useAuth();
  const esJefatura = sesion?.rol === 'JEFATURA_LABORATORIOS';
  const pendientes = esJefatura ? JEFATURA : COORDINACION;

  return (
    <LayoutAdmin
      titulo="Hoja de ruta"
      subtitulo={esJefatura ? 'Jefatura de Laboratorios' : 'Coordinación Académica'}
    >
      <section className="flex flex-col gap-1 rounded-xl border border-saie-primary/25 bg-white px-4 py-3">
        <p role="status" className="m-0 text-sm font-bold text-saie-primary">
          {MENSAJE_EN_DESARROLLO}
        </p>
        <p className="m-0 text-sm text-saie-muted">{PREVISION_EN_DESARROLLO}</p>
      </section>

      <section aria-labelledby="titulo-pendientes" className="flex flex-col gap-3">
        <h2 id="titulo-pendientes" className="m-0 text-lg font-bold text-saie-text">
          Lo que viene
        </h2>
        {pendientes.length === 0 ? (
          <p className="m-0 rounded-xl border border-saie-divider bg-white p-5 text-sm text-saie-muted">
            Por ahora no hay nada más en desarrollo para tu rol: todo lo que ya funciona está en el
            inicio.
          </p>
        ) : (
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2">
            {pendientes.map((pendiente) => (
              <li
                key={pendiente.titulo}
                className="flex flex-col gap-2 rounded-xl border border-saie-divider bg-white p-5"
              >
                <span className="flex flex-wrap items-start justify-between gap-2">
                  <span className="text-base font-bold text-saie-text">{pendiente.titulo}</span>
                  <BadgeEstado tono="neutro">En desarrollo</BadgeEstado>
                </span>
                <span className="text-sm text-saie-muted">{pendiente.descripcion}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </LayoutAdmin>
  );
};

export default ProximamenteAdminPage;

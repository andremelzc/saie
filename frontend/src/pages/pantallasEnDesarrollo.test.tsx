import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MENSAJE_EN_DESARROLLO, PREVISION_EN_DESARROLLO } from '../components/PantallaEnDesarrollo';
import InicioDocentePage from './docente/InicioDocentePage';
import HorarioDocentePage from './docente/HorarioDocentePage';
import EspaciosDocentePage from './docente/EspaciosDocentePage';
import IncidenciasDocentePage from './docente/IncidenciasDocentePage';
import MapaAdminPage from './admin/MapaAdminPage';
import LaboratoriosAdminPage from './admin/LaboratoriosAdminPage';
import AltaAlumnoPage from './admin/AltaAlumnoPage';
import AltaDocentePage from './admin/AltaDocentePage';
import ClavesAdminPage from './admin/ClavesAdminPage';
import SoftwareAdminPage from './admin/SoftwareAdminPage';
import SolicitudesSoftwareAdminPage from './admin/SolicitudesSoftwareAdminPage';
import IncidenciasAdminPage from './admin/IncidenciasAdminPage';
import ProximamenteAdminPage from './admin/ProximamenteAdminPage';

const auth = vi.hoisted(() => ({
  sesion: { rol: 'COORDINACION_ACADEMICA' } as { rol: string } | null,
}));

vi.mock('../context/useAuth', () => ({
  useAuth: () => ({ sesion: auth.sesion }),
}));

vi.mock('../components/auth/BotonCerrarSesion', () => ({
  default: () => <button type="button">Cerrar sesión</button>,
}));

function montar(nodo: React.ReactNode) {
  return render(<MemoryRouter>{nodo}</MemoryRouter>);
}

const PANTALLAS = [
  {
    nombre: 'Horario del docente',
    Page: HorarioDocentePage,
    titulo: 'Mi horario y asignaciones',
  },
  {
    nombre: 'Espacios del docente',
    Page: EspaciosDocentePage,
    titulo: 'Explorar espacios y equipos',
  },
  {
    nombre: 'Incidencias del docente',
    Page: IncidenciasDocentePage,
    titulo: 'Reportar una incidencia',
  },
  { nombre: 'Mapa del panel', Page: MapaAdminPage, titulo: 'Mapa de ocupación por piso' },
  {
    nombre: 'Laboratorios del panel',
    Page: LaboratoriosAdminPage,
    titulo: 'Laboratorios y equipos',
  },
  { nombre: 'Alta de alumnos', Page: AltaAlumnoPage, titulo: 'Alta de alumnos' },
  { nombre: 'Alta de docentes', Page: AltaDocentePage, titulo: 'Alta de docentes' },
  { nombre: 'Claves del panel', Page: ClavesAdminPage, titulo: 'Claves y contraseñas' },
  { nombre: 'Catálogo de software', Page: SoftwareAdminPage, titulo: 'Catálogo de software' },
  {
    nombre: 'Solicitudes de software',
    Page: SolicitudesSoftwareAdminPage,
    titulo: 'Solicitudes de software',
  },
  {
    nombre: 'Revisión de incidencias',
    Page: IncidenciasAdminPage,
    titulo: 'Revisión de incidencias',
  },
];

describe('pantallas en desarrollo', () => {
  beforeEach(() => {
    auth.sesion = { rol: 'COORDINACION_ACADEMICA' };
  });

  it.each(PANTALLAS)('$nombre anuncia que está en desarrollo', ({ Page, titulo }) => {
    montar(<Page />);

    expect(screen.getByRole('heading', { name: titulo })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(MENSAJE_EN_DESARROLLO);
    expect(screen.getByText(PREVISION_EN_DESARROLLO)).toBeVisible();
  });
});

describe('InicioDocentePage', () => {
  it('enlaza las pantallas pendientes del portal docente', () => {
    auth.sesion = { rol: 'DOCENTE' };
    montar(<InicioDocentePage />);

    expect(screen.getByRole('heading', { name: 'Portal del docente' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(MENSAJE_EN_DESARROLLO);
    expect(screen.getByRole('link', { name: /Mi horario y asignaciones/ })).toHaveAttribute(
      'href',
      '/docente/horario',
    );
    expect(screen.getByRole('link', { name: /Explorar espacios y equipos/ })).toHaveAttribute(
      'href',
      '/docente/espacios',
    );
    expect(screen.getByRole('link', { name: /Reportar una incidencia/ })).toHaveAttribute(
      'href',
      '/docente/incidencias',
    );
  });
});

describe('ProximamenteAdminPage', () => {
  it('Coordinación ve sus pantallas pendientes y no las de Jefatura', () => {
    montar(<ProximamenteAdminPage />);

    expect(screen.getByRole('heading', { name: 'Próximamente' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(MENSAJE_EN_DESARROLLO);
    expect(screen.getByText(PREVISION_EN_DESARROLLO)).toBeVisible();
    expect(screen.getByRole('link', { name: /Mapa de ocupación por piso/ })).toHaveAttribute(
      'href',
      '/admin/mapa',
    );
    expect(screen.getByRole('link', { name: /Alta de alumnos/ })).toHaveAttribute(
      'href',
      '/admin/alumnos/nuevo',
    );
    expect(screen.queryByRole('link', { name: /Revisión de incidencias/ })).toBeNull();
  });

  it('Jefatura ve solo la revisión de incidencias y el cambio de clave', () => {
    auth.sesion = { rol: 'JEFATURA_LABORATORIOS' };
    montar(<ProximamenteAdminPage />);

    expect(screen.getByRole('link', { name: /Revisión de incidencias/ })).toHaveAttribute(
      'href',
      '/admin/incidencias',
    );
    expect(screen.getByRole('link', { name: /Claves y contraseñas/ })).toHaveAttribute(
      'href',
      '/admin/claves',
    );
    expect(screen.queryByRole('link', { name: /Mapa de ocupación por piso/ })).toBeNull();
  });
});

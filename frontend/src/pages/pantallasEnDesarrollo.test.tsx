import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MENSAJE_EN_DESARROLLO, PREVISION_EN_DESARROLLO } from '../components/PantallaEnDesarrollo';
import TelegramAlumnoPage from './TelegramAlumnoPage';
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
  { nombre: 'Avisos por Telegram', Page: TelegramAlumnoPage, titulo: 'Avisos por Telegram' },
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
  it('explica que el portal estará disponible y ofrece salidas claras', () => {
    auth.sesion = { rol: 'DOCENTE' };
    montar(<InicioDocentePage />);

    expect(screen.getByRole('heading', { name: 'Portal del docente' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(MENSAJE_EN_DESARROLLO);
    expect(screen.getByText(PREVISION_EN_DESARROLLO)).toBeVisible();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Consultar espacios' })).toHaveAttribute(
      'href',
      '/consulta',
    );
    expect(screen.queryByRole('link', { name: /Mi horario y asignaciones/ })).toBeNull();
  });
});

describe('ProximamenteAdminPage', () => {
  it('Coordinación ve su hoja de ruta sin enlaces a pantallas vacías', () => {
    montar(<ProximamenteAdminPage />);

    expect(screen.getByRole('heading', { name: 'Hoja de ruta' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(MENSAJE_EN_DESARROLLO);
    expect(screen.getByText(PREVISION_EN_DESARROLLO)).toBeVisible();
    expect(screen.getByText('Mapa de ocupación por piso')).toBeVisible();
    expect(screen.getByText('Alta de alumnos y docentes')).toBeVisible();
    expect(screen.queryByText('Revisión de incidencias')).toBeNull();
    expect(screen.queryByRole('link', { name: /Mapa de ocupación por piso/ })).toBeNull();
  });

  it('Jefatura ve solo sus pendientes', () => {
    auth.sesion = { rol: 'JEFATURA_LABORATORIOS' };
    montar(<ProximamenteAdminPage />);

    expect(screen.getByText('Revisión de incidencias')).toBeVisible();
    expect(screen.getByText('Claves y contraseñas')).toBeVisible();
    expect(screen.queryByText('Mapa de ocupación por piso')).toBeNull();
    expect(screen.queryByRole('link', { name: /Revisión de incidencias/ })).toBeNull();
  });
});

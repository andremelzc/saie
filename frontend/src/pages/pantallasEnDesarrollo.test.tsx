import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MENSAJE_EN_DESARROLLO, PREVISION_EN_DESARROLLO } from '../components/PantallaEnDesarrollo';
import MapaAdminPage from './admin/MapaAdminPage';
import LaboratoriosAdminPage from './admin/LaboratoriosAdminPage';
import AltaAlumnoPage from './admin/AltaAlumnoPage';
import AltaDocentePage from './admin/AltaDocentePage';
import ClavesAdminPage from './admin/ClavesAdminPage';
import SoftwareAdminPage from './admin/SoftwareAdminPage';
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

    // La revisión de incidencias ya funciona (Issue 7.11): sale de la hoja de ruta.
    expect(screen.queryByText('Revisión de incidencias')).toBeNull();
    expect(screen.getByText('Claves y contraseñas')).toBeVisible();
    expect(screen.queryByText('Mapa de ocupación por piso')).toBeNull();
  });
});

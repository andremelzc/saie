import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MENSAJE_EN_DESARROLLO, PREVISION_EN_DESARROLLO } from '../components/PantallaEnDesarrollo';
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
    // Mapa, laboratorios, altas y claves ya funcionan: salen de la hoja de ruta.
    expect(screen.queryByText('Mapa de ocupación por piso')).toBeNull();
    expect(screen.queryByText('Laboratorios y equipos')).toBeNull();
    expect(screen.getByText('Catálogo y solicitudes de software')).toBeVisible();
    expect(screen.queryByText('Alta de alumnos y docentes')).toBeNull();
    expect(screen.queryByText('Revisión de incidencias')).toBeNull();
    expect(screen.queryByRole('link', { name: /Mapa de ocupación por piso/ })).toBeNull();
  });

  it('Jefatura ya no tiene pendientes y la hoja lo dice', () => {
    auth.sesion = { rol: 'JEFATURA_LABORATORIOS' };
    montar(<ProximamenteAdminPage />);

    // La revisión de incidencias (Issue 7.11) y el cambio de clave (Issue 4.21) ya funcionan.
    expect(screen.getByText(/no hay nada más en desarrollo para tu rol/)).toBeVisible();
    expect(screen.queryByText('Revisión de incidencias')).toBeNull();
    expect(screen.queryByText('Claves y contraseñas')).toBeNull();
    expect(screen.queryByText('Mapa de ocupación por piso')).toBeNull();
  });
});

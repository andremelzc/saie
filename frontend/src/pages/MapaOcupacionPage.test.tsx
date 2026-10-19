import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MapaOcupacionPage from './MapaOcupacionPage';
import { MENSAJE_EN_DESARROLLO } from '../components/PantallaEnDesarrollo';

vi.mock('../context/useAuth', () => ({
  useAuth: () => ({ sesion: { rol: 'ALUMNO' } }),
}));

vi.mock('../components/auth/BotonCerrarSesion', () => ({
  default: () => <button type="button">Cerrar sesión</button>,
}));

describe('MapaOcupacionPage', () => {
  it('anuncia que el mapa de ocupación está en desarrollo', () => {
    render(
      <MemoryRouter>
        <MapaOcupacionPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Mapa de ocupación' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(MENSAJE_EN_DESARROLLO);
    expect(screen.getByRole('link', { name: /Volver al inicio/ })).toHaveAttribute(
      'href',
      '/estudiante',
    );
  });
});

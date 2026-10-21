import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RutaAlumnoPage from './RutaAlumnoPage';
import { MENSAJE_EN_DESARROLLO } from '../components/PantallaEnDesarrollo';

vi.mock('../context/useAuth', () => ({
  useAuth: () => ({ sesion: { rol: 'ALUMNO' } }),
}));

vi.mock('../components/auth/BotonCerrarSesion', () => ({
  default: () => <button type="button">Cerrar sesión</button>,
}));

describe('RutaAlumnoPage', () => {
  it('anuncia que la ruta hacia el aula está en desarrollo', () => {
    render(
      <MemoryRouter>
        <RutaAlumnoPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Ruta hacia mi aula' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(MENSAJE_EN_DESARROLLO);
    expect(screen.getByRole('link', { name: /Volver al inicio/ })).toHaveAttribute(
      'href',
      '/estudiante',
    );
  });
});

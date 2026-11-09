import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MapaOcupacionPage from './MapaOcupacionPage';

vi.mock('../context/useAuth', () => ({
  useAuth: () => ({ sesion: { rol: 'ALUMNO' } }),
}));

vi.mock('../components/auth/BotonCerrarSesion', () => ({
  default: () => <button type="button">Cerrar sesión</button>,
}));

const montar = () =>
  render(
    <MemoryRouter>
      <MapaOcupacionPage />
    </MemoryRouter>,
  );

describe('MapaOcupacionPage', () => {
  it('muestra el mapa por piso, sin selector de pabellón, con los estados disponible y ocupado', () => {
    montar();

    expect(screen.getByRole('heading', { level: 1, name: 'Mapa de ocupación' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Piso 1' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('button', { name: 'Antiguo' })).toBeNull();
    const leyenda = screen.getByRole('list', { name: 'Leyenda del mapa' });
    expect(within(leyenda).getByText('Disponible')).toBeInTheDocument();
    expect(within(leyenda).queryByText('Con alerta')).toBeNull();
    expect(screen.getByText(/datos de ejemplo/i)).toBeInTheDocument();
  });

  it('al elegir un espacio muestra su detalle y se puede cerrar', () => {
    montar();
    const plano = screen.getByRole('group', { name: /Plano del piso 1/ });

    expect(screen.getByText(/Elige un aula o laboratorio/)).toBeInTheDocument();
    fireEvent.click(within(plano).getByRole('button', { name: /^Aula 101, pabellón nuevo/ }));

    const detalle = screen.getByRole('complementary', { name: 'Detalle del espacio' });
    expect(within(detalle).getByRole('heading', { name: 'Aula 101' })).toBeVisible();
    expect(within(detalle).getByText('NUE-101')).toBeVisible();
    expect(within(detalle).getByText('Pabellón nuevo')).toBeVisible();

    fireEvent.click(within(detalle).getByRole('button', { name: 'Cerrar detalle' }));
    expect(screen.getByText(/Elige un aula o laboratorio/)).toBeInTheDocument();
  });

  it('cambia de piso', () => {
    montar();

    fireEvent.click(screen.getByRole('tab', { name: 'Piso 2' }));

    expect(screen.getByRole('group', { name: /Plano del piso 2/ })).toBeInTheDocument();
  });
});

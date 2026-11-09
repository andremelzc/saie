import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MapaAdminPage from './MapaAdminPage';
import { esperarSinViolacionesGraves } from '../../test/axe';

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ sesion: { rol: 'COORDINACION_ACADEMICA' } }),
}));

vi.mock('../../components/auth/BotonCerrarSesion', () => ({
  default: () => <button type="button">Cerrar sesión</button>,
}));

const montar = () =>
  render(
    <MemoryRouter>
      <MapaAdminPage />
    </MemoryRouter>,
  );

describe('MapaAdminPage', () => {
  it('muestra el mapa del piso con los tres estados y los avisa como datos de ejemplo', () => {
    montar();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Mapa de ocupación por piso' }),
    ).toBeVisible();
    const leyenda = screen.getByRole('list', { name: 'Leyenda del mapa' });
    for (const estado of ['Disponible', 'Ocupado', 'Con alerta']) {
      expect(within(leyenda).getByText(estado)).toBeInTheDocument();
    }
    expect(screen.getByText(/datos de ejemplo/i)).toBeInTheDocument();
  });

  it('distingue aulas y laboratorios y abre el detalle al pulsar uno', () => {
    montar();
    const plano = screen.getByRole('group', { name: /Plano del piso 1/ });

    fireEvent.click(within(plano).getByRole('button', { name: /^Aula 104 - Laboratorio 08,/ }));

    const detalle = screen.getByRole('complementary', { name: 'Detalle del espacio' });
    expect(within(detalle).getByText('Laboratorio')).toBeVisible();
    expect(within(detalle).getByText('ANT-104')).toBeVisible();
    expect(within(detalle).getByText('Pabellón antiguo')).toBeVisible();
    expect(within(detalle).getByText('24 personas')).toBeVisible();
  });

  it('no tiene violaciones graves de accesibilidad', async () => {
    const { container } = montar();

    await esperarSinViolacionesGraves(container, { nombre: 'MapaAdminPage' });
  });
});

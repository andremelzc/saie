import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MapaOcupacionPage from './MapaOcupacionPage';
import { vaciarCacheCarga } from '../hooks/useCarga';
import { obtenerMapaOcupacion } from '../services/estudiante';

vi.mock('../context/useAuth', () => ({
  useAuth: () => ({ sesion: { rol: 'ALUMNO' } }),
}));

vi.mock('../components/auth/BotonCerrarSesion', () => ({
  default: () => <button type="button">Cerrar sesión</button>,
}));

vi.mock('../services/estudiante', async (importar) => ({
  ...(await importar<typeof import('../services/estudiante')>()),
  obtenerMapaOcupacion: vi.fn(),
}));

/** Lo que responde el backend: un par de espacios por pabellón y piso, con nombres de la BD. */
const POR_PISO: Record<string, { identificador: string; tipo: string; estado: string }[]> = {
  'Nuevo Pabellón|1': [{ identificador: 'Aula 101', tipo: 'AULA_TEORICA', estado: 'DISPONIBLE' }],
  'Antiguo Pabellón|1': [
    { identificador: 'Aula 101', tipo: 'AULA_TEORICA', estado: 'OCUPADO' },
    { identificador: 'Aula 104 - Laboratorio 08', tipo: 'LABORATORIO', estado: 'DISPONIBLE' },
  ],
};

const responder = async (pabellon: string, piso: number) => ({
  pabellon,
  piso,
  espacios: (POR_PISO[`${pabellon}|${piso}`] ?? []) as never,
});

const montar = () =>
  render(
    <MemoryRouter>
      <MapaOcupacionPage />
    </MemoryRouter>,
  );

describe('MapaOcupacionPage', () => {
  beforeEach(() => {
    vaciarCacheCarga();
    vi.mocked(obtenerMapaOcupacion).mockReset();
    vi.mocked(obtenerMapaOcupacion).mockImplementation(responder as never);
  });

  it('pide la ocupación de cada pabellón y piso y la muestra sobre el plano', async () => {
    montar();

    expect(screen.getByText(/Cargando el mapa/)).toBeVisible();
    const plano = await screen.findByRole('group', { name: /Plano del piso 1/ });

    expect(screen.getByRole('heading', { level: 1, name: 'Mapa de ocupación' })).toBeVisible();
    expect(vi.mocked(obtenerMapaOcupacion)).toHaveBeenCalledTimes(6);
    expect(vi.mocked(obtenerMapaOcupacion)).toHaveBeenCalledWith('Antiguo Pabellón', 3, null);
    // El mismo nombre en los dos pabellones se enlaza con su figura, no con la del otro.
    expect(
      within(plano).getByRole('button', { name: 'Aula 101, pabellón nuevo, disponible' }),
    ).toBeInTheDocument();
    expect(
      within(plano).getByRole('button', { name: 'Aula 101, pabellón antiguo, ocupado' }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/datos de ejemplo/i)).toBeNull();
    const leyenda = screen.getByRole('list', { name: 'Leyenda del mapa' });
    expect(within(leyenda).queryByText('Con alerta')).toBeNull();
  });

  it('al elegir un espacio muestra su detalle y se puede cerrar', async () => {
    montar();
    const plano = await screen.findByRole('group', { name: /Plano del piso 1/ });

    expect(screen.getByText(/Elige un aula o laboratorio/)).toBeInTheDocument();
    fireEvent.click(within(plano).getByRole('button', { name: /^Aula 101, pabellón nuevo/ }));

    const detalle = screen.getByRole('complementary', { name: 'Detalle del espacio' });
    expect(within(detalle).getByRole('heading', { name: 'Aula 101' })).toBeVisible();
    expect(within(detalle).getByText('NUE-101')).toBeVisible();

    fireEvent.click(within(detalle).getByRole('button', { name: 'Cerrar detalle' }));
    expect(screen.getByText(/Elige un aula o laboratorio/)).toBeInTheDocument();
  });

  it('cambia de piso', async () => {
    montar();
    await screen.findByRole('group', { name: /Plano del piso 1/ });

    fireEvent.click(screen.getByRole('tab', { name: 'Piso 2' }));

    expect(screen.getByRole('group', { name: /Plano del piso 2/ })).toBeInTheDocument();
  });

  it('si falla la carga muestra el error y permite reintentar', async () => {
    vi.mocked(obtenerMapaOcupacion).mockRejectedValue(new Error('sin red'));
    montar();

    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeVisible();
    expect(screen.queryByRole('group', { name: /Plano del piso/ })).toBeNull();

    vi.mocked(obtenerMapaOcupacion).mockImplementation(responder as never);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('group', { name: /Plano del piso 1/ })).toBeInTheDocument();
  });
});

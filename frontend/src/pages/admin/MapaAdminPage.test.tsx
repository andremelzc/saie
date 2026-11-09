import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MapaAdminPage from './MapaAdminPage';
import { esperarSinViolacionesGraves } from '../../test/axe';
import { vaciarCacheCarga } from '../../hooks/useCarga';
import { obtenerMapaOcupacionAdmin } from '../../services/admin';

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ sesion: { rol: 'COORDINACION_ACADEMICA' } }),
}));

vi.mock('../../components/auth/BotonCerrarSesion', () => ({
  default: () => <button type="button">Cerrar sesión</button>,
}));

vi.mock('../../services/admin', async (importar) => ({
  ...(await importar<typeof import('../../services/admin')>()),
  obtenerMapaOcupacionAdmin: vi.fn(),
}));

const ESPACIOS: Record<string, unknown[]> = {
  'Antiguo Pabellón|1': [
    {
      identificador: 'Aula 104 - Laboratorio 08',
      tipo: 'LABORATORIO',
      estado: 'OCUPADO',
      aforoNominal: 40,
      asignacion: { nombreCurso: 'Redes', codigoSeccion: '1-LAB', docenteNombre: 'Ana Pérez' },
      alertas: [],
    },
    {
      identificador: 'Aula 101',
      tipo: 'AULA_TEORICA',
      estado: 'ALERTA_ACTIVA',
      alertas: [{ motivo: 'Capacidad insuficiente' }],
    },
    { identificador: 'Aula 199', tipo: 'AULA_TEORICA', estado: 'DISPONIBLE' },
  ],
  'Antiguo Pabellón|2': [{ identificador: 'Aula 207', tipo: 'AULA_TEORICA', estado: 'DESHABILITADO' }],
  'Nuevo Pabellón|3': [{ identificador: 'Aula 301', tipo: 'AULA_TEORICA', estado: 'DISPONIBLE' }],
};

const responder = async (pabellon: string, piso: number) => ({
  pabellon,
  piso,
  espacios: ESPACIOS[`${pabellon}|${piso}`] ?? [],
});

const montar = () =>
  render(
    <MemoryRouter>
      <MapaAdminPage />
    </MemoryRouter>,
  );

describe('MapaAdminPage', () => {
  beforeEach(() => {
    vaciarCacheCarga();
    vi.mocked(obtenerMapaOcupacionAdmin).mockReset();
    vi.mocked(obtenerMapaOcupacionAdmin).mockImplementation(responder as never);
  });

  it('muestra el mapa con la ocupación real y los tres estados en la leyenda', async () => {
    montar();
    const plano = await screen.findByRole('group', { name: /Plano del piso 1/ });

    expect(
      screen.getByRole('heading', { level: 1, name: 'Mapa de ocupación por piso' }),
    ).toBeVisible();
    const leyenda = screen.getByRole('list', { name: 'Leyenda del mapa' });
    for (const estado of ['Disponible', 'Ocupado', 'Con alerta']) {
      expect(within(leyenda).getByText(estado)).toBeInTheDocument();
    }
    expect(screen.queryByText(/datos de ejemplo/i)).toBeNull();
    expect(
      within(plano).getByRole('button', { name: /^Aula 101, pabellón antiguo, con alerta/ }),
    ).toBeInTheDocument();
  });

  it('distingue aulas y laboratorios y el detalle trae la sección y el docente', async () => {
    montar();
    const plano = await screen.findByRole('group', { name: /Plano del piso 1/ });

    fireEvent.click(within(plano).getByRole('button', { name: /^Aula 104 - Laboratorio 08,/ }));

    const detalle = screen.getByRole('complementary', { name: 'Detalle del espacio' });
    expect(within(detalle).getByText('Laboratorio')).toBeVisible();
    expect(within(detalle).getByText('ANT-104')).toBeVisible();
    expect(within(detalle).getByText('40 personas')).toBeVisible();
    expect(within(detalle).getByText(/Redes \(sección 1-LAB\) · Ana Pérez/)).toBeVisible();
  });

  it('avisa de lo que el plano no dibuja y de lo que está fuera de servicio', async () => {
    montar();
    await screen.findByRole('group', { name: /Plano del piso 1/ });

    expect(screen.getByText(/no aparecen en el mapa/)).toHaveTextContent(
      'Antiguo Pabellón · Aula 199',
    );
    expect(screen.getByText(/no aparecen en el mapa/)).toHaveTextContent('Nuevo Pabellón · Aula 301');
    expect(screen.getByText(/Fuera de servicio/)).toHaveTextContent('ANT-207');
  });

  it('si falla la carga muestra el error', async () => {
    vi.mocked(obtenerMapaOcupacionAdmin).mockRejectedValue(new Error('sin red'));
    montar();

    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeVisible();
  });

  it('no tiene violaciones graves de accesibilidad', async () => {
    const { container } = montar();
    await screen.findByRole('group', { name: /Plano del piso 1/ });

    await esperarSinViolacionesGraves(container, { nombre: 'MapaAdminPage' });
  });
});

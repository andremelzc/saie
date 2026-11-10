import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProveedorAvisos } from '../../components/ui/Avisos';
import { vaciarCacheCarga } from '../../hooks/useCarga';
import { obtenerLaboratoriosConEstado } from '../../services/admin';
import type { LaboratorioConEstadoDTO } from '../../services/admin';
import { esperarSinViolacionesGraves } from '../../test/axe';
import LaboratoriosAdminPage from './LaboratoriosAdminPage';

let rol = 'JEFATURA_LABORATORIOS';
vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ sesion: { rol }, cerrarSesion: vi.fn() }),
}));
vi.mock('../../services/admin', () => ({
  CLAVE_LABORATORIOS_ESTADO: 'laboratorios-estado',
  obtenerLaboratoriosConEstado: vi.fn(),
}));

const laboratorios = vi.mocked(obtenerLaboratoriosConEstado);

const montar = (nodo: React.ReactNode) =>
  render(
    <MemoryRouter>
      <ProveedorAvisos>{nodo}</ProveedorAvisos>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  vaciarCacheCarga();
});

const lab = (o: Partial<LaboratorioConEstadoDTO>): LaboratorioConEstadoDTO => ({
  id: 'l1',
  identificador: 'Lab 04',
  tipo: 'LABORATORIO',
  pabellon: 'Nuevo Pabellón',
  piso: 2,
  aforoNominal: 30,
  softwareInstalado: [{ id: 's1', nombre: 'Python', version: '3.12' }],
  pcsMalogradas: 3,
  habilitado: true,
  descripcionUso: null,
  contiguos: [],
  camposEditables: [],
  estado: 'ALERTA_ACTIVA',
  capacidadReal: 27,
  asignacion: null,
  alertas: [{ id: 'al1', tipo: 'SOFTWARE', motivo: 'Falta Docker 24' }],
  ...o,
});

describe('Listado de laboratorios (Issue 4.16)', () => {
  beforeEach(() => {
    rol = 'JEFATURA_LABORATORIOS';
    laboratorios.mockResolvedValue([
      lab({}),
      lab({
        id: 'l2',
        identificador: 'Lab 01',
        piso: 3,
        estado: 'DISPONIBLE',
        pcsMalogradas: 0,
        capacidadReal: 25,
        aforoNominal: 25,
        alertas: [],
      }),
      lab({ id: 'l3', identificador: 'Lab 02', estado: 'OCUPADO', alertas: [] }),
    ]);
  });

  const tarjetas = async () =>
    within(await screen.findByRole('list', { name: 'Laboratorios' })).queryAllByRole('article');

  it('muestra el aforo real frente al nominal de cada laboratorio', async () => {
    montar(<LaboratoriosAdminPage />);
    const lab04 = await screen.findByRole('article', { name: 'Laboratorio Lab 04' });
    expect(lab04).toHaveTextContent('Aforo real 27 de 30 nominal');
    expect(within(lab04).getByRole('meter')).toHaveAttribute('aria-valuenow', '27');
    expect(within(lab04).getByText('Con alerta')).toBeInTheDocument();
    expect(
      within(lab04).getByRole('link', { name: 'Reportar cambio de Lab 04' }),
    ).toBeInTheDocument();
  });

  it('filtra por piso y por estado', async () => {
    montar(<LaboratoriosAdminPage />);
    expect(await tarjetas()).toHaveLength(3);
    fireEvent.change(screen.getByLabelText('Piso'), { target: { value: '3' } });
    expect((await tarjetas()).map((t) => t.getAttribute('aria-label'))).toEqual([
      'Laboratorio Lab 01',
    ]);
    fireEvent.change(screen.getByLabelText('Piso'), { target: { value: 'TODOS' } });
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'ALERTA_ACTIVA' } });
    expect((await tarjetas()).map((t) => t.getAttribute('aria-label'))).toEqual([
      'Laboratorio Lab 04',
    ]);
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'DISPONIBLE' } });
    expect((await tarjetas()).map((t) => t.getAttribute('aria-label'))).toEqual([
      'Laboratorio Lab 01',
    ]);
  });

  it('busca por nombre y permite limpiar los filtros', async () => {
    montar(<LaboratoriosAdminPage />);
    await tarjetas();
    fireEvent.change(screen.getByLabelText('Buscar laboratorio'), { target: { value: 'lab 02' } });
    await waitFor(async () => expect(await tarjetas()).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    await waitFor(async () => expect(await tarjetas()).toHaveLength(3));
  });

  it('no tiene violaciones de accesibilidad grave', async () => {
    const { container } = montar(<LaboratoriosAdminPage />);
    await tarjetas();
    await esperarSinViolacionesGraves(container, { nombre: 'LaboratoriosAdminPage' });
  });
});

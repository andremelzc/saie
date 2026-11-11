import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProveedorAvisos } from '../../components/ui/Avisos';
import { vaciarCacheCarga } from '../../hooks/useCarga';
import { cerrarIncidencia, obtenerEspacio, obtenerIncidencias } from '../../services/admin';
import { incidencia } from '../../test/fixtures/docente';
import IncidenciasAdminPage from './IncidenciasAdminPage';
import { esperarSinViolacionesGraves } from '../../test/axe';

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ sesion: { rol: 'JEFATURA_LABORATORIOS' }, cerrarSesion: vi.fn() }),
}));
vi.mock('../../services/admin', () => ({
  obtenerIncidencias: vi.fn(),
  cerrarIncidencia: vi.fn(),
  obtenerEspacio: vi.fn(),
}));

const listar = vi.mocked(obtenerIncidencias);
const cerrar = vi.mocked(cerrarIncidencia);
const espacio = vi.mocked(obtenerEspacio);

const montar = () =>
  render(
    <MemoryRouter>
      <ProveedorAvisos>
        <IncidenciasAdminPage />
      </ProveedorAvisos>
    </MemoryRouter>,
  );

describe('Revisión de incidencias por Jefatura (Issues 7.11 y 7.12)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vaciarCacheCarga();
    listar.mockResolvedValue([
      incidencia(),
      incidencia({
        id: 'inc-2',
        identificadorSeguimiento: 'INC-0000FFFF',
        tipo: 'SOFTWARE_FALTANTE',
        prioridad: 'BAJA',
      }),
    ]);
    espacio.mockResolvedValue({
      id: 'esp-l204',
      identificador: 'L-204',
      tipo: 'LABORATORIO',
      pabellon: 'Nuevo',
      piso: 2,
      aforoNominal: 30,
      softwareInstalado: [{ id: 's1', nombre: 'Python', version: '3.12' }],
      pcsMalogradas: 4,
      habilitado: true,
      descripcionUso: null,
      contiguos: [],
      camposEditables: [],
    });
  });

  it('lista las pendientes con su prioridad, tipo y espacio', async () => {
    montar();
    const lista = await screen.findByRole('list', { name: 'Incidencias' });
    expect(within(lista).getAllByRole('article')).toHaveLength(2);
    expect(within(lista).getByText('Prioridad alta')).toBeInTheDocument();
    expect(within(lista).getByText('Equipo que no funciona · L-204')).toBeInTheDocument();
    expect(listar).toHaveBeenCalledWith({ estado: 'PENDIENTE', prioridad: undefined });
  });

  it('muestra el detalle técnico del laboratorio junto a la incidencia', async () => {
    montar();
    fireEvent.click(await screen.findByRole('button', { name: 'Revisar incidencia INC-1A2B3C4D' }));
    const panel = await screen.findByRole('dialog');
    expect(within(panel).getByText('Las PCs 5 y 6 no encienden.')).toBeInTheDocument();
    const tecnico = await within(panel).findByRole('region', {
      name: 'Detalle técnico del espacio',
    });
    expect(within(tecnico).getByText('26')).toBeInTheDocument(); // aforo real = 30 - 4
    expect(within(tecnico).getByText('4')).toBeInTheDocument(); // PCs inoperativas
    expect(within(tecnico).getByText('Python 3.12')).toBeInTheDocument();
    expect(espacio).toHaveBeenCalledWith('esp-l204');
  });

  it('resolver exige un comentario y quita la incidencia sin recargar', async () => {
    cerrar.mockResolvedValue(
      incidencia({ estado: 'RESUELTA', comentarioCierre: 'Se cambiaron las fuentes.' }),
    );
    montar();
    fireEvent.click(await screen.findByRole('button', { name: 'Revisar incidencia INC-1A2B3C4D' }));
    const panel = await screen.findByRole('dialog');
    const resolver = within(panel).getByRole('button', { name: 'Marcar como resuelta' });
    expect(resolver).toBeDisabled();

    fireEvent.change(within(panel).getByLabelText(/Comentario de cierre/), {
      target: { value: 'Se cambiaron las fuentes.' },
    });
    fireEvent.click(resolver);

    await waitFor(() =>
      expect(cerrar).toHaveBeenCalledWith('inc-1', {
        estado: 'RESUELTA',
        comentario: 'Se cambiaron las fuentes.',
      }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Revisar incidencia INC-1A2B3C4D' })).toBeNull(),
    );
    expect(screen.getByText('1 incidencia por atender')).toBeInTheDocument();
    expect(listar).toHaveBeenCalledTimes(1);
  });

  it('descartar envía el estado DESCARTADA', async () => {
    cerrar.mockResolvedValue(incidencia({ estado: 'DESCARTADA', comentarioCierre: 'Duplicada' }));
    montar();
    fireEvent.click(await screen.findByRole('button', { name: 'Revisar incidencia INC-1A2B3C4D' }));
    const panel = await screen.findByRole('dialog');
    fireEvent.change(within(panel).getByLabelText(/Comentario de cierre/), {
      target: { value: 'Duplicada' },
    });
    fireEvent.click(within(panel).getByRole('button', { name: 'Descartar' }));
    await waitFor(() =>
      expect(cerrar).toHaveBeenCalledWith('inc-1', {
        estado: 'DESCARTADA',
        comentario: 'Duplicada',
      }),
    );
  });

  it('si el cierre falla, avisa y deja la incidencia abierta', async () => {
    // 409 del backend: la incidencia ya estaba cerrada (Issue 7.6).
    cerrar.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 409,
        data: { success: false, message: 'La incidencia ya estaba cerrada' },
      },
    });
    montar();
    fireEvent.click(await screen.findByRole('button', { name: 'Revisar incidencia INC-1A2B3C4D' }));
    const panel = await screen.findByRole('dialog');
    fireEvent.change(within(panel).getByLabelText(/Comentario de cierre/), {
      target: { value: 'Listo' },
    });
    fireEvent.click(within(panel).getByRole('button', { name: 'Marcar como resuelta' }));
    expect(await within(panel).findByText(/ya estaba cerrada/)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('filtra por estado y prioridad', async () => {
    montar();
    await screen.findByRole('list', { name: 'Incidencias' });
    listar.mockResolvedValue([]);
    fireEvent.click(screen.getByRole('button', { name: 'Resueltas' }));
    fireEvent.change(screen.getByLabelText('Prioridad'), { target: { value: 'ALTA' } });
    await waitFor(() =>
      expect(listar).toHaveBeenLastCalledWith({ estado: 'RESUELTA', prioridad: 'ALTA' }),
    );
    expect(await screen.findByText('Sin incidencias resueltas')).toBeInTheDocument();
  });

  it('la bandeja y el detalle no tienen violaciones de accesibilidad grave', async () => {
    const { container } = montar();
    fireEvent.click(await screen.findByRole('button', { name: 'Revisar incidencia INC-1A2B3C4D' }));
    await screen.findByRole('region', { name: 'Detalle técnico del espacio' });
    await esperarSinViolacionesGraves(container, { nombre: 'IncidenciasAdminPage' });
    await esperarSinViolacionesGraves(screen.getByRole('dialog'), {
      nombre: 'IncidenciasAdminPage (detalle)',
    });
  });
});

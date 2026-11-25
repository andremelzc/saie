import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SolicitudesLaboratorioAdminPage from './SolicitudesLaboratorioAdminPage';
import { ProveedorAvisos } from '../../components/ui/Avisos';
import { vaciarCacheCarga } from '../../hooks/useCarga';
import {
  obtenerSolicitudesLaboratorio,
  resolverSolicitudLaboratorio,
} from '../../services/fusionLaboratorio';
import { solicitudLaboratorio } from '../../test/fixtures/fusionLaboratorio';

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ sesion: { rol: 'COORDINACION_ACADEMICA' }, cerrarSesion: vi.fn() }),
}));
vi.mock('../../services/fusionLaboratorio', () => ({
  obtenerSolicitudesLaboratorio: vi.fn(),
  resolverSolicitudLaboratorio: vi.fn(),
}));

const obtener = vi.mocked(obtenerSolicitudesLaboratorio);
const resolver = vi.mocked(resolverSolicitudLaboratorio);

const montar = () =>
  render(
    <MemoryRouter>
      <ProveedorAvisos>
        <SolicitudesLaboratorioAdminPage />
      </ProveedorAvisos>
    </MemoryRouter>,
  );

describe('SolicitudesLaboratorioAdminPage (Issue 7.17)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vaciarCacheCarga();
  });

  it('muestra la pendiente con el horario que quedaría todo en laboratorio', async () => {
    obtener.mockResolvedValue({ pendientes: [solicitudLaboratorio()], resueltas: [] });
    montar();

    const tarjeta = (await screen.findByText(/202SW0805 · Grupo 2/)).closest('li') as HTMLElement;
    expect(within(tarjeta).getByText(/Dra. Rojas \(0A0690\)/)).toBeInTheDocument();
    expect(within(tarjeta).getByText(/Toda la práctica es con Git/)).toBeInTheDocument();
    expect(
      within(tarjeta).getByText('Jueves 18:00 – 20:00, Jueves 20:00 – 22:00'),
    ).toBeInTheDocument();
  });

  it('al aprobar confirma, reasigna y muestra el resultado', async () => {
    obtener.mockResolvedValue({ pendientes: [solicitudLaboratorio()], resueltas: [] });
    resolver.mockResolvedValue(
      solicitudLaboratorio({ estado: 'APROBADA', resultado: 'L-01 en todas sus franjas' }),
    );
    montar();

    fireEvent.click(await screen.findByRole('button', { name: 'Aprobar' }));
    const dialogo = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Sí, aprobar y reasignar' }));

    await waitFor(() => expect(resolver).toHaveBeenCalledWith('sol-1', { decision: 'APROBAR' }));
    expect(await screen.findByText(/L-01 en todas sus franjas/)).toBeInTheDocument();
  });

  it('exige el motivo para rechazar', async () => {
    obtener.mockResolvedValue({ pendientes: [solicitudLaboratorio()], resueltas: [] });
    resolver.mockResolvedValue(solicitudLaboratorio({ estado: 'RECHAZADA' }));
    montar();

    fireEvent.click(await screen.findByRole('button', { name: 'Rechazar' }));
    const dialogo = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Rechazar la solicitud' }));
    expect(within(dialogo).getByRole('alert')).toHaveTextContent(/al menos 5 caracteres/);
    expect(resolver).not.toHaveBeenCalled();

    fireEvent.change(within(dialogo).getByLabelText(/Motivo del rechazo/), {
      target: { value: 'El laboratorio no está libre los jueves' },
    });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Rechazar la solicitud' }));
    await waitFor(() =>
      expect(resolver).toHaveBeenCalledWith('sol-1', {
        decision: 'RECHAZAR',
        motivo: 'El laboratorio no está libre los jueves',
      }),
    );
  });

  it('las resueltas muestran el resultado o el motivo, sin botones', async () => {
    obtener.mockResolvedValue({
      pendientes: [],
      resueltas: [
        solicitudLaboratorio({
          estado: 'RECHAZADA',
          motivoRechazo: 'No hay laboratorio libre',
          fechaResolucion: '2026-11-24T18:00:00Z',
        }),
      ],
    });
    montar();

    expect(await screen.findByText('No hay solicitudes pendientes')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Resueltas \(1\)/ }));
    expect(
      await screen.findByText(/Motivo del rechazo: No hay laboratorio libre/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aprobar' })).toBeNull();
  });
});

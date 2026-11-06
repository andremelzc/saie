import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SolicitudesSoftwareAdminPage from './SolicitudesSoftwareAdminPage';
import { ProveedorAvisos } from '../../components/ui/Avisos';
import { vaciarCacheCarga } from '../../hooks/useCarga';
import {
  aprobarSolicitud,
  obtenerSolicitudes,
  rechazarSolicitud,
} from '../../services/solicitudesSoftware';
import type { SolicitudSoftwareDTO } from '../../types/solicitudesSoftware';

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ sesion: { rol: 'COORDINACION_ACADEMICA' }, cerrarSesion: vi.fn() }),
}));
vi.mock('../../services/solicitudesSoftware', () => ({
  obtenerSolicitudes: vi.fn(),
  aprobarSolicitud: vi.fn(),
  rechazarSolicitud: vi.fn(),
}));

const listar = vi.mocked(obtenerSolicitudes);
const aprobar = vi.mocked(aprobarSolicitud);
const rechazar = vi.mocked(rechazarSolicitud);

const solicitud = (o: Partial<SolicitudSoftwareDTO> = {}): SolicitudSoftwareDTO => ({
  id: 's1',
  nombre: 'Docker',
  version: '24.0',
  categoria: 'OTRO',
  justificacion: 'Para el laboratorio de contenedores',
  estado: 'PENDIENTE',
  fechaSolicitud: '2026-10-20T15:00:00Z',
  fechaResolucion: null,
  motivoRechazo: null,
  docente: { id: 'd1', nombre: 'Ana Pérez', codigoDocente: 'D001' },
  seccion: {
    id: 'sec1',
    codigoSeccion: '1',
    periodo: '2026-2',
    codigoCurso: 'IS301',
    nombreCurso: 'Sistemas distribuidos',
  },
  software: null,
  ...o,
});

const respuesta = (items: SolicitudSoftwareDTO[]) => ({
  items,
  total: items.length,
  page: 1,
  limit: 100,
});

const montar = () =>
  render(
    <MemoryRouter>
      <ProveedorAvisos>
        <SolicitudesSoftwareAdminPage />
      </ProveedorAvisos>
    </MemoryRouter>,
  );

describe('Solicitudes de software — Coordinación (Issue 4.29)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vaciarCacheCarga();
    listar.mockResolvedValue(respuesta([solicitud()]));
  });

  it('lista las pendientes con el docente, la sección y la justificación', async () => {
    montar();
    expect(await screen.findByRole('heading', { name: 'Docker 24.0' })).toBeInTheDocument();
    expect(screen.getByText(/Ana Pérez/)).toBeInTheDocument();
    expect(screen.getByText(/IS301 · 1 — Sistemas distribuidos/)).toBeInTheDocument();
    expect(screen.getByText('Para el laboratorio de contenedores')).toBeInTheDocument();
    expect(listar).toHaveBeenCalledWith('PENDIENTE');
  });

  it('cambiar el filtro pide las solicitudes de ese estado', async () => {
    montar();
    await screen.findByRole('heading', { name: 'Docker 24.0' });

    fireEvent.click(screen.getByRole('button', { name: 'Rechazadas' }));
    await waitFor(() => expect(listar).toHaveBeenLastCalledWith('RECHAZADA'));
  });

  it('aprobar avisa que no instala el software y permite añadirlo a la sección', async () => {
    aprobar.mockResolvedValue({
      solicitud: solicitud({ estado: 'APROBADA' }),
      agregadaASeccion: true,
    });
    montar();
    await screen.findByRole('heading', { name: 'Docker 24.0' });

    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }));
    const dialogo = await screen.findByRole('alertdialog');
    expect(within(dialogo).getByText(/no lo instala en ningún laboratorio/i)).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByLabelText(/Añadirlo también a los requerimientos/));
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Sí, aprobar' }));

    await waitFor(() => expect(aprobar).toHaveBeenCalledWith('s1', { agregarASeccion: true }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    await waitFor(() => expect(listar).toHaveBeenCalledTimes(2));
  });

  it('rechazar exige el motivo y lo envía', async () => {
    rechazar.mockResolvedValue(solicitud({ estado: 'RECHAZADA', motivoRechazo: 'Licencia' }));
    montar();
    await screen.findByRole('heading', { name: 'Docker 24.0' });

    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }));
    const dialogo = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Rechazar' }));
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(/motivo/i);
    expect(rechazar).not.toHaveBeenCalled();

    fireEvent.change(within(dialogo).getByLabelText(/Motivo del rechazo/), {
      target: { value: 'No tenemos licencia' },
    });
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Rechazar' }));

    await waitFor(() => expect(rechazar).toHaveBeenCalledWith('s1', 'No tenemos licencia'));
  });

  it('una solicitud sin sección no ofrece añadirla a una sección', async () => {
    listar.mockResolvedValue(respuesta([solicitud({ seccion: null })]));
    montar();
    await screen.findByRole('heading', { name: 'Docker 24.0' });

    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }));
    const dialogo = await screen.findByRole('alertdialog');
    expect(within(dialogo).queryByLabelText(/Añadirlo también/)).not.toBeInTheDocument();
  });

  it('las rechazadas muestran el motivo y no ofrecen acciones', async () => {
    listar.mockResolvedValue(
      respuesta([solicitud({ estado: 'RECHAZADA', motivoRechazo: 'No tenemos licencia' })]),
    );
    montar();
    expect(await screen.findByText('No tenemos licencia')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aprobar' })).not.toBeInTheDocument();
  });

  it('sin solicitudes pendientes muestra un estado vacío', async () => {
    listar.mockResolvedValue(respuesta([]));
    montar();
    expect(await screen.findByText('No hay solicitudes pendientes')).toBeInTheDocument();
  });
});

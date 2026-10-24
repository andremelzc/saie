import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SolicitudesSoftwareDocentePage from './SolicitudesSoftwareDocentePage';
import { ProveedorAvisos } from '../../components/ui/Avisos';
import { vaciarCacheCarga } from '../../hooks/useCarga';
import { crearSolicitud, obtenerMisSolicitudes } from '../../services/solicitudesSoftware';
import type { SolicitudSoftwareDTO } from '../../types/solicitudesSoftware';

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ sesion: { rol: 'DOCENTE' }, cerrarSesion: vi.fn() }),
}));
vi.mock('../../services/solicitudesSoftware', () => ({
  obtenerMisSolicitudes: vi.fn(),
  crearSolicitud: vi.fn(),
}));

const listar = vi.mocked(obtenerMisSolicitudes);
const crear = vi.mocked(crearSolicitud);

const solicitud = (o: Partial<SolicitudSoftwareDTO> = {}): SolicitudSoftwareDTO => ({
  id: 's1',
  nombre: 'Docker',
  version: '24.0',
  categoria: null,
  justificacion: 'Para contenedores',
  estado: 'PENDIENTE',
  fechaSolicitud: '2026-10-20T15:00:00Z',
  fechaResolucion: null,
  motivoRechazo: null,
  docente: { id: 'd1', nombre: 'Ana', codigoDocente: 'D001' },
  seccion: null,
  software: null,
  ...o,
});

const montar = () =>
  render(
    <MemoryRouter>
      <ProveedorAvisos>
        <SolicitudesSoftwareDocentePage />
      </ProveedorAvisos>
    </MemoryRouter>,
  );

const escribir = (etiqueta: RegExp | string, valor: string) =>
  fireEvent.change(screen.getByLabelText(etiqueta), { target: { value: valor } });

describe('Solicitudes de software — docente (Issue 4.29)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vaciarCacheCarga();
    listar.mockResolvedValue([]);
  });

  it('con una solicitud rechazada muestra su estado y el motivo', async () => {
    listar.mockResolvedValue([
      solicitud({ estado: 'RECHAZADA', motivoRechazo: 'No tenemos licencia' }),
    ]);
    montar();
    expect(await screen.findByText('Rechazada')).toBeInTheDocument();
    expect(screen.getByText('No tenemos licencia')).toBeInTheDocument();
  });

  it('sin solicitudes explica qué verá aquí', async () => {
    montar();
    expect(await screen.findByText('Aún no has pedido ningún software')).toBeInTheDocument();
  });

  it('valida el nombre y la justificación antes de enviar', async () => {
    montar();
    await screen.findByText('Aún no has pedido ningún software');

    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    expect(await screen.findByText('Escribe el nombre del software.')).toBeInTheDocument();
    expect(screen.getByText(/Cuéntanos para qué lo necesitas/)).toBeInTheDocument();
    expect(crear).not.toHaveBeenCalled();
  });

  it('envía la solicitud, limpia el formulario y vuelve a listar', async () => {
    crear.mockResolvedValue(solicitud());
    montar();
    await screen.findByText('Aún no has pedido ningún software');

    escribir('Nombre del software', ' Docker ');
    escribir(/Versión/, '24.0');
    escribir(/¿Para qué lo necesitas\?/, 'Para contenedores');
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    await waitFor(() =>
      expect(crear).toHaveBeenCalledWith({
        nombre: 'Docker',
        version: '24.0',
        categoria: undefined,
        justificacion: 'Para contenedores',
      }),
    );
    await waitFor(() => expect(listar).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText('Nombre del software')).toHaveValue('');
  });

  it('un 409 explica que el software ya está en el catálogo, sin mostrar identificadores', async () => {
    crear.mockRejectedValue({
      response: {
        status: 409,
        data: { success: false, message: "El software 'Docker' ya existe con ID 'abc-123'" },
      },
    });
    montar();
    await screen.findByText('Aún no has pedido ningún software');

    escribir('Nombre del software', 'Docker');
    escribir(/¿Para qué lo necesitas\?/, 'Para contenedores');
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));

    const aviso = await screen.findByRole('alert');
    expect(aviso).toHaveTextContent(/ya está en el catálogo/i);
    expect(aviso).not.toHaveTextContent('abc-123');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProveedorAvisos } from '../../components/ui/Avisos';
import { vaciarCacheCarga } from '../../hooks/useCarga';
import {
  obtenerHorarioDocente,
  obtenerMisIncidencias,
  reportarIncidencia,
  subirImagenIncidencia,
} from '../../services/docente';
import { horarioDocente } from '../../test/fixtures/docente';
import IncidenciasDocentePage from './IncidenciasDocentePage';

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ sesion: { rol: 'DOCENTE' }, cerrarSesion: vi.fn() }),
}));
vi.mock('../../services/docente', () => ({
  CLAVE_HORARIO_DOCENTE: 'docente:horario',
  CLAVE_INCIDENCIAS_DOCENTE: 'docente:incidencias',
  obtenerHorarioDocente: vi.fn(),
  obtenerMisIncidencias: vi.fn(),
  reportarIncidencia: vi.fn(),
  subirImagenIncidencia: vi.fn(),
}));

const reportar = vi.mocked(reportarIncidencia);
const subir = vi.mocked(subirImagenIncidencia);

const foto = (type = 'image/jpeg', bytes = 10) =>
  new File([new Uint8Array(bytes)], 'pc.jpg', { type });

const montar = () =>
  render(
    <MemoryRouter>
      <ProveedorAvisos>
        <IncidenciasDocentePage />
      </ProveedorAvisos>
    </MemoryRouter>,
  );

async function llenarYEnviar(archivo?: File) {
  await screen.findByRole('button', { name: 'Enviar reporte' });
  fireEvent.change(screen.getByLabelText(/Tipo de incidencia/), {
    target: { value: 'EQUIPO_NO_OPERATIVO' },
  });
  fireEvent.change(screen.getByLabelText(/Descripción/), {
    target: { value: 'La PC 5 no enciende.' },
  });
  if (archivo) {
    fireEvent.change(screen.getByLabelText(/Foto del problema/), { target: { files: [archivo] } });
  }
  fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }));
}

describe('Foto de la incidencia (Issue 7.19)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vaciarCacheCarga();
    vi.mocked(obtenerHorarioDocente).mockResolvedValue(horarioDocente());
    vi.mocked(obtenerMisIncidencias).mockResolvedValue([]);
    reportar.mockResolvedValue({
      id: 'inc-9',
      identificadorSeguimiento: 'INC-0000ABCD',
      estado: 'PENDIENTE',
      fechaReporte: '2026-11-24T14:30:00Z',
      mensaje: 'Incidencia registrada',
    });
  });

  it('registra la incidencia y después sube la foto elegida', async () => {
    subir.mockResolvedValue(undefined);
    const archivo = foto();
    montar();
    await llenarYEnviar(archivo);

    await screen.findByRole('status', { name: 'Incidencia registrada' });
    expect(subir).toHaveBeenCalledWith('inc-9', archivo);
    expect(screen.queryByText(/no se pudo adjuntar la foto/)).toBeNull();
  });

  it('rechaza un archivo que no es imagen o que pesa más de 2 MB', async () => {
    montar();
    await screen.findByRole('button', { name: 'Enviar reporte' });
    const campo = screen.getByLabelText(/Foto del problema/);

    fireEvent.change(campo, { target: { files: [foto('application/pdf')] } });
    expect(screen.getByRole('alert')).toHaveTextContent('JPEG, PNG o WebP');

    fireEvent.change(campo, { target: { files: [foto('image/png', 2 * 1024 * 1024 + 1)] } });
    expect(screen.getByRole('alert')).toHaveTextContent('2 MB');
  });

  it('sin foto no intenta subir nada', async () => {
    montar();
    await llenarYEnviar();
    await screen.findByRole('status', { name: 'Incidencia registrada' });
    expect(subir).not.toHaveBeenCalled();
  });

  it('si la foto falla, la incidencia queda registrada y se avisa', async () => {
    subir.mockRejectedValue(new Error('El archivo no es una imagen JPEG, PNG o WebP'));
    montar();
    await llenarYEnviar(foto());

    await screen.findByRole('status', { name: 'Incidencia registrada' });
    await waitFor(() =>
      expect(screen.getByText(/no se pudo adjuntar la foto/)).toBeInTheDocument(),
    );
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CambioLaboratorio from './CambioLaboratorio';
import {
  obtenerCatalogoActivo,
  obtenerLaboratorios,
  registrarPcsMalogradas,
  registrarSoftware,
} from '../../services/admin';
import type { EspacioAdminDTO } from '../../types/admin';

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ sesion: { rol: 'JEFATURA_LABORATORIOS' }, cerrarSesion: vi.fn() }),
}));
vi.mock('../../services/admin', () => ({
  obtenerLaboratorios: vi.fn(),
  obtenerCatalogoActivo: vi.fn(),
  registrarSoftware: vi.fn(),
  registrarPcsMalogradas: vi.fn(),
}));

const labs = vi.mocked(obtenerLaboratorios);
const catalogo = vi.mocked(obtenerCatalogoActivo);
const guardarSw = vi.mocked(registrarSoftware);
const guardarPcs = vi.mocked(registrarPcsMalogradas);

const lab: EspacioAdminDTO = {
  id: 'l1',
  identificador: 'LAB-301',
  tipo: 'LABORATORIO',
  pabellon: 'A',
  piso: 3,
  aforoNominal: 30,
  softwareInstalado: [{ id: 's1', nombre: 'MATLAB', version: 'R2024a' }],
  pcsMalogradas: 2,
  habilitado: true,
  descripcionUso: null,
  contiguos: [],
  camposEditables: [],
};

async function montarYElegir() {
  render(
    <MemoryRouter>
      <CambioLaboratorio />
    </MemoryRouter>,
  );
  await screen.findByRole('option', { name: /LAB-301/ });
  fireEvent.change(screen.getByLabelText('Laboratorio'), { target: { value: 'l1' } });
}

const botonGuardar = () => screen.getByRole('button', { name: 'Guardar cambios' });
const irAPcs = () => fireEvent.click(screen.getByRole('button', { name: /^PCs/ }));

describe('Formulario de cambio de laboratorio (Issue 4.19)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    labs.mockResolvedValue([lab]);
    catalogo.mockResolvedValue({
      items: [
        { id: 's1', nombre: 'MATLAB', version: 'R2024a', activo: true },
        { id: 's2', nombre: 'Python', version: '', activo: true },
      ],
      total: 2,
      page: 1,
      limit: 100,
    });
  });

  it('deshabilita los controles hasta elegir un laboratorio y explica por qué', async () => {
    render(
      <MemoryRouter>
        <CambioLaboratorio />
      </MemoryRouter>,
    );
    await screen.findByRole('option', { name: /LAB-301/ });

    expect(botonGuardar()).toBeDisabled();
    expect(screen.getByRole('button', { name: /^Software/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^PCs/ })).toBeDisabled();
    expect(screen.getByText(/Elige un laboratorio para editar/)).toBeInTheDocument();
    expect(screen.getByText('Elige un laboratorio primero.')).toBeInTheDocument();
  });

  it('precarga software instalado y PCs malogradas del laboratorio elegido', async () => {
    await montarYElegir();
    expect(screen.getByText(/Capacidad 30 · 2 PCs malogradas/)).toBeInTheDocument();
    expect(await screen.findByLabelText(/MATLAB/)).toBeChecked();
    expect(screen.getByLabelText(/Python/)).not.toBeChecked();

    irAPcs();
    expect(screen.getByLabelText(/Número total/)).toHaveValue(2);
  });

  it('guarda la selección de software con el botón único', async () => {
    guardarSw.mockResolvedValue({});
    await montarYElegir();
    fireEvent.click(await screen.findByLabelText(/Python/));
    fireEvent.click(screen.getByLabelText(/MATLAB/));
    expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument();

    fireEvent.click(botonGuardar());

    expect(await screen.findByText('Cambios guardados: software.')).toBeInTheDocument();
    expect(guardarSw).toHaveBeenCalledWith('l1', ['s2']);
    expect(guardarPcs).not.toHaveBeenCalled();
    await waitFor(() => expect(labs).toHaveBeenCalledTimes(2));
  });

  it('guarda software y PCs juntos en una sola acción', async () => {
    guardarSw.mockResolvedValue({});
    guardarPcs.mockResolvedValue({});
    await montarYElegir();
    fireEvent.click(await screen.findByLabelText(/Python/));
    irAPcs();
    fireEvent.change(screen.getByLabelText(/Número total/), { target: { value: '5' } });

    fireEvent.click(botonGuardar());

    expect(await screen.findByText('Cambios guardados: software y PCs.')).toBeInTheDocument();
    expect(guardarSw).toHaveBeenCalledWith('l1', ['s1', 's2']);
    expect(guardarPcs).toHaveBeenCalledWith('l1', 5);
  });

  it('muestra el error si falla el guardado de software', async () => {
    guardarSw.mockRejectedValue(new Error('x'));
    await montarYElegir();
    fireEvent.click(await screen.findByLabelText(/Python/));
    fireEvent.click(botonGuardar());
    expect(await screen.findByRole('alert')).toHaveTextContent('Inténtalo de nuevo');
  });

  it('guarda el número de PCs malogradas', async () => {
    guardarPcs.mockResolvedValue({});
    await montarYElegir();
    irAPcs();
    fireEvent.change(screen.getByLabelText(/Número total/), { target: { value: '5' } });
    fireEvent.click(botonGuardar());

    expect(await screen.findByText('Cambios guardados: PCs.')).toBeInTheDocument();
    expect(guardarPcs).toHaveBeenCalledWith('l1', 5);
  });

  it('rechaza valores de PCs inválidos', async () => {
    await montarYElegir();
    irAPcs();
    const input = screen.getByLabelText(/Número total/);

    fireEvent.change(input, { target: { value: '-1' } });
    expect(screen.getByText(/entero mayor o igual a 0/)).toBeInTheDocument();
    expect(botonGuardar()).toBeDisabled();

    fireEvent.change(input, { target: { value: '' } });
    expect(botonGuardar()).toBeDisabled();

    fireEvent.change(input, { target: { value: '1.5' } });
    expect(botonGuardar()).toBeDisabled();

    fireEvent.change(input, { target: { value: '5' } });
    expect(botonGuardar()).toBeEnabled();
  });

  it('muestra el error si falla el guardado de PCs', async () => {
    guardarPcs.mockRejectedValue(new Error('x'));
    await montarYElegir();
    irAPcs();
    fireEvent.change(screen.getByLabelText(/Número total/), { target: { value: '5' } });
    fireEvent.click(botonGuardar());
    expect(await screen.findByRole('alert')).toHaveTextContent('Inténtalo de nuevo');
  });

  it('distingue «sin registrar» de 0 y permite registrar el valor', async () => {
    labs.mockResolvedValueOnce([{ ...lab, pcsMalogradas: null }]);
    labs.mockResolvedValue([{ ...lab, pcsMalogradas: 0 }]);
    guardarPcs.mockResolvedValue({});
    await montarYElegir();

    expect(screen.getByText(/PCs malogradas sin registrar/)).toBeInTheDocument();
    irAPcs();
    const input = screen.getByLabelText(/Número total/);
    expect(input).toHaveValue(null);
    expect(input).toHaveAttribute('placeholder', 'Sin registrar');
    expect(screen.getByText(/aún no tiene un valor registrado/)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.click(botonGuardar());

    expect(await screen.findByText('Cambios guardados: PCs.')).toBeInTheDocument();
    expect(guardarPcs).toHaveBeenCalledWith('l1', 0);
  });

  it('borra el mensaje de éxito en cuanto se edita de nuevo', async () => {
    guardarSw.mockResolvedValue({});
    await montarYElegir();
    fireEvent.click(await screen.findByLabelText(/Python/));
    fireEvent.click(botonGuardar());
    await screen.findByText('Cambios guardados: software.');

    fireEvent.click(screen.getByLabelText(/MATLAB/));

    expect(screen.queryByText('Cambios guardados: software.')).toBeNull();
    expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument();
  });

  it('busca en el catálogo de software y conserva el contador de seleccionados', async () => {
    await montarYElegir();
    fireEvent.change(screen.getByLabelText('Buscar software'), { target: { value: 'python' } });

    expect(screen.getByLabelText(/Python/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/MATLAB/)).toBeNull();
    expect(screen.getByText(/de 2 seleccionados/)).toHaveTextContent('1 de 2 seleccionados');
  });

  it('muestra el error de carga de laboratorios y del catálogo', async () => {
    labs.mockRejectedValue(new Error('x'));
    catalogo.mockRejectedValue(new Error('y'));
    render(
      <MemoryRouter>
        <CambioLaboratorio />
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(2));
  });
});

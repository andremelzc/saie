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

  it('deshabilita los formularios hasta elegir un laboratorio', async () => {
    render(
      <MemoryRouter>
        <CambioLaboratorio />
      </MemoryRouter>,
    );
    await screen.findByRole('option', { name: /LAB-301/ });
    expect(screen.getByRole('button', { name: 'Guardar software' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Guardar PCs' })).toBeDisabled();
  });

  it('precarga software instalado y PCs malogradas del laboratorio elegido', async () => {
    await montarYElegir();
    expect(screen.getByText(/Aforo 30 · 2 PCs malogradas/)).toBeInTheDocument();
    expect(await screen.findByLabelText(/MATLAB/)).toBeChecked();
    expect(screen.getByLabelText(/Python/)).not.toBeChecked();
    expect(screen.getByLabelText(/Número total/)).toHaveValue(2);
  });

  it('guarda la selección de software modificada', async () => {
    guardarSw.mockResolvedValue({});
    await montarYElegir();
    fireEvent.click(await screen.findByLabelText(/Python/));
    fireEvent.click(screen.getByLabelText(/MATLAB/));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar software' }));
    expect(await screen.findByText('Software del laboratorio actualizado.')).toBeInTheDocument();
    expect(guardarSw).toHaveBeenCalledWith('l1', ['s2']);
    await waitFor(() => expect(labs).toHaveBeenCalledTimes(2));
  });

  it('muestra el error si falla el guardado de software', async () => {
    guardarSw.mockRejectedValue(new Error('x'));
    await montarYElegir();
    await screen.findByLabelText(/MATLAB/);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar software' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Inténtalo de nuevo');
  });

  it('guarda el número de PCs malogradas', async () => {
    guardarPcs.mockResolvedValue({});
    await montarYElegir();
    fireEvent.change(screen.getByLabelText(/Número total/), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar PCs' }));
    expect(await screen.findByText('Estado de PCs actualizado.')).toBeInTheDocument();
    expect(guardarPcs).toHaveBeenCalledWith('l1', 5);
  });

  it('rechaza valores de PCs inválidos', async () => {
    await montarYElegir();
    const input = screen.getByLabelText(/Número total/);
    fireEvent.change(input, { target: { value: '-1' } });
    expect(screen.getByText(/entero mayor o igual a 0/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar PCs' })).toBeDisabled();
    fireEvent.change(input, { target: { value: '' } });
    expect(screen.getByRole('button', { name: 'Guardar PCs' })).toBeDisabled();
    fireEvent.change(input, { target: { value: '1.5' } });
    expect(screen.getByRole('button', { name: 'Guardar PCs' })).toBeDisabled();
  });

  it('muestra el error si falla el guardado de PCs', async () => {
    guardarPcs.mockRejectedValue(new Error('x'));
    await montarYElegir();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar PCs' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Inténtalo de nuevo');
  });

  it('usa 0 PCs si el laboratorio no tiene el dato y avisa si falla la carga', async () => {
    labs.mockResolvedValueOnce([{ ...lab, pcsMalogradas: null, softwareInstalado: null }]);
    await montarYElegir();
    expect(screen.getByLabelText(/Número total/)).toHaveValue(0);
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

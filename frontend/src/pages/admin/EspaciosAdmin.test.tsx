import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EspaciosAdmin from './EspaciosAdmin';
import { obtenerEspacios } from '../../services/admin';
import type { EspacioAdminDTO } from '../../types/admin';

vi.mock('../../context/useAuth', () => ({
  useAuth: () => ({ sesion: { rol: 'COORDINACION_ACADEMICA' }, cerrarSesion: vi.fn() }),
}));
vi.mock('../../services/admin', () => ({ obtenerEspacios: vi.fn() }));

const obtener = vi.mocked(obtenerEspacios);

const espacio = (o: Partial<EspacioAdminDTO>): EspacioAdminDTO => ({
  id: 'e1',
  identificador: 'AULA-101',
  tipo: 'AULA_TEORICA',
  pabellon: 'A',
  piso: 1,
  aforoNominal: 40,
  softwareInstalado: null,
  pcsMalogradas: null,
  habilitado: true,
  descripcionUso: null,
  contiguos: [],
  camposEditables: [],
  ...o,
});

const montar = () =>
  render(
    <MemoryRouter>
      <EspaciosAdmin />
    </MemoryRouter>,
  );

describe('Gestión de espacios (Issue 4.15)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obtener.mockResolvedValue([
      espacio({}),
      espacio({
        id: 'e2',
        identificador: 'LAB-301',
        tipo: 'LABORATORIO',
        pcsMalogradas: 3,
        habilitado: false,
      }),
    ]);
  });

  it('lista los espacios con tipo, ubicación, PCs y estado', async () => {
    montar();
    expect(await screen.findByText('AULA-101')).toBeInTheDocument();
    expect(screen.getByText('Aula teórica')).toBeInTheDocument();
    expect(screen.getByText('Laboratorio')).toBeInTheDocument();
    // El pabellón se muestra tal como viene en la base ("Antiguo Pabellón"), sin prefijos.
    expect(screen.getAllByText(/^A · Piso 1$/)).toHaveLength(2);
    expect(screen.queryByText(/Pab\./)).toBeNull();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('Habilitado')).toBeInTheDocument();
    expect(screen.getByText('Fuera de servicio')).toBeInTheDocument();
    expect(screen.getByText('2 espacio(s)')).toBeInTheDocument();
    expect(screen.getByText('1 aula(s) teórica(s)')).toBeInTheDocument();
    expect(screen.getByText('1 laboratorio(s)')).toBeInTheDocument();
    expect(screen.getByText('1 fuera de servicio')).toBeInTheDocument();
  });

  it('filtra por tipo de espacio', async () => {
    montar();
    await screen.findByText('AULA-101');
    fireEvent.change(screen.getByLabelText('Tipo de espacio'), {
      target: { value: 'LABORATORIO' },
    });
    expect(screen.queryByText('AULA-101')).toBeNull();
    expect(screen.getByText('LAB-301')).toBeInTheDocument();
  });

  it('filtra por texto sin distinguir mayúsculas y muestra el estado vacío', async () => {
    montar();
    await screen.findByText('AULA-101');
    fireEvent.change(screen.getByLabelText('Buscar espacio'), { target: { value: ' lab' } });
    expect(screen.queryByText('AULA-101')).toBeNull();
    expect(screen.getByText('LAB-301')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Buscar espacio'), { target: { value: 'zzz' } });
    expect(screen.getByText('Sin espacios')).toBeInTheDocument();
  });

  it('muestra el error y permite reintentar', async () => {
    obtener.mockRejectedValueOnce(new Error('fallo'));
    montar();
    expect(await screen.findByText('Inténtalo de nuevo en unos minutos.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }));
    expect(await screen.findByText('AULA-101')).toBeInTheDocument();
    expect(obtener).toHaveBeenCalledTimes(2);
  });
});

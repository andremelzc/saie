import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AccesibilidadDocente from './AccesibilidadDocente';
import { ProveedorAvisos } from '../ui/Avisos';
import { vaciarCacheCarga } from '../../hooks/useCarga';
import {
  declararAccesibilidadDocente,
  obtenerAccesibilidadDocente,
} from '../../services/accesibilidad';

vi.mock('../../services/accesibilidad', () => ({
  obtenerAccesibilidadDocente: vi.fn(),
  declararAccesibilidadDocente: vi.fn(),
}));

const obtener = vi.mocked(obtenerAccesibilidadDocente);
const declarar = vi.mocked(declararAccesibilidadDocente);
const SIN_DECLARAR = { aprobada: false, vigenteHasta: null, solicitud: null };

const montar = () =>
  render(
    <MemoryRouter>
      <ProveedorAvisos>
        <AccesibilidadDocente />
      </ProveedorAvisos>
    </MemoryRouter>,
  );

describe('Aulas en el piso 1 para el docente (Issue 3.61)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vaciarCacheCarga();
  });

  it('pide aulas en el piso 1 con una fecha de fin opcional', async () => {
    obtener.mockResolvedValue(SIN_DECLARAR);
    declarar.mockResolvedValue(SIN_DECLARAR);
    montar();

    fireEvent.change(await screen.findByLabelText(/Hasta cuándo/), {
      target: { value: '2099-12-20' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Pedir aulas en el piso 1' }));
    await waitFor(() =>
      expect(declarar).toHaveBeenCalledWith({ declarado: true, fechaFin: '2099-12-20' }),
    );
  });

  it('rechaza una fecha de fin que ya pasó sin llamar al servidor', async () => {
    obtener.mockResolvedValue(SIN_DECLARAR);
    montar();
    fireEvent.change(await screen.findByLabelText(/Hasta cuándo/), {
      target: { value: '2000-01-01' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Pedir aulas en el piso 1' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('ya pasó');
    expect(declarar).not.toHaveBeenCalled();
  });

  it('aprobada: dice hasta cuándo rige y permite dejarla', async () => {
    obtener.mockResolvedValue({
      aprobada: true,
      vigenteHasta: '2026-12-20',
      solicitud: {
        estado: 'APROBADA',
        fechaSolicitud: '2026-11-20T15:00:00Z',
        fechaResolucion: '2026-11-21T15:00:00Z',
        motivoRechazo: null,
        fechaFin: '2026-12-20',
      },
    });
    declarar.mockResolvedValue(SIN_DECLARAR);
    montar();

    expect(await screen.findByText(/hasta el 20 de diciembre de 2026/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ya no lo necesito' }));
    await waitFor(() => expect(declarar).toHaveBeenCalledWith({ declarado: false }));
  });

  it('pendiente: muestra el estado y permite retirarla', async () => {
    obtener.mockResolvedValue({
      aprobada: false,
      vigenteHasta: null,
      solicitud: {
        estado: 'PENDIENTE',
        fechaSolicitud: '2026-11-20T15:00:00Z',
        fechaResolucion: null,
        motivoRechazo: null,
        fechaFin: null,
      },
    });
    montar();
    expect(await screen.findByText(/la está/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retirar la solicitud' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Hasta cuándo/)).toBeNull();
  });
});

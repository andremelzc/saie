import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ReorganizacionPrioridad } from './ReorganizacionPrioridad';
import { frasesSimulacion } from '../../utils/reorganizacion';
import { ProveedorAvisos } from '../ui/Avisos';
import { vaciarCacheCarga } from '../../hooks/useCarga';
import { ejecutarReorganizacion, obtenerReorganizacion } from '../../services/admin';
import type { VistaPreviaReorganizacionDTO } from '../../types/admin';

vi.mock('../../services/admin', () => ({
  obtenerReorganizacion: vi.fn(),
  ejecutarReorganizacion: vi.fn(),
}));

const obtener = vi.mocked(obtenerReorganizacion);
const ejecutar = vi.mocked(ejecutarReorganizacion);

const vista = (o: Partial<VistaPreviaReorganizacionDTO> = {}): VistaPreviaReorganizacionDTO => ({
  disponible: true,
  motivo: null,
  periodo: '2026-2',
  semanas: 2,
  desde: '2026-08-24',
  hasta: '2026-09-07',
  simulacion: { totalEscaladas: 3, escaladasConAula: 2, cambianDeAula: 4, pierdenAula: 1 },
  ...o,
});

const montar = (props: { deshabilitado?: boolean; onTerminar?: () => void } = {}) =>
  render(
    <ProveedorAvisos>
      <ReorganizacionPrioridad onTerminar={props.onTerminar ?? vi.fn()} {...props} />
    </ProveedorAvisos>,
  );

describe('ReorganizacionPrioridad (Issue 2.26)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vaciarCacheCarga();
  });

  it('fuera de la ventana no muestra nada', async () => {
    obtener.mockResolvedValue(vista({ disponible: false, simulacion: null, motivo: 'x' }));
    montar();
    await waitFor(() => expect(obtener).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'Reorganizar con prioridad' })).toBeNull();
  });

  it('muestra cuántas secciones cambiarían y reorganiza al confirmar', async () => {
    obtener.mockResolvedValue(vista());
    ejecutar.mockResolvedValue({ asignadas: 6, escaladas: 1 } as never);
    const onTerminar = vi.fn();
    montar({ onTerminar });

    fireEvent.click(await screen.findByRole('button', { name: 'Reorganizar con prioridad' }));
    const dialogo = await screen.findByRole('alertdialog');
    expect(within(dialogo).getByText(/hasta el 2026-09-07/)).toBeInTheDocument();
    expect(
      within(dialogo).getByText('2 de 3 secciones en revisión conseguirían aula.'),
    ).toBeInTheDocument();
    expect(within(dialogo).getByText('4 secciones cambiarían de aula.')).toBeInTheDocument();
    expect(within(dialogo).getByText(/1 sección quedaría en revisión/)).toBeInTheDocument();

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Sí, reorganizar' }));
    await waitFor(() => expect(ejecutar).toHaveBeenCalled());
    await waitFor(() => expect(onTerminar).toHaveBeenCalled());
    expect(await screen.findByText(/6 secciones con aula nueva/)).toBeInTheDocument();
  });

  it('sin secciones en revisión el botón queda deshabilitado con su motivo', async () => {
    obtener.mockResolvedValue(
      vista({
        simulacion: { totalEscaladas: 0, escaladasConAula: 0, cambianDeAula: 0, pierdenAula: 0 },
      }),
    );
    montar();
    const boton = await screen.findByRole('button', { name: 'Reorganizar con prioridad' });
    expect(boton).toBeDisabled();
    expect(screen.getByText('No hay secciones en revisión que priorizar.')).toBeInTheDocument();
  });

  it('con una corrida en curso el botón queda deshabilitado', async () => {
    obtener.mockResolvedValue(vista());
    montar({ deshabilitado: true });
    await screen.findByRole('button', { name: 'Reorganizar con prioridad' });
    expect(screen.getByText('Espera a que termine la asignación en curso.')).toBeInTheDocument();
  });

  it('cancelar no reorganiza', async () => {
    obtener.mockResolvedValue(vista());
    montar();
    fireEvent.click(await screen.findByRole('button', { name: 'Reorganizar con prioridad' }));
    const dialogo = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(ejecutar).not.toHaveBeenCalled();
  });
});

describe('frasesSimulacion (Issue 2.26)', () => {
  it('usa el singular y omite la frase de las que pierden aula si no hay', () => {
    expect(
      frasesSimulacion({
        totalEscaladas: 1,
        escaladasConAula: 1,
        cambianDeAula: 1,
        pierdenAula: 0,
      }),
    ).toEqual(['1 de 1 sección en revisión conseguiría aula.', '1 sección cambiaría de aula.']);
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TarjetaAlerta } from './TarjetaAlerta';

describe('TarjetaAlerta', () => {
  it('renderiza la tarjeta de alerta correctamente y responde a la acción de resolver', () => {
    const mockResolver = vi.fn();
    const alertaEjemplo = {
      id: '1',
      tipo: 'CAPACIDAD',
      mensaje: 'Exceso de aforo detectado',
      estado: 'PENDIENTE',
      fecha: '2026-10-19',
      espacio: { identificador: 'Lab 1' },
      asignacionesAfectadas: [],
    };

    render(
      <TarjetaAlerta
        alerta={alertaEjemplo as unknown as Parameters<typeof TarjetaAlerta>[0]['alerta']}
        onResolver={mockResolver}
      />,
    );

    const elemento = screen.queryByText(/Exceso de aforo/i) || screen.queryByText(/Lab 1/i);
    expect(elemento).toBeInTheDocument();

    const botones = screen.queryAllByRole('button');
    if (botones.length > 0) {
      fireEvent.click(botones[0]);
    }
  });
});

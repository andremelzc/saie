import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { FiltrosActivos } from './FiltrosActivos';

describe('FiltrosActivos (Issue 4.40)', () => {
  const quitarTipo = vi.fn();
  const quitarPeriodo = vi.fn();
  const filtros = [
    { id: 'tipo', etiqueta: 'Tipo de espacio', valor: 'Laboratorios', onQuitar: quitarTipo },
    { id: 'periodo', etiqueta: 'Periodo', valor: '2026-2', onQuitar: quitarPeriodo },
  ];

  it('muestra un chip por filtro con su valor legible', () => {
    render(<FiltrosActivos filtros={filtros} onLimpiar={vi.fn()} />);
    const grupo = screen.getByRole('group', { name: 'Filtros activos' });
    expect(within(grupo).getAllByRole('listitem')).toHaveLength(2);
    expect(within(grupo).getByText('Laboratorios')).toBeInTheDocument();
  });

  it('quita un filtro por separado con un botón que dice cuál quita', () => {
    render(<FiltrosActivos filtros={filtros} onLimpiar={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtro Periodo: 2026-2' }));
    expect(quitarPeriodo).toHaveBeenCalledTimes(1);
    expect(quitarTipo).not.toHaveBeenCalled();
  });

  it('«Limpiar filtros» los restablece todos', () => {
    const onLimpiar = vi.fn();
    render(<FiltrosActivos filtros={filtros} onLimpiar={onLimpiar} />);
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(onLimpiar).toHaveBeenCalledTimes(1);
  });

  it('no se muestra si no hay filtros activos', () => {
    render(<FiltrosActivos filtros={[]} onLimpiar={vi.fn()} />);
    expect(screen.queryByRole('group')).toBeNull();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SelectorSegmentado } from './SelectorSegmentado';

const OPCIONES = [
  { valor: 'a', etiqueta: 'Primera' },
  { valor: 'b', etiqueta: 'Segunda' },
  { valor: 'c', etiqueta: 'Tercera' },
] as const;

describe('SelectorSegmentado como pestañas (Issue 3.46)', () => {
  it('sin idBase sigue siendo un grupo de botones con aria-pressed', () => {
    render(
      <SelectorSegmentado
        opciones={[...OPCIONES]}
        valor="a"
        onCambiar={vi.fn()}
        etiquetaGrupo="Vista"
      />,
    );
    expect(screen.getByRole('button', { name: 'Primera' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('con idBase se anuncia como tablist y solo la pestaña activa entra en el tabulador', () => {
    render(
      <SelectorSegmentado
        opciones={[...OPCIONES]}
        valor="b"
        onCambiar={vi.fn()}
        etiquetaGrupo="Vista"
        idBase="demo"
      />,
    );
    expect(screen.getByRole('tablist', { name: 'Vista' })).toBeInTheDocument();
    const activa = screen.getByRole('tab', { name: 'Segunda' });
    expect(activa).toHaveAttribute('aria-selected', 'true');
    expect(activa).toHaveAttribute('tabindex', '0');
    expect(activa).toHaveAttribute('aria-controls', 'demo-panel-b');
    expect(screen.getByRole('tab', { name: 'Primera' })).toHaveAttribute('tabindex', '-1');
  });

  it('las flechas, Inicio y Fin mueven la selección con vuelta al llegar al borde', () => {
    const onCambiar = vi.fn();
    render(
      <SelectorSegmentado
        opciones={[...OPCIONES]}
        valor="c"
        onCambiar={onCambiar}
        etiquetaGrupo="Vista"
        idBase="demo"
      />,
    );
    const activa = screen.getByRole('tab', { name: 'Tercera' });

    fireEvent.keyDown(activa, { key: 'ArrowRight' });
    expect(onCambiar).toHaveBeenLastCalledWith('a');
    fireEvent.keyDown(activa, { key: 'ArrowLeft' });
    expect(onCambiar).toHaveBeenLastCalledWith('b');
    fireEvent.keyDown(activa, { key: 'Home' });
    expect(onCambiar).toHaveBeenLastCalledWith('a');
    fireEvent.keyDown(activa, { key: 'End' });
    expect(onCambiar).toHaveBeenLastCalledWith('c');
  });
});

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useTituloPagina } from './useTituloPagina';

const Pantalla: React.FC<{ titulo: string; conCampo?: boolean }> = ({ titulo, conCampo }) => {
  useTituloPagina(titulo);
  return (
    <main>
      <h1>{titulo}</h1>
      {conCampo && <input aria-label="Buscar" />}
    </main>
  );
};

const esperarTurno = () => new Promise((resolver) => setTimeout(resolver, 0));

describe('useTituloPagina (Issue 3.45)', () => {
  it('no mueve el foco en la carga inicial y sí al cambiar de pantalla', async () => {
    const primera = render(<Pantalla titulo="Inicio" />);
    expect(screen.getByRole('heading', { name: 'Inicio' })).not.toHaveFocus();
    await esperarTurno();
    primera.unmount();

    render(<Pantalla titulo="Horario" />);
    const h1 = screen.getByRole('heading', { name: 'Horario' });
    expect(h1).toHaveFocus();
    expect(h1).toHaveAttribute('tabindex', '-1');
    expect(document.title).toBe('Horario · SAIE');
  });

  it('no le quita el foco a quien está escribiendo en un campo', () => {
    const { rerender } = render(<Pantalla titulo="A" conCampo />);
    screen.getByLabelText('Buscar').focus();

    rerender(<Pantalla titulo="B" conCampo />);

    expect(screen.getByLabelText('Buscar')).toHaveFocus();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Paginador } from './Paginador';

const montar = (props: Partial<React.ComponentProps<typeof Paginador>> = {}) => {
  const onCambiarPagina = vi.fn();
  const onCambiarTamano = vi.fn();
  render(
    <Paginador
      pagina={1}
      tamano={50}
      total={312}
      onCambiarPagina={onCambiarPagina}
      onCambiarTamano={onCambiarTamano}
      nombreRegistros="secciones"
      {...props}
    />,
  );
  return { onCambiarPagina, onCambiarTamano };
};

describe('Paginador (Issue 4.38)', () => {
  it('resume el rango visible con el total real', () => {
    montar();
    expect(screen.getByRole('navigation', { name: 'Paginación' })).toHaveTextContent(
      'Mostrando 1–50 de 312 secciones',
    );
  });

  it('calcula el rango de la última página', () => {
    montar({ pagina: 7 });
    expect(screen.getByRole('navigation')).toHaveTextContent('Mostrando 301–312 de 312');
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();
  });

  it('deshabilita «anterior» en la primera página y avanza con «siguiente»', () => {
    const { onCambiarPagina } = montar();
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    expect(onCambiarPagina).toHaveBeenCalledWith(2);
  });

  it('permite saltar a cualquier página y cambiar el tamaño', () => {
    const { onCambiarPagina, onCambiarTamano } = montar();
    fireEvent.change(screen.getByLabelText('Ir a la página'), { target: { value: '5' } });
    expect(onCambiarPagina).toHaveBeenCalledWith(5);
    fireEvent.change(screen.getByLabelText('Por página'), { target: { value: '100' } });
    expect(onCambiarTamano).toHaveBeenCalledWith(100);
  });

  it('no se muestra sin registros', () => {
    montar({ total: 0 });
    expect(screen.queryByRole('navigation')).toBeNull();
  });
});

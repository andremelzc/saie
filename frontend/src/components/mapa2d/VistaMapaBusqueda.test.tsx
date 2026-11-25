import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import VistaMapa from './VistaMapa';
import type { EspacioMapa2D } from './etiquetas';

const mapa3d = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }));

vi.mock('../mapa3d/Mapa3DLazy', () => ({
  default: (props: Record<string, unknown>) => {
    mapa3d.props = props;
    return <div data-testid="mapa-3d">maqueta</div>;
  },
}));

const ESPACIOS: EspacioMapa2D[] = [
  { id: 'NUE-101', tipo: 'AULA_TEORICA', estado: 'DISPONIBLE', nombre: 'Aula 101' },
];

const montar = (onSeleccionar = vi.fn()) =>
  render(<VistaMapa espacios={ESPACIOS} seleccionado={null} onSeleccionar={onSeleccionar} />);

const buscar = (texto: string) => {
  fireEvent.change(screen.getByRole('combobox', { name: 'Buscar aula o laboratorio' }), {
    target: { value: texto },
  });
  fireEvent.mouseDown(screen.getByRole('option'));
};

describe('VistaMapa: búsqueda, filtros y franja', () => {
  it('elegir un resultado del buscador selecciona el espacio, va a su piso y enfoca', () => {
    const onSeleccionar = vi.fn();
    montar(onSeleccionar);

    buscar('101');

    expect(onSeleccionar).toHaveBeenCalledWith('NUE-101');
    expect(screen.getByRole('tab', { name: 'Piso 1' })).toHaveAttribute('aria-selected', 'true');
    const ancho = screen
      .getByRole('group', { name: /Plano del piso 1/ })
      .getAttribute('viewBox')!
      .split(' ')
      .map(Number)[2];
    expect(ancho).toBeLessThan(400);
  });

  it('en la maqueta 3D el buscador da la orden de volar hasta el espacio', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Maqueta 3D' }));

    buscar('101');

    expect(mapa3d.props?.ordenCamara).toMatchObject({ tipo: 'enfocar', id: 'NUE-101' });
    expect(mapa3d.props?.pisoInicial).toBe(1);
  });

  it('los filtros dejan fuera de la maqueta lo que no se quiere ver', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Maqueta 3D' }));
    expect((mapa3d.props?.espacios as unknown[]).length).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: 'Disponible' }));
    expect(screen.getByRole('button', { name: 'Disponible' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    expect((mapa3d.props?.espacios as unknown[]).length).toBe(0);

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar todo' }));
    expect((mapa3d.props?.espacios as unknown[]).length).toBe(1);
  });

  it('el selector de día y hora solo aparece si se pide y avisa de una franja inválida', () => {
    const { unmount } = montar();
    expect(screen.queryByRole('group', { name: 'Día y hora' })).toBeNull();
    unmount();

    const onFranjaCambiada = vi.fn();
    render(
      <VistaMapa
        espacios={ESPACIOS}
        seleccionado={null}
        onSeleccionar={vi.fn()}
        franja={{ dia: 'LUNES', horaInicio: '10:00', horaFin: '08:00' }}
        onFranjaCambiada={onFranjaCambiada}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/anterior a la de fin/);

    fireEvent.change(screen.getByLabelText('Día'), { target: { value: 'MARTES' } });
    expect(onFranjaCambiada).toHaveBeenCalledWith({
      dia: 'MARTES',
      horaInicio: '10:00',
      horaFin: '08:00',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ahora' }));
    expect(onFranjaCambiada).toHaveBeenLastCalledWith(null);
  });

  it('acepta vista y piso controlados desde fuera', () => {
    const onVistaCambiada = vi.fn();
    render(
      <VistaMapa
        espacios={ESPACIOS}
        seleccionado={null}
        onSeleccionar={vi.fn()}
        vista="3d"
        onVistaCambiada={onVistaCambiada}
        piso={2}
      />,
    );
    expect(screen.getByTestId('mapa-3d')).toBeInTheDocument();
    expect(mapa3d.props?.pisoInicial).toBe(2);

    fireEvent.click(screen.getByRole('button', { name: 'Plano 2D' }));
    expect(onVistaCambiada).toHaveBeenCalledWith('2d');
  });
});

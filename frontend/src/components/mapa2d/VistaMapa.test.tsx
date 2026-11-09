import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
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

const montar = (seleccionado: string | null = null, onSeleccionar = vi.fn()) =>
  render(
    <VistaMapa espacios={ESPACIOS} seleccionado={seleccionado} onSeleccionar={onSeleccionar} />,
  );

describe('VistaMapa', () => {
  it('muestra el plano 2D por defecto y no carga la maqueta 3D', () => {
    montar();

    expect(screen.getByRole('group', { name: /Plano del piso 1/ })).toBeInTheDocument();
    expect(screen.queryByTestId('mapa-3d')).toBeNull();
    expect(screen.getByRole('button', { name: 'Plano 2D' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('al elegir la maqueta 3D le pasa los planos, los espacios, la selección y el plano 2D de respaldo', () => {
    const onSeleccionar = vi.fn();
    montar('NUE-101', onSeleccionar);

    fireEvent.click(screen.getByRole('button', { name: 'Maqueta 3D' }));

    expect(screen.getByTestId('mapa-3d')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: /Plano del piso 1/ })).toBeNull();
    expect(mapa3d.props).toMatchObject({
      espacios: ESPACIOS,
      seleccionado: 'NUE-101',
      onSeleccionar,
      pisoInicial: 'todos',
    });
    expect(Object.keys(mapa3d.props?.planos as object)).toEqual(['1', '2', '3']);
    expect(mapa3d.props?.fallback).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Plano 2D' }));
    expect(screen.getByRole('group', { name: /Plano del piso 1/ })).toBeInTheDocument();
  });

  it('el piso elegido se conserva al cambiar de vista', () => {
    montar();

    fireEvent.click(screen.getByRole('tab', { name: 'Piso 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Maqueta 3D' }));
    expect(mapa3d.props?.pisoInicial).toBe(2);

    fireEvent.click(screen.getByRole('button', { name: 'Plano 2D' }));
    expect(screen.getByRole('group', { name: /Plano del piso 2/ })).toBeInTheDocument();
  });

  describe('ventana ampliada', () => {
    it('«Ampliar mapa» abre una ventana modal solo con el mapa, y el mapa deja de estar en la página', () => {
      montar();

      fireEvent.click(screen.getByRole('button', { name: 'Ampliar mapa' }));

      const ventana = screen.getByRole('dialog', { name: 'Mapa de ocupación' });
      expect(ventana).toHaveAttribute('aria-modal', 'true');
      expect(within(ventana).getByRole('group', { name: /Plano del piso 1/ })).toBeInTheDocument();
      expect(within(ventana).getByRole('button', { name: 'Cerrar' })).toHaveFocus();
      // Un solo mapa a la vez: el de la página se sustituye mientras la ventana está abierta.
      expect(screen.getAllByRole('group', { name: /Plano del piso 1/ })).toHaveLength(1);
      expect(screen.getByText('El mapa está ampliado.')).toBeInTheDocument();
    });

    it('pone los controles en una columna a un lado del mapa, no encima', () => {
      montar();
      fireEvent.click(screen.getByRole('button', { name: 'Ampliar mapa' }));
      const ventana = screen.getByRole('dialog');

      const lateral = within(ventana).getByRole('complementary', { name: 'Controles del mapa' });
      expect(within(lateral).getByRole('button', { name: 'Maqueta 3D' })).toBeInTheDocument();
      expect(within(lateral).getByRole('tab', { name: 'Piso 2' })).toBeInTheDocument();
      expect(within(lateral).getByRole('list', { name: 'Leyenda del mapa' })).toBeInTheDocument();
      // El plano no lleva controles propios sobre él.
      expect(within(ventana).getAllByRole('tablist')).toHaveLength(1);
      expect(lateral.contains(within(ventana).getByRole('tablist'))).toBe(true);

      fireEvent.click(within(lateral).getByRole('button', { name: 'Maqueta 3D' }));
      const lateral3d = within(ventana).getByRole('complementary', { name: 'Controles del mapa' });
      expect(within(lateral3d).getByRole('list', { name: 'Leyenda del mapa' })).toBeInTheDocument();
      expect(within(ventana).getByTestId('mapa-3d')).toBeInTheDocument();
    });

    it('se cierra con «Cerrar», con Escape y al pulsar fuera, y el mapa vuelve a la página', () => {
      montar();
      const abrir = () => fireEvent.click(screen.getByRole('button', { name: 'Ampliar mapa' }));

      abrir();
      fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.getByRole('group', { name: /Plano del piso 1/ })).toBeInTheDocument();

      abrir();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).toBeNull();

      abrir();
      const velo = screen.getByRole('dialog').previousElementSibling as HTMLElement;
      fireEvent.click(velo);
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('conserva la selección y la vista dentro de la ventana, y dice qué espacio está elegido', () => {
      montar('NUE-101');

      fireEvent.click(screen.getByRole('button', { name: 'Ampliar mapa' }));
      const ventana = screen.getByRole('dialog');
      expect(
        within(ventana).getByText('Aula 101: disponible', { selector: 'p' }),
      ).toBeInTheDocument();

      fireEvent.click(within(ventana).getByRole('button', { name: 'Maqueta 3D' }));
      expect(within(ventana).getByTestId('mapa-3d')).toBeInTheDocument();
    });

    it('sin selección invita a elegir un espacio', () => {
      montar();

      fireEvent.click(screen.getByRole('button', { name: 'Ampliar mapa' }));

      expect(
        within(screen.getByRole('dialog')).getByText(/Elige un aula o laboratorio/),
      ).toBeInTheDocument();
    });
  });
});

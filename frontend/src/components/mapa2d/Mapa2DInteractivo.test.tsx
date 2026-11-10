import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import Mapa2D from './Mapa2D';
import type { EspacioMapa2D } from './etiquetas';

const PISO_1 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
  <g id="espacios">
    <rect id="NUE-101" data-clase="aula" data-nombre="Aula 101" x="0" y="0" width="60" height="30"/>
    <rect id="NUE-102" data-clase="aula" data-nombre="Aula 102" x="60" y="0" width="60" height="30"/>
    <rect id="ANT-104" data-clase="laboratorio" data-nombre="Aula 104 - Laboratorio 08" x="0" y="40" width="60" height="30"/>
  </g>
  <g id="escaleras"><rect id="NUE-escalera-1" data-clase="escalera" x="130" y="0" width="30" height="30"/></g>
  <g id="puertas"><rect id="entrada-1" data-clase="puerta" x="200" y="100" width="10" height="4"/></g>
  <g id="muros"><polyline points="0,0 120,0 120,30"/></g>
</svg>`;
const PISO_2 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
  <g id="espacios"><rect id="NUE-201" data-clase="aula" data-nombre="Aula 201" x="0" y="0" width="60" height="30"/></g>
</svg>`;
const PLANOS = { 1: PISO_1, 2: PISO_2 };

const ESPACIOS: EspacioMapa2D[] = [
  { id: 'NUE-101', tipo: 'AULA_TEORICA', estado: 'DISPONIBLE', nombre: 'Aula 101' },
  { id: 'NUE-102', tipo: 'AULA_TEORICA', estado: 'ALERTA_ACTIVA', nombre: 'Aula 102' },
  { id: 'ANT-104', tipo: 'LABORATORIO', estado: 'OCUPADO', nombre: 'Aula 104 - Laboratorio 08' },
  { id: 'NUE-201', tipo: 'AULA_TEORICA', estado: 'OCUPADO', nombre: 'Aula 201' },
];

const montar = (props: Partial<React.ComponentProps<typeof Mapa2D>> = {}) =>
  render(<Mapa2D planos={PLANOS} espacios={ESPACIOS} {...props} />);

const vistaDe = () =>
  screen
    .getByRole('group', { name: /Plano del piso 1/ })
    .getAttribute('viewBox')!
    .split(' ')
    .map(Number);

describe('Mapa2D interactivo', () => {
  it('acerca y aleja con los botones y vuelve a ver todo el piso', () => {
    montar();
    const ancho0 = vistaDe()[2];
    expect(screen.getByRole('button', { name: 'Alejar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ver todo el piso' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Acercar' }));
    expect(vistaDe()[2]).toBeLessThan(ancho0);
    expect(screen.getByRole('button', { name: 'Alejar' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Ver todo el piso' }));
    expect(vistaDe()[2]).toBeCloseTo(ancho0);
  });

  it('las teclas más, menos y cero acercan, alejan y restablecen', () => {
    montar();
    const ancho0 = vistaDe()[2];
    const plano = screen.getByRole('button', { name: /Aula 101/ });

    fireEvent.keyDown(plano, { key: '+' });
    expect(vistaDe()[2]).toBeLessThan(ancho0);
    fireEvent.keyDown(plano, { key: '-' });
    expect(vistaDe()[2]).toBeCloseTo(ancho0);
    fireEvent.keyDown(plano, { key: '+' });
    fireEvent.keyDown(plano, { key: '0' });
    expect(vistaDe()[2]).toBeCloseTo(ancho0);
  });

  it('las flechas pasan el foco al espacio vecino', () => {
    montar();
    const a = screen.getByRole('button', { name: /Aula 101/ });
    a.focus();
    fireEvent.keyDown(a, { key: 'ArrowRight' });
    expect(screen.getByRole('button', { name: /Aula 102/ })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole('button', { name: /Aula 101/ }), { key: 'ArrowDown' });
    expect(screen.getByRole('button', { name: /Laboratorio 08/ })).toHaveFocus();
  });

  it('muestra un tooltip con el detalle al enfocar un espacio', () => {
    montar();
    expect(screen.queryByRole('tooltip')).toBeNull();

    fireEvent.focus(screen.getByRole('button', { name: /Aula 104/ }));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Ocupado · Laboratorio');

    fireEvent.blur(screen.getByRole('button', { name: /Aula 104/ }));
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('el filtro atenúa y desactiva lo que no cumple', () => {
    montar({ filtro: { estados: ['DISPONIBLE'], tipos: ['AULA_TEORICA', 'LABORATORIO'] } });

    const plano = screen.getByRole('group', { name: /Plano del piso 1/ });
    expect(within(plano).getAllByRole('button')).toHaveLength(1);
    expect(within(plano).getByRole('button', { name: /Aula 101/ })).toBeInTheDocument();
  });

  it('marca la entrada principal y las puertas al patio y las lleva a la leyenda', () => {
    montar();
    expect(screen.getByText('Entrada principal')).toBeInTheDocument();
    expect(screen.getByText('Entrada principal o puerta al patio')).toBeInTheDocument();
  });

  it('dibuja el norte y no inventa una escala en metros', () => {
    montar();
    expect(screen.queryByText(/≈/)).toBeNull();
    expect(screen.getByText('N')).toBeInTheDocument();
  });

  it('dibuja la ruta del piso mostrado y sus puntos numerados', () => {
    montar({
      capaRuta: {
        1: {
          puntos: [
            { x: 0, y: 0 },
            { x: 50, y: 50 },
          ],
          marcas: [{ punto: { x: 50, y: 50 }, etiqueta: 'Llegada', numero: 3, tipo: 'destino' }],
        },
      },
    });
    expect(screen.getByText('Llegada')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('el piso controlado manda y enfocar acerca la vista al espacio', () => {
    const { rerender } = montar({ piso: 2 });
    expect(screen.getByRole('tab', { name: 'Piso 2' })).toHaveAttribute('aria-selected', 'true');

    rerender(
      <Mapa2D planos={PLANOS} espacios={ESPACIOS} piso={1} enfocar={{ id: 'NUE-102', n: 1 }} />,
    );
    expect(vistaDe()[2]).toBeLessThan(400);
  });

  it('puede ocultar la leyenda', () => {
    montar({ leyenda: false });
    expect(screen.queryByRole('list', { name: 'Leyenda del mapa' })).toBeNull();
  });
});

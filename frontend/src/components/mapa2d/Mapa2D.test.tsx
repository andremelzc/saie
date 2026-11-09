import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import Mapa2D from './Mapa2D';
import type { EspacioMapa2D } from './etiquetas';

const PISO_1 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
  <g id="espacios">
    <rect id="NUE-101" data-clase="aula" data-nombre="Aula 101" x="0" y="0" width="60" height="30"/>
    <rect id="NUE-102" data-clase="aula" data-nombre="Aula 102" x="60" y="0" width="60" height="30"/>
    <rect id="ANT-104" data-clase="laboratorio" data-nombre="Aula 104 - Laboratorio 08" x="0" y="200" width="60" height="30"/>
    <rect id="ANT-auditorio" data-clase="auditorio" data-nombre="Auditorio" x="100" y="200" width="80" height="40"/>
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

describe('Mapa2D', () => {
  it('dibuja cada aula y laboratorio como un botón con su nombre y su estado', () => {
    montar();

    expect(
      screen.getByRole('button', { name: 'Aula 101, pabellón nuevo, disponible' }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Aula 102, pabellón nuevo, con alerta' }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Aula 104 - Laboratorio 08, pabellón antiguo, ocupado' }),
    ).toBeVisible();
  });

  it('solo las aulas y los laboratorios con datos son interactivos', () => {
    montar();

    const plano = screen.getByRole('group', { name: /Plano del piso 1/ });
    expect(within(plano).getAllByRole('button')).toHaveLength(3);
    expect(within(plano).queryByRole('button', { name: /Auditorio|Esc/ })).toBeNull();
  });

  it('distingue los tres estados por color y la alerta además por patrón', () => {
    montar();

    const relleno = (nombre: string) =>
      screen.getByRole('button', { name: nombre }).querySelector('rect')?.getAttribute('fill');
    expect(relleno('Aula 101, pabellón nuevo, disponible')).toBe('#10b981');
    expect(relleno('Aula 104 - Laboratorio 08, pabellón antiguo, ocupado')).toBe('#64748b');
    expect(relleno('Aula 102, pabellón nuevo, con alerta')).toMatch(/^url\(#mapa2d-alerta-.+\)$/);
  });

  it('marca el laboratorio con su borde turquesa y el texto LAB', () => {
    montar();

    const lab = screen.getByRole('button', { name: /Laboratorio 08/ });
    expect(lab.querySelector('rect')).toHaveAttribute('stroke', '#0d9488');
    expect(within(lab).getByText('LAB')).toBeInTheDocument();
    expect(
      screen
        .getByRole('button', { name: 'Aula 101, pabellón nuevo, disponible' })
        .querySelector('rect'),
    ).not.toHaveAttribute('stroke', '#0d9488');
  });

  it('al pulsar un espacio lo selecciona y avisa con su id', () => {
    const onSeleccionar = vi.fn();
    montar({ onSeleccionar });

    fireEvent.click(screen.getByRole('button', { name: 'Aula 101, pabellón nuevo, disponible' }));

    expect(onSeleccionar).toHaveBeenCalledWith('NUE-101');
    expect(
      screen.getByRole('button', { name: 'Aula 101, pabellón nuevo, disponible' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('se opera con el teclado (Enter y Espacio)', () => {
    const onSeleccionar = vi.fn();
    montar({ onSeleccionar });

    const aula = screen.getByRole('button', { name: 'Aula 101, pabellón nuevo, disponible' });
    fireEvent.keyDown(aula, { key: 'Enter' });
    fireEvent.keyDown(
      screen.getByRole('button', { name: 'Aula 102, pabellón nuevo, con alerta' }),
      { key: ' ' },
    );
    fireEvent.keyDown(aula, { key: 'a' });

    expect(onSeleccionar).toHaveBeenNthCalledWith(1, 'NUE-101');
    expect(onSeleccionar).toHaveBeenNthCalledWith(2, 'NUE-102');
    expect(onSeleccionar).toHaveBeenCalledTimes(2);
  });

  it('al pulsar fuera de una figura limpia la selección', () => {
    const onSeleccionar = vi.fn();
    montar({ onSeleccionar });

    fireEvent.click(screen.getByRole('button', { name: 'Aula 101, pabellón nuevo, disponible' }));
    fireEvent.click(screen.getByRole('group', { name: /Plano del piso 1/ }));

    expect(onSeleccionar).toHaveBeenLastCalledWith(null);
    expect(
      screen.getByRole('button', { name: 'Aula 101, pabellón nuevo, disponible' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('en modo controlado respeta `seleccionado` y no cambia por sí solo', () => {
    montar({ seleccionado: 'NUE-102' });

    fireEvent.click(screen.getByRole('button', { name: 'Aula 101, pabellón nuevo, disponible' }));

    expect(
      screen.getByRole('button', { name: 'Aula 102, pabellón nuevo, con alerta' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: 'Aula 101, pabellón nuevo, disponible' }),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('resalta los espacios indicados con borde discontinuo', () => {
    montar({ resaltados: ['NUE-101'] });

    expect(
      screen
        .getByRole('button', { name: 'Aula 101, pabellón nuevo, disponible' })
        .querySelector('rect'),
    ).toHaveAttribute('stroke-dasharray');
    expect(
      screen
        .getByRole('button', { name: 'Aula 102, pabellón nuevo, con alerta' })
        .querySelector('rect'),
    ).not.toHaveAttribute('stroke-dasharray');
  });

  it('permite alternar entre pisos', () => {
    montar();

    expect(screen.queryByRole('button', { name: /Aula 201/ })).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Piso 2' }));

    expect(screen.getByRole('button', { name: 'Aula 201, pabellón nuevo, ocupado' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /Aula 101/ })).toBeNull();
    expect(screen.getByRole('group', { name: /Plano del piso 2/ })).toBeInTheDocument();
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });

  it('empieza en el piso indicado', () => {
    montar({ pisoInicial: 2 });

    expect(screen.getByRole('tab', { name: 'Piso 2' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Aula 201, pabellón nuevo, ocupado' })).toBeVisible();
  });

  it('dibuja el contorno de lo seleccionado y lo resaltado por encima de los muros', () => {
    montar({ seleccionado: 'NUE-101', resaltados: ['NUE-102'] });

    const svg = screen.getByRole('group', { name: /Plano del piso 1/ });
    const hijos = Array.from(svg.children);
    const muro = hijos.findIndex((h) => h.tagName === 'polyline');
    // Tras los muros vienen los dos contornos; después, las marcas de entrada y la escala.
    const contornos = hijos
      .filter((h, i) => i > muro && h.tagName === 'g' && h.getAttribute('aria-hidden') === 'true')
      .slice(0, 2);

    expect(muro).toBeGreaterThan(-1);
    expect(contornos).toHaveLength(2);
    // Primero lo resaltado y al final lo seleccionado: queda arriba de todo, con halo blanco.
    const ultimo = contornos[1].querySelectorAll('rect');
    expect(ultimo[0]).toHaveAttribute('stroke', '#ffffff');
    expect(ultimo[1]).toHaveAttribute('stroke', '#4f46e5');
    expect(contornos[1].getAttribute('aria-hidden')).toBe('true');
    expect(contornos[0].querySelector('rect:last-child')).toHaveAttribute('stroke-dasharray');
  });

  it('con disposición lateral reúne los controles y la leyenda en una columna', () => {
    montar({ disposicion: 'lateral', barraLateral: <p>vista</p>, pieLateral: <p>pie</p> });

    const lateral = screen.getByRole('complementary', { name: 'Controles del mapa' });
    expect(within(lateral).getByText('vista')).toBeInTheDocument();
    expect(within(lateral).getByText('pie')).toBeInTheDocument();
    expect(within(lateral).getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical');
    expect(within(lateral).getByRole('list', { name: 'Leyenda del mapa' })).toBeInTheDocument();
    expect(screen.getAllByRole('list', { name: 'Leyenda del mapa' })).toHaveLength(1);
  });

  it('avisa el piso elegido', () => {
    const onPisoCambiado = vi.fn();
    montar({ onPisoCambiado });

    fireEvent.click(screen.getByRole('tab', { name: 'Piso 2' }));

    expect(onPisoCambiado).toHaveBeenCalledWith(2);
  });

  it('ajusta el recuadro a lo dibujado, no al lienzo del archivo', () => {
    montar();

    const [x, y, ancho, alto] = screen
      .getByRole('group', { name: /Plano del piso 1/ })
      .getAttribute('viewBox')!
      .split(' ')
      .map(Number);
    expect([x, y, ancho, alto].every(Number.isFinite)).toBe(true);
    expect(ancho).toBeLessThan(400);
  });

  it('muestra la leyenda de los estados pedidos', () => {
    montar({ estadosLeyenda: ['DISPONIBLE', 'OCUPADO'] });

    const leyenda = screen.getByRole('list', { name: 'Leyenda del mapa' });
    expect(within(leyenda).getByText('Disponible')).toBeInTheDocument();
    expect(within(leyenda).getByText('Ocupado')).toBeInTheDocument();
    expect(within(leyenda).queryByText('Con alerta')).toBeNull();
    expect(within(leyenda).getByText(/Laboratorio/)).toBeInTheDocument();
  });

  it('dibuja la puerta como una abertura blanca, sin etiqueta ni interacción', () => {
    montar();

    const plano = screen.getByRole('group', { name: /Plano del piso 1/ });
    const puerta = Array.from(plano.querySelectorAll('rect')).find(
      (r) => r.getAttribute('x') === '200' && r.getAttribute('y') === '100',
    );
    expect(puerta).toHaveAttribute('fill', '#ffffff');
    expect(puerta?.closest('g')).toHaveAttribute('aria-hidden', 'true');
    expect(within(plano).getAllByRole('button')).toHaveLength(3);
  });

  it('una figura reservable sin datos se ve en gris y no es interactiva', () => {
    montar({ espacios: ESPACIOS.filter((e) => e.id !== 'NUE-102') });

    expect(screen.queryByRole('button', { name: /Aula 102/ })).toBeNull();
  });

  it('avisa si no hay planos o si un plano no se puede leer', () => {
    const { unmount } = render(<Mapa2D planos={{}} espacios={[]} />);
    expect(screen.getByRole('alert')).toHaveTextContent('No hay planos disponibles.');
    unmount();

    render(<Mapa2D planos={{ 1: 'no es un svg' }} espacios={[]} />);
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo leer el plano de este piso.');
  });
});

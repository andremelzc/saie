import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import Plano2D from './Plano2D';
import { prepararSvg } from '../../utils/planosSvg';

describe('prepararSvg', () => {
  const SVG =
    '<svg viewBox="0 0 10 10"><style>:root { --a: 1; } .espacio, .escalera { stroke: red; }</style><rect id="x"/></svg>';

  it('acota las reglas CSS del plano a .plano2d para no afectar al resto de la página', () => {
    const salida = prepararSvg(SVG);
    expect(salida).toContain('.plano2d {');
    expect(salida).toContain('.plano2d .espacio, .plano2d .escalera {');
    expect(salida).not.toContain(':root');
  });

  it('agrega el rayado del estado ocupado', () => {
    expect(prepararSvg(SVG)).toContain('id="saie-ocupado"');
  });
});

describe('Plano2D', () => {
  const ESPACIOS = [
    { id: 'NUE-101', tipo: 'AULA_TEORICA' as const, estado: 'DISPONIBLE' as const },
    { id: 'NUE-103', tipo: 'AULA_TEORICA' as const, estado: 'OCUPADO' as const },
  ];

  it('dibuja el plano del piso pedido', () => {
    render(<Plano2D piso={2} etiqueta="Plano" espacios={ESPACIOS} />);
    expect(screen.getByTestId('plano-2d').querySelector('svg')).toHaveAttribute('data-piso', '2');
  });

  it('colorea cada espacio según su estado', () => {
    const { container } = render(<Plano2D piso={1} etiqueta="Plano" espacios={ESPACIOS} />);
    const css = container.querySelector('style')?.textContent ?? '';
    expect(css).toContain('[id="NUE-101"]');
    expect(css).toContain('#CDEBD6');
    expect(css).toContain('url(#saie-ocupado)');
  });

  it('avisa con el id del espacio tocado y con null al tocar un lugar sin datos', () => {
    const alSeleccionar = vi.fn();
    render(<Plano2D piso={1} etiqueta="Plano" espacios={ESPACIOS} onSeleccionar={alSeleccionar} />);
    const plano = screen.getByTestId('plano-2d');

    fireEvent.click(plano.querySelector('[id="NUE-103"]') as Element);
    expect(alSeleccionar).toHaveBeenLastCalledWith('NUE-103');

    fireEvent.click(plano.querySelector('[id="NUE-104"]') as Element);
    expect(alSeleccionar).toHaveBeenLastCalledWith(null);
  });

  it('tocar de nuevo el espacio seleccionado lo deselecciona', () => {
    const alSeleccionar = vi.fn();
    render(
      <Plano2D
        piso={1}
        etiqueta="Plano"
        espacios={ESPACIOS}
        seleccionado="NUE-101"
        onSeleccionar={alSeleccionar}
      />,
    );
    fireEvent.click(screen.getByTestId('plano-2d').querySelector('[id="NUE-101"]') as Element);
    expect(alSeleccionar).toHaveBeenLastCalledWith(null);
  });

  it('marca los espacios resaltados y ofrece centrarse en ellos', () => {
    render(<Plano2D piso={1} etiqueta="Plano" espacios={ESPACIOS} resaltados={['NUE-101']} />);
    expect(screen.getByTestId('plano-2d').querySelector('[id="NUE-101"]')).toHaveClass(
      'plano2d-mia',
    );
    expect(screen.getByRole('button', { name: 'Centrar en mi espacio' })).toBeVisible();
  });

  it('tiene controles de zoom', () => {
    render(<Plano2D piso={1} etiqueta="Plano" espacios={ESPACIOS} />);
    const svg = screen.getByTestId('plano-2d').querySelector('svg') as SVGSVGElement;
    const antes = svg.getAttribute('viewBox');
    fireEvent.click(screen.getByRole('button', { name: 'Acercar el plano' }));
    expect(svg.getAttribute('viewBox')).not.toBe(antes);
  });
});

import { describe, expect, it } from 'vitest';
import { leerPlano } from './geometria';

describe('leerPlano (geometria.ts) - Issue #269 / 5.23', () => {
  it('parsea viewBox y figuras válidas con id y data-clase', () => {
    const svgMock = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 800">
        <g id="espacios">
          <path id="NUE-101" data-clase="aula" d="M 10 10 L 100 10 L 100 80 L 10 80 Z" />
          <path id="NUE-LAB-1" data-clase="laboratorio" d="M 150 10 L 250 10 L 250 80 L 150 80 Z" />
        </g>
      </svg>
    `;

    const res = leerPlano(svgMock);

    expect(res.caja).toEqual({ x: 0, y: 0, ancho: 1000, alto: 800 });
    expect(res.figuras).toHaveLength(2);
    expect(res.figuras[0].id).toBe('NUE-101');
    expect(res.figuras[0].clase).toBe('aula');
    expect(res.figuras[0].shapes.length).toBeGreaterThan(0);

    expect(res.figuras[1].id).toBe('NUE-LAB-1');
    expect(res.figuras[1].clase).toBe('laboratorio');
  });

  it('ignora elementos sin id o sin data-clase', () => {
    const svgMock = `
      <svg viewBox="0 0 500 500">
        <path d="M 0 0 L 10 0 L 10 10 Z" />
        <path id="solo-id" d="M 20 20 L 30 20 L 30 30 Z" />
        <path data-clase="aula" d="M 40 40 L 50 40 L 50 50 Z" />
      </svg>
    `;

    const res = leerPlano(svgMock);
    expect(res.figuras).toHaveLength(0);
    expect(res.muros).toHaveLength(0);
  });

  it('extrae muros como polilíneas de la capa id="muros"', () => {
    const svgMock = `
      <svg viewBox="0 0 500 500">
        <g id="muros">
          <path d="M 10 20 L 30 40 L 50 60" />
        </g>
      </svg>
    `;

    const res = leerPlano(svgMock);
    expect(res.muros).toHaveLength(1);
    expect(res.muros[0].length).toBe(3);
    expect(res.muros[0][0]).toEqual({ x: 10, y: 20 });
    expect(res.muros[0][1]).toEqual({ x: 30, y: 40 });
    expect(res.muros[0][2]).toEqual({ x: 50, y: 60 });
  });

  it('maneja viewBox ausente asignando ceros por defecto', () => {
    const svgMock = `<svg><g id="muros"></g></svg>`;
    const res = leerPlano(svgMock);
    expect(res.caja).toEqual({ x: 0, y: 0, ancho: 0, alto: 0 });
    expect(res.figuras).toEqual([]);
    expect(res.muros).toEqual([]);
  });
});

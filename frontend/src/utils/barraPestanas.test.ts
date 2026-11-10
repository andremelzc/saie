import { describe, expect, it } from 'vitest';
import { pestanasQueNoCaben } from './barraPestanas';

const PESTANAS = [
  { to: '/inicio' },
  { to: '/espacios' },
  { to: '/secciones', secundaria: true },
  { to: '/alertas' },
  { to: '/historial', secundaria: true },
];
const ANCHOS = [100, 100, 100, 100, 100];

describe('pestanasQueNoCaben', () => {
  it('no oculta nada si caben todas', () => {
    expect([...pestanasQueNoCaben(PESTANAS, ANCHOS, 1000, 100, 4)]).toEqual([]);
  });

  it('sin medidas (p. ej. en pruebas) muestra todas', () => {
    expect([...pestanasQueNoCaben(PESTANAS, [0, 0, 0, 0, 0], 1000, 0, 4)]).toEqual([]);
    expect([...pestanasQueNoCaben(PESTANAS, ANCHOS, 0, 100, 4)]).toEqual([]);
  });

  it('manda primero a «Más» las secundarias, de la última a la primera', () => {
    // Todas ocupan 516; con «Más» (104) hay que dejar 3 pestañas + Más ≤ 420.
    expect([...pestanasQueNoCaben(PESTANAS, ANCHOS, 420, 100, 4)]).toEqual([
      '/historial',
      '/secciones',
    ]);
  });

  it('si no basta, sigue con las principales desde el final y nunca oculta Inicio', () => {
    expect([...pestanasQueNoCaben(PESTANAS, ANCHOS, 50, 100, 4)]).toEqual([
      '/historial',
      '/secciones',
      '/alertas',
      '/espacios',
    ]);
  });

  it('con un solo hueco libre oculta únicamente lo necesario', () => {
    expect([...pestanasQueNoCaben(PESTANAS, ANCHOS, 516 - 1, 100, 4)]).toEqual([
      '/historial',
      '/secciones',
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import { bloquesDeEscalera } from './escalera';

describe('bloquesDeEscalera (escalera de dos tramos con descanso)', () => {
  const largo = 38;
  const ancho = 23;
  const altura = 9;
  const bloques = bloquesDeEscalera(largo, ancho, altura);

  it('tiene dos tramos de cinco peldaños y un descanso', () => {
    expect(bloques).toHaveLength(11);
  });

  it('el primer tramo sube por la izquierda hasta la mitad de la altura', () => {
    const ida = bloques.slice(0, 5);
    expect(ida.every((b) => b.v > 0)).toBe(true);
    [0.2, 0.4, 0.6, 0.8, 1].forEach((f, i) => {
      expect(ida[i].alto).toBeCloseTo(f * (altura / 2), 9);
    });
    // Avanza hacia el descanso.
    expect(ida.map((b) => b.u)).toEqual([...ida.map((b) => b.u)].sort((a, b) => a - b));
  });

  it('el descanso ocupa todo el ancho en el extremo, a la mitad de la altura', () => {
    const descanso = bloques[5];
    expect(descanso.alto).toBe(altura / 2);
    expect(descanso.v).toBe(0);
    expect(descanso.ancho).toBeGreaterThan(ancho * 0.9);
    expect(descanso.u + descanso.largo / 2).toBeCloseTo(largo, 5);
  });

  it('el segundo tramo vuelve por la derecha y llega a la altura total', () => {
    const vuelta = bloques.slice(6);
    expect(vuelta.every((b) => b.v < 0)).toBe(true);
    expect(vuelta[vuelta.length - 1].alto).toBeCloseTo(altura, 5);
    // Regresa hacia el arranque.
    expect(vuelta.map((b) => b.u)).toEqual([...vuelta.map((b) => b.u)].sort((a, b) => b - a));
  });

  it('todo cabe dentro de la caja de la escalera', () => {
    for (const b of bloques) {
      expect(b.u - b.largo / 2).toBeGreaterThanOrEqual(-1e-9);
      expect(b.u + b.largo / 2).toBeLessThanOrEqual(largo + 1e-9);
      expect(Math.abs(b.v) + b.ancho / 2).toBeLessThanOrEqual(ancho / 2 + 1e-9);
    }
  });
});

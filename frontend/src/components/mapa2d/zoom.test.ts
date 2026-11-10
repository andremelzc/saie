import { describe, expect, it } from 'vitest';
import {
  acercar,
  centrarEn,
  desplazar,
  limitar,
  nivelZoom,
  pantallaAPlano,
  ZOOM_MAXIMO,
} from './zoom';

const BASE = { x: 0, y: 0, ancho: 400, alto: 300 };

describe('zoom del plano', () => {
  it('acercar mantiene quieto el punto ancla', () => {
    const ancla = { x: 100, y: 50 };
    const v = acercar(BASE, BASE, 2, ancla);
    expect(v.ancho).toBe(200);
    // El ancla conserva su posición relativa dentro de la vista.
    expect((ancla.x - v.x) / v.ancho).toBeCloseTo((ancla.x - BASE.x) / BASE.ancho);
    expect((ancla.y - v.y) / v.alto).toBeCloseTo((ancla.y - BASE.y) / BASE.alto);
  });

  it('no se aleja más que el plano completo ni se acerca más que el máximo', () => {
    expect(acercar(BASE, BASE, 0.1, { x: 200, y: 150 }).ancho).toBe(BASE.ancho);
    expect(acercar(BASE, BASE, 1000, { x: 200, y: 150 }).ancho).toBe(BASE.ancho / ZOOM_MAXIMO);
  });

  it('desplazar y limitar mantienen el centro de la vista dentro del plano', () => {
    const v = { x: 100, y: 100, ancho: 100, alto: 75 };
    expect(desplazar(BASE, v, 10, -20)).toMatchObject({ x: 110, y: 80 });
    const lejos = limitar(BASE, { x: 5000, y: -5000, ancho: 100, alto: 75 });
    expect(lejos.x + lejos.ancho / 2).toBe(400);
    expect(lejos.y + lejos.alto / 2).toBe(0);
  });

  it('centrarEn deja el punto en el centro con el zoom pedido', () => {
    const v = centrarEn(BASE, { x: 200, y: 150 }, 4);
    expect(nivelZoom(BASE, v)).toBe(4);
    expect(v.x + v.ancho / 2).toBeCloseTo(200);
    expect(v.y + v.alto / 2).toBeCloseTo(150);
  });

  it('pantallaAPlano convierte píxeles a coordenadas del plano con el dibujo centrado', () => {
    // Pantalla 800x300 para un plano 400x300: escala 1, margen lateral de 200 px.
    expect(pantallaAPlano(BASE, { ancho: 800, alto: 300 }, 200, 0)).toEqual({ x: 0, y: 0 });
    expect(pantallaAPlano(BASE, { ancho: 800, alto: 300 }, 400, 150)).toEqual({ x: 200, y: 150 });
    // Sin tamaño medido (jsdom) no divide entre cero.
    expect(Number.isFinite(pantallaAPlano(BASE, { ancho: 0, alto: 0 }, 5, 5).x)).toBe(true);
  });
});

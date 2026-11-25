import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { aplicarMovimiento, type LimitesCamara } from './camara';
import {
  accionDeTecla,
  FACTOR_ZOOM,
  PASO_DESPLAZAMIENTO,
  PASO_GIRO,
  PASO_INCLINACION,
} from './teclado';

const mover = (movimiento: object) => ({ tipo: 'mover', movimiento });

describe('accionDeTecla', () => {
  it('las flechas giran e inclinan; con Mayús desplazan', () => {
    expect(accionDeTecla('ArrowLeft', false)).toEqual(mover({ girar: -PASO_GIRO }));
    expect(accionDeTecla('ArrowRight', false)).toEqual(mover({ girar: PASO_GIRO }));
    expect(accionDeTecla('ArrowUp', false)).toEqual(mover({ inclinar: -PASO_INCLINACION }));
    expect(accionDeTecla('ArrowDown', false)).toEqual(mover({ inclinar: PASO_INCLINACION }));
    expect(accionDeTecla('ArrowLeft', true)).toEqual(mover({ derecha: -PASO_DESPLAZAMIENTO }));
    expect(accionDeTecla('ArrowRight', true)).toEqual(mover({ derecha: PASO_DESPLAZAMIENTO }));
    expect(accionDeTecla('ArrowUp', true)).toEqual(mover({ adelante: PASO_DESPLAZAMIENTO }));
    expect(accionDeTecla('ArrowDown', true)).toEqual(mover({ adelante: -PASO_DESPLAZAMIENTO }));
  });

  it('más y menos acercan y alejan, y cero reinicia', () => {
    expect(accionDeTecla('+', false)).toEqual(mover({ zoom: FACTOR_ZOOM }));
    expect(accionDeTecla('=', false)).toEqual(accionDeTecla('+', false));
    expect(accionDeTecla('-', false)).toEqual(mover({ zoom: 1 / FACTOR_ZOOM }));
    expect(accionDeTecla('_', false)).toEqual(accionDeTecla('-', false));
    expect(accionDeTecla('0', false)).toEqual({ tipo: 'reiniciar' });
  });

  it('ignora otras teclas y los atajos del navegador (Ctrl, Alt, Cmd)', () => {
    expect(accionDeTecla('a', false)).toBeNull();
    expect(accionDeTecla('Tab', false)).toBeNull();
    expect(accionDeTecla('+', false, true)).toBeNull();
    expect(accionDeTecla('ArrowLeft', false, true)).toBeNull();
  });
});

describe('aplicarMovimiento', () => {
  const limites: LimitesCamara = {
    anguloMinimo: 0.15,
    anguloMaximo: Math.PI / 2.1,
    distanciaMinima: 20,
    distanciaMaxima: 600,
  };
  const nueva = () => ({
    posicion: new Vector3(100, 150, 200),
    objetivo: new Vector3(0, 0, 0),
  });
  const polar = (p: Vector3, o: Vector3) => Math.acos(p.clone().sub(o).normalize().y);

  it('girar mantiene la distancia y la altura', () => {
    const { posicion, objetivo } = nueva();
    const antes = posicion.distanceTo(objetivo);
    aplicarMovimiento(posicion, objetivo, { girar: PASO_GIRO }, limites, 300);
    expect(posicion.distanceTo(objetivo)).toBeCloseTo(antes, 6);
    expect(posicion.y).toBeCloseTo(150, 6);
    expect(posicion.x).not.toBeCloseTo(100, 3);
  });

  it('inclinar no pasa de los ángulos permitidos', () => {
    const { posicion, objetivo } = nueva();
    for (let i = 0; i < 100; i++) {
      aplicarMovimiento(posicion, objetivo, { inclinar: 0.2 }, limites, 300);
    }
    expect(polar(posicion, objetivo)).toBeCloseTo(limites.anguloMaximo, 6);
    for (let i = 0; i < 100; i++) {
      aplicarMovimiento(posicion, objetivo, { inclinar: -0.2 }, limites, 300);
    }
    expect(polar(posicion, objetivo)).toBeCloseTo(limites.anguloMinimo, 6);
  });

  it('acercar y alejar respetan la distancia mínima y la máxima', () => {
    const { posicion, objetivo } = nueva();
    for (let i = 0; i < 100; i++) {
      aplicarMovimiento(posicion, objetivo, { zoom: FACTOR_ZOOM }, limites, 300);
    }
    expect(posicion.distanceTo(objetivo)).toBeCloseTo(limites.distanciaMinima, 6);
    for (let i = 0; i < 100; i++) {
      aplicarMovimiento(posicion, objetivo, { zoom: 1 / FACTOR_ZOOM }, limites, 300);
    }
    expect(posicion.distanceTo(objetivo)).toBeCloseTo(limites.distanciaMaxima, 6);
  });

  it('desplazar hacia delante mueve el objetivo por el suelo y arrastra la cámara', () => {
    const { posicion, objetivo } = nueva();
    const separacion = posicion.clone().sub(objetivo);
    aplicarMovimiento(posicion, objetivo, { adelante: 0.1 }, limites, 300);
    expect(objetivo.y).toBe(0);
    // Se avanzó hacia donde mira la cámara (hacia -x y -z desde (100, _, 200)).
    expect(objetivo.x).toBeLessThan(0);
    expect(objetivo.z).toBeLessThan(0);
    expect(objetivo.length()).toBeCloseTo(30, 6);
    // La cámara conserva su posición relativa al objetivo.
    expect(posicion.clone().sub(objetivo).distanceTo(separacion)).toBeLessThan(1e-6);
  });

  it('desplazar a la derecha va en perpendicular a la mirada', () => {
    const { posicion, objetivo } = nueva();
    aplicarMovimiento(posicion, objetivo, { derecha: 0.1 }, limites, 300);
    const mirada = new Vector3(-100, 0, -200).normalize();
    expect(objetivo.dot(mirada)).toBeCloseTo(0, 6);
    expect(objetivo.length()).toBeCloseTo(30, 6);
  });
});

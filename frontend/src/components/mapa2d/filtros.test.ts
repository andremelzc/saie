import { describe, expect, it } from 'vitest';
import { alternar, FILTRO_TODO, hayFiltro, pasaFiltro } from './filtros';
import { DIAS, esFranjaValida, leerFranja, semillaDeFranja } from './franja';
import { centroDe, vecinoEnDireccion, type FiguraPlano2D } from './plano';

const fig = (id: string, x: number, y: number): FiguraPlano2D => ({
  id,
  clase: 'aula',
  nombre: id,
  rect: { x, y, ancho: 10, alto: 10 },
  puntos: null,
  caja: { x, y, ancho: 10, alto: 10 },
});

describe('filtros del mapa', () => {
  it('pasaFiltro exige estado y tipo', () => {
    const f = { estados: ['DISPONIBLE' as const], tipos: ['LABORATORIO' as const] };
    expect(pasaFiltro({ estado: 'DISPONIBLE', tipo: 'LABORATORIO' }, f)).toBe(true);
    expect(pasaFiltro({ estado: 'OCUPADO', tipo: 'LABORATORIO' }, f)).toBe(false);
    expect(pasaFiltro({ estado: 'DISPONIBLE', tipo: 'AULA_TEORICA' }, f)).toBe(false);
  });

  it('hayFiltro ignora los estados que el mapa no usa', () => {
    expect(hayFiltro(FILTRO_TODO)).toBe(false);
    const sinAlerta = { ...FILTRO_TODO, estados: ['DISPONIBLE' as const, 'OCUPADO' as const] };
    expect(hayFiltro(sinAlerta)).toBe(true);
    expect(hayFiltro(sinAlerta, ['DISPONIBLE', 'OCUPADO'])).toBe(false);
  });

  it('alternar quita o pone', () => {
    expect(alternar(['a', 'b'], 'a')).toEqual(['b']);
    expect(alternar(['b'], 'a')).toEqual(['b', 'a']);
  });
});

describe('franja', () => {
  it('lee una franja válida de la URL y descarta las inválidas', () => {
    expect(leerFranja('LUNES', '08:00', '10:00')).toEqual({
      dia: 'LUNES',
      horaInicio: '08:00',
      horaFin: '10:00',
    });
    expect(leerFranja('DOMINGO', '08:00', '10:00')).toBeNull();
    expect(leerFranja('LUNES', '10:00', '08:00')).toBeNull();
    expect(leerFranja('LUNES', '08:30', '10:00')).toBeNull();
    expect(leerFranja(null, null, null)).toBeNull();
  });

  it('la semilla es estable y distinta entre franjas', () => {
    const a = { dia: DIAS[0].valor, horaInicio: '08:00', horaFin: '10:00' };
    const b = { dia: DIAS[1].valor, horaInicio: '08:00', horaFin: '10:00' };
    expect(semillaDeFranja(a)).toBe(semillaDeFranja({ ...a }));
    expect(semillaDeFranja(a)).not.toBe(semillaDeFranja(b));
    expect(semillaDeFranja(null)).toBe(0);
    expect(esFranjaValida(a)).toBe(true);
  });
});

describe('vecinoEnDireccion', () => {
  const figuras = [fig('A', 0, 0), fig('B', 20, 0), fig('C', 0, 20), fig('D', 40, 3)];

  it('elige la figura más cercana hacia ese lado', () => {
    expect(vecinoEnDireccion(figuras, 'A', 'derecha')?.id).toBe('B');
    expect(vecinoEnDireccion(figuras, 'A', 'abajo')?.id).toBe('C');
    expect(vecinoEnDireccion(figuras, 'D', 'izquierda')?.id).toBe('B');
  });

  it('devuelve null si no hay nada hacia ese lado o el origen no existe', () => {
    expect(vecinoEnDireccion(figuras, 'A', 'arriba')).toBeNull();
    expect(vecinoEnDireccion(figuras, 'A', 'izquierda')).toBeNull();
    expect(vecinoEnDireccion(figuras, 'Z', 'derecha')).toBeNull();
  });

  it('centroDe da el centro de la caja', () => {
    expect(centroDe(fig('A', 10, 20))).toEqual({ x: 15, y: 25 });
  });
});

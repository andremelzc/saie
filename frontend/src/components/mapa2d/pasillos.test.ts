import { describe, expect, it } from 'vitest';
import {
  celdasDePuerta,
  crearMalla,
  distanciaMinima,
  distanciasAlAscensor,
  distanciasDesde,
  parejasContiguas,
  recorridoEntre,
} from './pasillos';
import { leerPlano2D } from './plano';
import { PLANOS_SVG } from './planos';

const plano = (piso: number) => leerPlano2D(PLANOS_SVG[piso]);
const figura = (piso: number, id: string) => {
  const f = plano(piso).figuras.find((q) => q.id === id);
  if (!f) throw new Error(`No hay ${id} en el piso ${piso}`);
  return f;
};

describe('malla de pasillos', () => {
  it.each([1, 2, 3])(
    'el piso %i tiene malla y toda aula, laboratorio, escalera y ascensor da a un pasillo',
    (piso) => {
      const p = plano(piso);
      const malla = crearMalla(p);
      expect(malla).not.toBeNull();
      const sinPuerta = p.figuras
        .filter((f) => ['aula', 'laboratorio', 'escalera', 'ascensor'].includes(f.clase))
        .filter((f) => celdasDePuerta(malla!, f).length === 0)
        .map((f) => f.id);
      expect(sinPuerta).toEqual([]);
    },
  );

  it('un plano sin la figura techo no tiene malla', () => {
    const p = plano(1);
    expect(crearMalla({ ...p, figuras: p.figuras.filter((f) => f.clase !== 'techo') })).toBeNull();
  });

  it('todos los espacios de un piso están conectados por pasillos con su ascensor', () => {
    for (const piso of [1, 2, 3]) {
      const p = plano(piso);
      const malla = crearMalla(p)!;
      const desdeAscensor = distanciasDesde(
        malla,
        celdasDePuerta(malla, figura(piso, 'NUE-ascensor-1')),
      );
      for (const f of p.figuras.filter((q) => ['aula', 'laboratorio'].includes(q.clase))) {
        expect(
          Number.isFinite(distanciaMinima(desdeAscensor, celdasDePuerta(malla, f))),
          `${f.id} (piso ${piso}) no se alcanza`,
        ).toBe(true);
      }
    }
  });
});

describe('recorridoEntre', () => {
  it('va de la entrada del pabellón antiguo al laboratorio 104 siguiendo pasillos', () => {
    const malla = crearMalla(plano(1))!;
    const r = recorridoEntre(
      malla,
      celdasDePuerta(malla, figura(1, 'entrada-1')),
      celdasDePuerta(malla, figura(1, 'ANT-104')),
    );

    expect(r).not.toBeNull();
    const [inicio, fin] = [r!.puntos[0], r!.puntos[r!.puntos.length - 1]];
    // Nunca es más corto que la línea recta, y la ruta suele tener quiebres (da la vuelta a muros).
    expect(r!.largo).toBeGreaterThanOrEqual(Math.hypot(fin.x - inicio.x, fin.y - inicio.y) - 1);
    expect(r!.puntos.length).toBeGreaterThan(2);
  });

  it('devuelve null si no hay puertas de origen o de destino', () => {
    const malla = crearMalla(plano(1))!;
    expect(recorridoEntre(malla, [], celdasDePuerta(malla, figura(1, 'ANT-104')))).toBeNull();
  });
});

describe('parejasContiguas', () => {
  const pares = (piso: number) => parejasContiguas(plano(piso).figuras).map((p) => p.join('~'));
  const hay = (lista: string[], a: string, b: string) =>
    lista.includes(`${a}~${b}`) || lista.includes(`${b}~${a}`);

  it('en el pabellón nuevo comparten pared las aulas de una misma fila, no las de filas enfrentadas', () => {
    const p = pares(1);
    expect(hay(p, 'NUE-101', 'NUE-103')).toBe(true);
    expect(hay(p, 'NUE-102', 'NUE-104')).toBe(true);
    // 101 y 102 están enfrentadas, con el pasillo en medio.
    expect(hay(p, 'NUE-101', 'NUE-102')).toBe(false);
  });

  it('dos aulas separadas por una sala sin nombre no son contiguas', () => {
    const p = pares(2);
    expect(hay(p, 'ANT-211', 'ANT-212')).toBe(true);
    expect(hay(p, 'ANT-212', 'ANT-213')).toBe(false);
  });

  it('las aulas 301 y 302 del pabellón nuevo comparten pared', () => {
    expect(hay(pares(3), 'NUE-301', 'NUE-302')).toBe(true);
  });

  it('solo empareja espacios del mismo pabellón', () => {
    for (const piso of [1, 2, 3]) {
      for (const [a, b] of parejasContiguas(plano(piso).figuras)) {
        expect(a.slice(0, 3), `${a} con ${b}`).toBe(b.slice(0, 3));
      }
    }
  });
});

describe('distanciasAlAscensor', () => {
  it('mide cada aula y laboratorio con su ascensor y los más lejanos dan más', () => {
    const d = distanciasAlAscensor(plano(3));

    expect(d.get('NUE-303')).toBeDefined();
    expect(Number.isInteger(d.get('NUE-303'))).toBe(true);
    // El ascensor del pabellón nuevo está pegado a 303; 307 queda al otro extremo del pasillo.
    expect(d.get('NUE-303')!).toBeLessThan(d.get('NUE-307')!);
    expect(d.get('ANT-304')).toBeDefined();
  });

  it('cada pabellón se mide con su propio ascensor', () => {
    const d = distanciasAlAscensor(plano(1));
    const nuevos = [...d.keys()].filter((id) => id.startsWith('NUE'));
    const antiguos = [...d.keys()].filter((id) => id.startsWith('ANT'));
    expect(nuevos.length).toBeGreaterThan(0);
    expect(antiguos.length).toBeGreaterThan(0);
  });

  it('cubre todas las aulas y laboratorios de cada piso', () => {
    for (const piso of [1, 2, 3]) {
      const p = plano(piso);
      const d = distanciasAlAscensor(p);
      const sin = p.figuras
        .filter((f) => ['aula', 'laboratorio'].includes(f.clase))
        .filter((f) => !d.has(f.id))
        .map((f) => f.id);
      expect(sin).toEqual([]);
    }
  });
});

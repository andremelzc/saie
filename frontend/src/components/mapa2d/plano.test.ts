import { describe, expect, it } from 'vitest';
import { cajaDeFiguras, leerPlano2D, pabellonDe } from './plano';
import { PLANOS_SVG } from './planos';
import { espaciosDeEjemplo } from './datosEjemplo';

const MINI = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -20 100 80">
  <g id="espacios">
    <rect id="NUE-101" class="espacio aula" data-clase="aula" data-nombre="Aula 101" x="0" y="0" width="40" height="20"/>
    <polygon id="ANT-tercio" class="administrativo" data-clase="administrativo" points="0,30 30,30 30,50 0,50"/>
    <rect id="sin-clase" x="1" y="1" width="2" height="2"/>
  </g>
  <g id="muros"><polyline id="muro-1" class="muro" points="0,0 40,0 40,20"/></g>
</svg>`;

describe('leerPlano2D', () => {
  it('lee el viewBox, las figuras con id y clase, y los muros', () => {
    const plano = leerPlano2D(MINI);

    expect(plano.caja).toEqual({ x: -20, y: -20, ancho: 100, alto: 80 });
    expect(plano.figuras.map((f) => f.id)).toEqual(['NUE-101', 'ANT-tercio']);
    expect(plano.figuras[0]).toMatchObject({
      clase: 'aula',
      nombre: 'Aula 101',
      rect: { x: 0, y: 0, ancho: 40, alto: 20 },
      puntos: null,
    });
    expect(plano.figuras[1]).toMatchObject({
      rect: null,
      puntos: '0,30 30,30 30,50 0,50',
      caja: { x: 0, y: 30, ancho: 30, alto: 20 },
    });
    expect(plano.muros).toEqual(['0,0 40,0 40,20']);
  });

  it('rechaza un texto que no es un SVG', () => {
    expect(() => leerPlano2D('<html></html>')).toThrow(/SVG válido/);
    expect(() => leerPlano2D('esto no es xml <')).toThrow();
  });
});

describe('pabellonDe y cajaDeFiguras', () => {
  it('reconoce el pabellón por el prefijo del id', () => {
    expect(pabellonDe('NUE-101')).toBe('NUE');
    expect(pabellonDe('ANT-escalera-1')).toBe('ANT');
    expect(pabellonDe('patio-1')).toBeNull();
  });

  it('envuelve un conjunto de figuras, o devuelve null si no hay', () => {
    const { figuras } = leerPlano2D(MINI);

    expect(cajaDeFiguras(figuras)).toEqual({ x: 0, y: 0, ancho: 40, alto: 50 });
    expect(cajaDeFiguras([])).toBeNull();
  });
});

describe('planos de assets/planos', () => {
  const pisos = Object.keys(PLANOS_SVG).map(Number);

  it('trae los tres pisos', () => {
    expect(pisos).toEqual([1, 2, 3]);
  });

  it.each(pisos)(
    'el piso %i tiene un id único por figura, con clase y pabellón coherentes',
    (piso) => {
      const { figuras, muros } = leerPlano2D(PLANOS_SVG[piso]);
      const ids = figuras.map((f) => f.id);

      expect(new Set(ids).size).toBe(ids.length);
      expect(muros.length).toBeGreaterThan(0);
      for (const f of figuras.filter((x) => x.clase === 'aula' || x.clase === 'laboratorio')) {
        expect(pabellonDe(f.id), f.id).not.toBeNull();
        expect(f.nombre, f.id).not.toBe('');
      }
    },
  );

  it('las escaleras y los ascensores tienen el mismo id y posición en los tres pisos', () => {
    const conexiones = pisos.map((p) =>
      leerPlano2D(PLANOS_SVG[p])
        .figuras.filter((f) => f.clase === 'escalera' || f.clase === 'ascensor')
        .map((f) => `${f.id}@${f.caja.x},${f.caja.y}`)
        .sort(),
    );

    expect(conexiones[1]).toEqual(conexiones[0]);
    expect(conexiones[2]).toEqual(conexiones[0]);
  });
});

describe('espaciosDeEjemplo', () => {
  it('genera un espacio por aula y laboratorio, con estados repartidos', () => {
    const espacios = espaciosDeEjemplo(PLANOS_SVG);

    expect(espacios.length).toBeGreaterThan(40);
    expect(new Set(espacios.map((e) => e.estado))).toEqual(
      new Set(['DISPONIBLE', 'OCUPADO', 'ALERTA_ACTIVA']),
    );
    expect(espacios.find((e) => e.id === 'ANT-104')).toMatchObject({
      tipo: 'LABORATORIO',
      piso: 1,
    });
  });

  it('sin alertas no reparte el estado de alerta', () => {
    const estados = new Set(
      espaciosDeEjemplo(PLANOS_SVG, { conAlertas: false }).map((e) => e.estado),
    );

    expect(estados.has('ALERTA_ACTIVA')).toBe(false);
  });
});

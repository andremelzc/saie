import { describe, expect, it } from 'vitest';
import { PLANOS_SVG } from '../mapa2d/planos';
import { leerOrigen, origenesDeRuta } from './origenes';
import { ASIGNACIONES_EJEMPLO, rutaDeEjemplo } from './rutaEjemplo';
import { calcularTrazado } from './trazado';

const opciones = origenesDeRuta(PLANOS_SVG).flatMap((g) => g.opciones);
const nombres = (titulo: RegExp) =>
  origenesDeRuta(PLANOS_SVG)
    .filter((g) => titulo.test(g.titulo))
    .flatMap((g) => g.opciones.map((o) => o.nombre));

describe('orígenes de la ruta', () => {
  it('cada opción es única aunque la figura se repita en varios pisos', () => {
    const ids = opciones.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    // Un baño del antiguo existe en los tres pisos: tres opciones distintas.
    expect(opciones.filter((o) => o.figuraId === 'ANT-bano-1').map((o) => o.piso)).toEqual([
      1, 2, 3,
    ]);
  });

  it('ofrece baños, oficinas, sala de profesores, comedor, escaleras, ascensores y patio', () => {
    const antiguo1 = nombres(/antiguo.*piso 1/);
    expect(antiguo1).toEqual(
      expect.arrayContaining([
        'Baño 1',
        'Baño 2',
        'Capilla',
        'Biblioteca',
        'Auditorio',
        'Oficina 3',
      ]),
    );
    expect(antiguo1.filter((n) => n.startsWith('Escalera'))).toEqual([
      'Escalera 1',
      'Escalera 2',
      'Escalera 3',
    ]);
    expect(nombres(/nuevo.*piso 1/)).toEqual(
      expect.arrayContaining(['Baño', 'Sala de profesores', 'Ascensor', 'Escalera 1']),
    );
    expect(nombres(/antiguo.*piso 2/)).toContain('Comedor');
    expect(nombres(/Patio y jardín.*piso 1/)).toEqual(
      expect.arrayContaining(['Jardín', 'Patio 2']),
    );
  });

  it('las puertas no son un punto de partida', () => {
    expect(opciones.some((o) => o.figuraId.startsWith('entrada-'))).toBe(false);
  });

  it('lee el id y el piso de una opción', () => {
    expect(leerOrigen('ANT-bano-1@2')).toEqual({ id: 'ANT-bano-1', piso: 2 });
    expect(leerOrigen('ANT-104')).toEqual({ id: 'ANT-104' });
  });
});

describe('rutas desde esos lugares', () => {
  const ANT_104 = rutaDeEjemplo(ASIGNACIONES_EJEMPLO[1], false);

  it('desde un baño de un piso alto baja y llega al aula', () => {
    const t = calcularTrazado(ANT_104, PLANOS_SVG, { tipo: 'espacio', id: 'ANT-bano-1', piso: 3 });
    expect(t.pasos.length).toBeGreaterThan(2);
    expect(t.pasos[0]).toMatchObject({ piso: 3, focoId: 'ANT-bano-1' });
    expect(
      t.pasos.some((p) => p.tramo.tipo === 'CAMBIO_PISO' && /^Baja/.test(p.tramo.titulo)),
    ).toBe(true);
    expect(t.pasos.at(-1)?.focoId).toBe('ANT-104');
  });

  it('el mismo baño en el piso 1 va directo, sin cambiar de piso', () => {
    const t = calcularTrazado(ANT_104, PLANOS_SVG, { tipo: 'espacio', id: 'ANT-bano-1', piso: 1 });
    expect(t.pasos.map((p) => p.focoId)).toEqual(['ANT-bano-1', 'ANT-104']);
  });

  it('desde la sala de profesores del nuevo y desde una escalera', () => {
    for (const origen of [
      { tipo: 'espacio' as const, id: 'NUE-sala-profesores', piso: 2 },
      { tipo: 'espacio' as const, id: 'ANT-escalera-1', piso: 1 },
    ]) {
      const t = calcularTrazado(ANT_104, PLANOS_SVG, origen);
      expect(t.pasos.length, origen.id).toBeGreaterThanOrEqual(2);
      expect(t.pasos.at(-1)?.focoId).toBe('ANT-104');
    }
  });

  it('desde el patio llega al aula sin pasar por un muro', () => {
    const t = calcularTrazado(ANT_104, PLANOS_SVG, { tipo: 'espacio', id: 'patio-2', piso: 1 });
    expect(t.pasos.length).toBeGreaterThanOrEqual(2);
    expect(t.pasos[0].focoId).toBe('patio-2');
    expect(t.capa[1].puntos.length).toBeGreaterThan(2);
  });
});

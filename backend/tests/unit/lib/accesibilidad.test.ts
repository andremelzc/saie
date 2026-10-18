import { marcarAccesibilidad } from '../../../src/lib/accesibilidad';

describe('marcarAccesibilidad (HU-04, criterio 3 / RF-16)', () => {
  it('el Piso 1 es accesible y no requiere ascensor', () => {
    expect(marcarAccesibilidad({ piso: 1, distanciaAscensor: 20 })).toEqual({
      accesible: true,
      accesoPorAscensor: false,
    });
  });

  it('un piso superior con distancia al ascensor es accesible y el acceso es por ascensor', () => {
    expect(marcarAccesibilidad({ piso: 3, distanciaAscensor: 12 })).toEqual({
      accesible: true,
      accesoPorAscensor: true,
    });
  });

  it('un piso superior sin distancia registrada no se marca como accesible', () => {
    expect(marcarAccesibilidad({ piso: 2, distanciaAscensor: null })).toEqual({
      accesible: false,
      accesoPorAscensor: true,
    });
    expect(marcarAccesibilidad({ piso: 2 }).accesible).toBe(false);
  });
});

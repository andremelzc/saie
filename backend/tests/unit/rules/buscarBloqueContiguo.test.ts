import { TipoEspacio } from '@prisma/client';
import { buscarBloqueContiguo, EspacioConexo } from '../../../src/rules/buscarBloqueContiguo';

describe('Issue 2.5 / 5.4 - Algoritmo de Búsqueda de Bloque Contiguo con Capacidad Suficiente', () => {
  // Configuración de espacios:
  // Piso 1: Aula 101 (30) <-> Aula 102 (30) <-> Aula 103 (30)
  // Piso 1: Aula 105 (30) [Aislada en Piso 1, no contigua con 101/102/103]
  // Piso 1: Lab 101 (30, 5 PCs malogradas -> 25) <-> Lab 102 (30, 0 PCs malogradas -> 30)
  // Piso 2: Aula 201 (40) <-> Aula 202 (40)
  const espacios: EspacioConexo[] = [
    {
      id: 'a101',
      identificador: 'Aula 101',
      tipo: TipoEspacio.AULA_TEORICA,
      pabellon: 'Pab A',
      piso: 1,
      aforoNominal: 30,
    },
    {
      id: 'a102',
      identificador: 'Aula 102',
      tipo: TipoEspacio.AULA_TEORICA,
      pabellon: 'Pab A',
      piso: 1,
      aforoNominal: 30,
    },
    {
      id: 'a103',
      identificador: 'Aula 103',
      tipo: TipoEspacio.AULA_TEORICA,
      pabellon: 'Pab A',
      piso: 1,
      aforoNominal: 30,
    },
    {
      id: 'a105',
      identificador: 'Aula 105',
      tipo: TipoEspacio.AULA_TEORICA,
      pabellon: 'Pab A',
      piso: 1,
      aforoNominal: 30,
    },
    {
      id: 'l101',
      identificador: 'Lab 101',
      tipo: TipoEspacio.LABORATORIO,
      pabellon: 'Pab A',
      piso: 1,
      aforoNominal: 30,
      pcsMalogradas: 5,
    },
    {
      id: 'l102',
      identificador: 'Lab 102',
      tipo: TipoEspacio.LABORATORIO,
      pabellon: 'Pab A',
      piso: 1,
      aforoNominal: 30,
      pcsMalogradas: 0,
    },
    {
      id: 'a201',
      identificador: 'Aula 201',
      tipo: TipoEspacio.AULA_TEORICA,
      pabellon: 'Pab A',
      piso: 2,
      aforoNominal: 40,
    },
    {
      id: 'a202',
      identificador: 'Aula 202',
      tipo: TipoEspacio.AULA_TEORICA,
      pabellon: 'Pab A',
      piso: 2,
      aforoNominal: 40,
    },
  ];

  const mapaVecinos: Record<string, string[]> = {
    a101: ['a102'],
    a102: ['a101', 'a103'],
    a103: ['a102'],
    a105: [], // Aislada
    l101: ['l102'],
    l102: ['l101'],
    a201: ['a202'],
    a202: ['a201'],
  };

  const obtenerVecinos = (id: string) => mapaVecinos[id] || [];

  test('Caso 1 espacio: si un solo espacio alcanza la capacidad N, lo retorna como bloque de 1 espacio', () => {
    const resultado = buscarBloqueContiguo({
      alumnosRequeridos: 25,
      tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
      espaciosDisponibles: espacios,
      obtenerVecinosContiguos: obtenerVecinos,
    });

    expect(resultado.encontrado).toBe(true);
    expect(resultado.bloques.length).toBeGreaterThan(0);
    // El primer bloque retornado debe tener 1 espacio
    expect(resultado.bloques[0].espacios).toHaveLength(1);
    expect(resultado.bloques[0].capacidadTotal).toBeGreaterThanOrEqual(25);
  });

  test('Caso bloque contiguo: expande 2 espacios contiguos cuando 1 solo no alcanza', () => {
    // N = 50: ninguna aula individual de 30 alcanza. Bloques como [a101, a102] suman 60 y alcanzan.
    const resultado = buscarBloqueContiguo({
      alumnosRequeridos: 50,
      tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
      espaciosDisponibles: espacios,
      obtenerVecinosContiguos: obtenerVecinos,
    });

    expect(resultado.encontrado).toBe(true);
    // Cada bloque debe tener 2 espacios contiguos
    resultado.bloques.forEach((b) => {
      expect(b.capacidadTotal).toBeGreaterThanOrEqual(50);
      expect(b.tipo).toBe(TipoEspacio.AULA_TEORICA);
    });

    // Bloques esperados en piso 1: [a101, a102], [a102, a103]
    const idsBloques = resultado.bloques.map((b) => b.espacioIds.join(','));
    expect(idsBloques).toContain('a101,a102');
    expect(idsBloques).toContain('a102,a103');
  });

  test('Descarta combinaciones no contiguas aunque estén en el mismo piso', () => {
    // a101 y a105 están en el Piso 1, pero no son contiguos.
    const resultado = buscarBloqueContiguo({
      alumnosRequeridos: 50,
      tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
      espaciosDisponibles: [espacios[0], espacios[3]], // Solo a101 y a105 disponibles
      obtenerVecinosContiguos: obtenerVecinos,
    });

    // Como no son contiguos, no pueden formar un bloque juntos
    expect(resultado.encontrado).toBe(false);
    expect(resultado.bloques).toHaveLength(0);
  });

  test('Nunca mezcla AULA_TEORICA con LABORATORIO dentro de un bloque', () => {
    const resultado = buscarBloqueContiguo({
      alumnosRequeridos: 50,
      tipoEspacioRequerido: TipoEspacio.LABORATORIO,
      espaciosDisponibles: espacios,
      obtenerVecinosContiguos: obtenerVecinos,
    });

    expect(resultado.encontrado).toBe(true);
    resultado.bloques.forEach((b) => {
      expect(b.tipo).toBe(TipoEspacio.LABORATORIO);
      b.espacios.forEach((e) => {
        expect(e.tipo).toBe(TipoEspacio.LABORATORIO);
      });
    });
  });

  test('Aplica cálculo de capacidad real en laboratorios (descontando PCs malogradas)', () => {
    // Lab 101: nominal 30, malogradas 5 -> real 25
    // Lab 102: nominal 30, malogradas 0 -> real 30
    // Total bloque [l101, l102]: 55
    const resultado = buscarBloqueContiguo({
      alumnosRequeridos: 55,
      tipoEspacioRequerido: TipoEspacio.LABORATORIO,
      espaciosDisponibles: [espacios[4], espacios[5]], // l101 y l102
      obtenerVecinosContiguos: obtenerVecinos,
    });

    expect(resultado.encontrado).toBe(true);
    expect(resultado.bloques[0].capacidadTotal).toBe(55);
    expect(resultado.bloques[0].desperdicio).toBe(0);
  });

  test('Retorna explícitamente encontrado: false si ningún bloque contiguo alcanza la capacidad requerida', () => {
    const resultado = buscarBloqueContiguo({
      alumnosRequeridos: 200, // Demasiado grande para los espacios disponibles
      tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
      espaciosDisponibles: espacios,
      obtenerVecinosContiguos: obtenerVecinos,
    });

    expect(resultado.encontrado).toBe(false);
    expect(resultado.bloques).toEqual([]);
  });

  test('Deduplica bloques: no emite [A, B] y [B, A] como bloques separados', () => {
    const resultado = buscarBloqueContiguo({
      alumnosRequeridos: 50,
      tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
      espaciosDisponibles: [espacios[0], espacios[1]], // a101 y a102
      obtenerVecinosContiguos: obtenerVecinos,
    });

    expect(resultado.encontrado).toBe(true);
    expect(resultado.bloques).toHaveLength(1);
    expect(resultado.bloques[0].espacioIds).toEqual(['a101', 'a102']);
  });

  test('Ordenamiento determinista: idéntico en múltiples corridas', () => {
    const params = {
      alumnosRequeridos: 40,
      tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
      espaciosDisponibles: espacios,
      obtenerVecinosContiguos: obtenerVecinos,
    };

    const corrida1 = buscarBloqueContiguo(params);
    const corrida2 = buscarBloqueContiguo(params);

    expect(corrida1.bloques.map((b) => b.espacioIds.join(','))).toEqual(
      corrida2.bloques.map((b) => b.espacioIds.join(',')),
    );
  });
});

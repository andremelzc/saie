import { describe, expect, it } from 'vitest';
import { formatearDuracion, idDePlano, resolverIdPlano } from './plano';

describe('idDePlano', () => {
  it('respeta un identificador que ya tiene el formato del plano', () => {
    expect(idDePlano('Nuevo', 'NUE-101')).toBe('NUE-101');
    expect(idDePlano('Antiguo', 'ant-laboratorio-1')).toBe('ANT-laboratorio-1');
  });

  it('arma prefijo del pabellón + código', () => {
    expect(idDePlano('Pabellón Nuevo', 'Aula 101')).toBe('NUE-101');
    expect(idDePlano('Pabellon Antiguo', 'Lab 105')).toBe('ANT-105');
  });

  it('si no reconoce el pabellón, devuelve el identificador tal cual', () => {
    expect(idDePlano('Pabellon A', 'Aula 101')).toBe('Aula 101');
  });
});

describe('resolverIdPlano', () => {
  it('usa la regla prefijo + código cuando la figura existe', () => {
    expect(resolverIdPlano('Nuevo', 'Aula 101', 1)).toBe('NUE-101');
    expect(resolverIdPlano('Antiguo', 'ANT-204', 2)).toBe('ANT-204');
  });

  it('reconoce los laboratorios dibujados como NUE-lab-NN', () => {
    expect(resolverIdPlano('Nuevo', 'Lab 06', 2)).toBe('NUE-lab-06');
    expect(resolverIdPlano('Nuevo', 'Laboratorio 1', 2)).toBe('NUE-lab-01');
    expect(resolverIdPlano('Nuevo', 'L-07', 3)).toBe('NUE-lab-07');
  });

  it('si no existe la figura, cae a la regla simple', () => {
    expect(resolverIdPlano('Nuevo', 'Aula 999', 1)).toBe('NUE-999');
  });
});

describe('formatearDuracion', () => {
  it('usa segundos por debajo del minuto y minutos redondeados después', () => {
    expect(formatearDuracion(20)).toBe('20 s');
    expect(formatearDuracion(150)).toBe('3 min');
  });
});

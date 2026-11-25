import {
  MENSAJE_PERIODO_INVALIDO,
  normalizarPeriodo,
  periodoSchema,
} from '../../../src/lib/periodo';

describe('Normalización de periodos (Issue 4.64, riesgo R49)', () => {
  it.each([
    ['2026-1', '2026-1'],
    ['2026-2', '2026-2'],
    ['2026-0', '2026-0'],
    ['2026-I', '2026-1'],
    ['2026-II', '2026-2'],
    ['2026-ii', '2026-2'],
    [' 2026 - II ', '2026-2'],
  ])('normaliza %j a %j', (entrada, esperado) => {
    expect(normalizarPeriodo(entrada)).toBe(esperado);
  });

  it.each(['2026-10', '26-2', '2026-III', '2026/2', '2026-3', 'II-2026', ''])(
    'rechaza %j',
    (entrada) => {
      expect(normalizarPeriodo(entrada)).toBeNull();
    },
  );

  it('el esquema devuelve el periodo normalizado', () => {
    expect(periodoSchema.parse('2026-II')).toBe('2026-2');
  });

  it('el esquema rechaza un periodo inválido con un mensaje claro', () => {
    const resultado = periodoSchema.safeParse('2026-III');
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0].message).toBe(MENSAJE_PERIODO_INVALIDO);
  });

  it('el esquema rechaza un periodo vacío', () => {
    const resultado = periodoSchema.safeParse('');
    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0].message).toBe('El periodo es requerido');
  });
});

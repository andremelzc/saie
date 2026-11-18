import { nivelDeLog } from '../../../src/lib/logger';

describe('nivelDeLog (Issue 1.15)', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it('usa LOG_LEVEL si es un nivel válido (sin importar mayúsculas)', () => {
    process.env.LOG_LEVEL = ' DEBUG ';
    expect(nivelDeLog()).toBe('debug');
  });

  it('ignora un LOG_LEVEL inválido y cae al valor por defecto', () => {
    process.env.LOG_LEVEL = 'ruidoso';
    process.env.NODE_ENV = 'production';
    expect(nivelDeLog()).toBe('info');
  });

  it('por defecto es info y, con NODE_ENV=test, silent', () => {
    delete process.env.LOG_LEVEL;
    process.env.NODE_ENV = 'development';
    expect(nivelDeLog()).toBe('info');
    process.env.NODE_ENV = 'test';
    expect(nivelDeLog()).toBe('silent');
  });
});

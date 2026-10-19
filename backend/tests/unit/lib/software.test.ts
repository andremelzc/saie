import { esVersionNumerica, parsearNombreVersion } from '../../../src/lib/software';

describe('parsearNombreVersion (#4.27)', () => {
  it.each([
    ['JDK 21', 'JDK', '21'],
    ['Python 3.12', 'Python', '3.12'],
    ['Ubuntu 22.04', 'Ubuntu', '22.04'],
    ['Visual Studio Code', 'Visual Studio Code', ''],
    ['Node.js', 'Node.js', ''],
    ['C++ 20', 'C++', '20'],
  ])('separa "%s" en nombre "%s" y versión "%s"', (texto, nombre, version) => {
    const resultado = parsearNombreVersion(texto);

    expect(resultado.nombre).toBe(nombre);
    expect(resultado.version).toBe(version);
    expect(resultado.motivos).toEqual([]);
  });

  it('normaliza el nombre igual que el motor (minúsculas y espacios colapsados)', () => {
    const resultado = parsearNombreVersion('  Visual   Studio   Code  ');

    expect(resultado.nombre).toBe('Visual Studio Code');
    expect(resultado.nombreNormalizado).toBe('visual studio code');
  });

  it('marca como ambigua una versión con segmentos no numéricos', () => {
    const resultado = parsearNombreVersion('MATLAB R2023b');

    expect(resultado.nombre).toBe('MATLAB');
    expect(resultado.version).toBe('R2023b');
    expect(resultado.motivos).toContain('VERSION_NO_NUMERICA');
  });

  it('marca como ambiguo un texto con dígitos pero sin versión al final', () => {
    const resultado = parsearNombreVersion('Python 3.12 LTS');

    expect(resultado.nombre).toBe('Python 3.12 LTS');
    expect(resultado.version).toBe('');
    expect(resultado.motivos).toContain('DIGITOS_SIN_VERSION');
  });

  it('marca como ambiguo un texto sin letras', () => {
    const resultado = parsearNombreVersion('123 456');

    expect(resultado.nombre).toBe('123');
    expect(resultado.version).toBe('456');
    expect(resultado.motivos).toContain('NOMBRE_NO_ALFABETICO');
  });

  it('no rompe con cadenas vacías ni con un único token numérico', () => {
    expect(parsearNombreVersion('')).toEqual({
      nombre: '',
      version: '',
      nombreNormalizado: '',
      motivos: [],
    });

    const soloNumero = parsearNombreVersion('2024');
    expect(soloNumero.nombre).toBe('2024');
    expect(soloNumero.version).toBe('');
    expect(soloNumero.motivos).toEqual(
      expect.arrayContaining(['DIGITOS_SIN_VERSION', 'NOMBRE_NO_ALFABETICO']),
    );
  });
});

describe('esVersionNumerica (#4.27)', () => {
  it.each(['', '3', '3.12', '2024.1', '21', '3.9'])('acepta la versión "%s"', (version) => {
    expect(esVersionNumerica(version)).toBe(true);
  });

  it.each(['R2023b', '3.12-beta', 'v21'])('rechaza la versión "%s"', (version) => {
    expect(esVersionNumerica(version)).toBe(false);
  });
});

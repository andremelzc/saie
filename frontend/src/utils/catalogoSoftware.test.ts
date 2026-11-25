import { describe, expect, it } from 'vitest';
import {
  admiteVersionMinima,
  etiquetaLicencia,
  nombreSoftware,
  textoUso,
} from './catalogoSoftware';

describe('utilidades del catálogo de software (Issue 4.30)', () => {
  it('nombra el software con su versión solo si la tiene', () => {
    expect(nombreSoftware({ nombre: 'Python', version: '3.12' })).toBe('Python 3.12');
    expect(nombreSoftware({ nombre: 'Docker', version: '' })).toBe('Docker');
  });

  it('describe el uso en singular, plural o sin uso', () => {
    expect(textoUso({ laboratorios: 0, secciones: 0 })).toBe('Sin uso');
    expect(textoUso({ laboratorios: 1, secciones: 1 })).toBe('1 laboratorio · 1 sección');
    expect(textoUso({ laboratorios: 3, secciones: 0 })).toBe('3 laboratorios · 0 secciones');
  });

  it('traduce la licencia y decide si admite versión mínima', () => {
    expect(etiquetaLicencia('EDUCATIVA')).toBe('Educativa');
    expect(etiquetaLicencia('OTRA' as never)).toBe('Otra');
    expect(admiteVersionMinima('2024.1')).toBe(true);
    expect(admiteVersionMinima('R2023b')).toBe(false);
  });
});

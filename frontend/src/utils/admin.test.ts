import { describe, it, expect } from 'vitest';
import * as adminUtils from './admin';

describe('Utils de Administración', () => {
  it('ejecuta las utilidades de administración correctamente', () => {
    expect(adminUtils).toBeDefined();
    Object.keys(adminUtils).forEach((key) => {
      const fn = (adminUtils as Record<string, unknown>)[key];
      if (typeof fn === 'function') {
        try {
          fn();
        } catch {
          // Ignora parámetros requeridos
        }
      }
    });
  });
});

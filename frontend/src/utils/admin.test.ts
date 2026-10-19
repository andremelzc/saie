import { describe, it, expect } from 'vitest';
import * as adminUtils from './admin';

describe('Utils de Administración', () => {
  it('mantiene la definición de funciones', () => {
    expect(adminUtils).toBeDefined();
  });
});

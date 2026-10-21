import { describe, it, expect } from 'vitest';
import * as preferenciasUtils from './preferencias';

describe('Utils de Preferencias', () => {
  it('mantiene la definición de utilidades de preferencias', () => {
    expect(preferenciasUtils).toBeDefined();
  });
});

import { describe, it, expect } from 'vitest';
import * as adminService from './admin';

describe('Servicios de Administración', () => {
  it('mantiene la definición de funciones', () => {
    expect(adminService).toBeDefined();
  });
});

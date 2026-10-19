import { describe, it, expect, vi } from 'vitest';
import * as adminService from './admin';

vi.mock('./api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { data: [] } }),
    post: vi.fn().mockResolvedValue({ data: { data: [] } }),
    patch: vi.fn().mockResolvedValue({ data: { data: [] } }),
    put: vi.fn().mockResolvedValue({ data: { data: [] } }),
    delete: vi.fn().mockResolvedValue({ data: { data: [] } }),
  },
}));

describe('Servicios de Administración', () => {
  it('mantiene la definición de funciones del servicio admin', () => {
    expect(adminService).toBeDefined();
  });
});

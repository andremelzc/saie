import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './api';
import {
  cambiarEstadoSoftwareCatalogo,
  crearSoftwareCatalogo,
  editarSoftwareCatalogo,
  listarCatalogo,
} from './catalogoSoftware';

vi.mock('./api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

const get = vi.mocked(api.get);
const post = vi.mocked(api.post);
const patch = vi.mocked(api.patch);
const respuesta = <T>(data: T) => ({ data: { success: true, data } });

describe('Servicio del catálogo de software (Issue 4.30)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista con los filtros como parámetros y valores por defecto de página', async () => {
    get.mockResolvedValue(respuesta({ items: [], total: 0, page: 1, limit: 50 }));
    await listarCatalogo({ q: 'py', categoria: 'LENGUAJE', activo: false });
    expect(get).toHaveBeenCalledWith('/v1/admin/software', {
      params: { q: 'py', categoria: 'LENGUAJE', activo: 'false', page: 1, limit: 50 },
    });

    await listarCatalogo();
    expect(get).toHaveBeenLastCalledWith('/v1/admin/software', {
      params: { page: 1, limit: 50 },
    });
  });

  it('crea, edita y cambia el estado contra sus rutas', async () => {
    post.mockResolvedValue(respuesta({ id: 'n' }));
    patch.mockResolvedValue(respuesta({ id: 'a/b' }));

    expect(
      await crearSoftwareCatalogo({
        nombre: 'Docker',
        version: '',
        categoria: 'OTRO',
        tipoLicencia: 'LIBRE',
      }),
    ).toEqual({ id: 'n' });
    expect(post).toHaveBeenCalledWith(
      '/v1/admin/software',
      expect.objectContaining({ nombre: 'Docker' }),
    );

    await editarSoftwareCatalogo('a/b', { fabricante: null });
    expect(patch).toHaveBeenCalledWith('/v1/admin/software/a%2Fb', { fabricante: null });

    await cambiarEstadoSoftwareCatalogo('x', true);
    expect(patch).toHaveBeenLastCalledWith('/v1/admin/software/x/estado', { activo: true });
  });
});

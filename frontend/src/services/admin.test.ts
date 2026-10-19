import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from './api';
import {
  ejecutarCorrida,
  importarCsv,
  obtenerAlertas,
  obtenerCatalogoActivo,
  obtenerEscaladas,
  obtenerEspacios,
  obtenerLaboratorios,
  registrarPcsMalogradas,
  registrarSoftware,
  reintentarSeccion,
  resolverAlerta,
} from './admin';

vi.mock('./api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

const get = vi.mocked(api.get);
const post = vi.mocked(api.post);
const patch = vi.mocked(api.patch);

describe('Servicios de administración', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('obtenerAlertas devuelve las alertas de la más reciente a la más antigua', async () => {
    get.mockResolvedValue({
      data: {
        data: [
          { id: 'vieja', fechaDeteccion: '2026-01-01T00:00:00Z' },
          { id: 'nueva', fechaDeteccion: '2026-06-01T00:00:00Z' },
        ],
      },
    });
    const alertas = await obtenerAlertas();
    expect(get).toHaveBeenCalledWith('/v1/admin/alertas');
    expect(alertas.map((a) => a.id)).toEqual(['nueva', 'vieja']);
  });

  it('resolverAlerta codifica el id en la URL', async () => {
    patch.mockResolvedValue({ data: {} });
    await resolverAlerta('a/1');
    expect(patch).toHaveBeenCalledWith('/v1/admin/alertas/a%2F1/resolver');
  });

  it('obtenerEscaladas devuelve el contenido de data', async () => {
    const dto = { periodo: '2026-II', total: 0, secciones: [] };
    get.mockResolvedValue({ data: { data: dto } });
    expect(await obtenerEscaladas()).toEqual(dto);
    expect(get).toHaveBeenCalledWith('/v1/admin/secciones-escaladas');
  });

  it('ejecutarCorrida hace POST al batch con timeout de 60 s', async () => {
    const resumen = { modo: 'periodo', asignadas: 3 };
    post.mockResolvedValue({ data: { data: resumen } });
    expect(await ejecutarCorrida()).toEqual(resumen);
    expect(post).toHaveBeenCalledWith('/v1/asignacion/batch', {}, { timeout: 60000 });
  });

  it('reintentarSeccion hace POST sobre la sección indicada', async () => {
    post.mockResolvedValue({ data: { data: { modo: 'seccion' } } });
    await reintentarSeccion('s 1');
    expect(post).toHaveBeenCalledWith('/v1/asignacion/seccion/s%201', {}, { timeout: 30000 });
  });

  it('importarCsv envía el CSV como text/csv', async () => {
    const resultado = { tipo: 'horarios', exitosa: true };
    post.mockResolvedValue({ data: { data: resultado } });
    expect(await importarCsv('horarios', 'a,b\n1,2')).toEqual(resultado);
    expect(post).toHaveBeenCalledWith('/v1/import/horarios', 'a,b\n1,2', {
      headers: { 'Content-Type': 'text/csv' },
      timeout: 120000,
    });
  });

  it('obtenerEspacios envía el filtro solo si se indica', async () => {
    get.mockResolvedValue({ data: { data: [] } });
    await obtenerEspacios();
    expect(get).toHaveBeenLastCalledWith('/v1/admin/espacios', { params: undefined });
    await obtenerEspacios('AULA_TEORICA');
    expect(get).toHaveBeenLastCalledWith('/v1/admin/espacios', {
      params: { tipo: 'AULA_TEORICA' },
    });
  });

  it('obtenerLaboratorios filtra por LABORATORIO', async () => {
    get.mockResolvedValue({ data: { data: [] } });
    await obtenerLaboratorios();
    expect(get).toHaveBeenCalledWith('/v1/admin/espacios', { params: { tipo: 'LABORATORIO' } });
  });

  it('obtenerCatalogoActivo pide solo el software activo', async () => {
    const lista = { items: [], total: 0, page: 1, limit: 100 };
    get.mockResolvedValue({ data: { data: lista } });
    expect(await obtenerCatalogoActivo()).toEqual(lista);
    expect(get).toHaveBeenCalledWith('/v1/admin/software', {
      params: { activo: 'true', limit: 100 },
    });
  });

  it('registrarSoftware y registrarPcsMalogradas envían el cuerpo esperado', async () => {
    post.mockResolvedValue({ data: { data: { ok: true } } });
    expect(await registrarSoftware('lab 1', ['x', 'y'])).toEqual({ ok: true });
    expect(post).toHaveBeenCalledWith('/v1/admin/laboratorios/lab%201/software', {
      softwareIds: ['x', 'y'],
    });
    await registrarPcsMalogradas('lab1', 4);
    expect(post).toHaveBeenLastCalledWith('/v1/admin/laboratorios/lab1/pcs-malogradas', {
      pcsMalogradas: 4,
    });
  });
});

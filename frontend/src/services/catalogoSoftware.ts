import api from './api';
import type {
  CambiosSoftware,
  FiltrosCatalogo,
  ListadoCatalogoDTO,
  NuevoSoftware,
  SoftwareCatalogoDTO,
} from '../types/catalogoSoftware';

/** Cliente del catálogo de software (Issue 4.30 sobre los endpoints del Issue 4.28). */

interface Respuesta<T> {
  success: boolean;
  data: T;
}

/** Prefijo de las claves de `useCarga` del catálogo: se invalida tras un alta, edición o baja. */
export const CLAVE_CATALOGO = 'catalogo-software';

/** GET /v1/admin/software[?q=&categoria=&activo=&page=&limit=] */
export async function listarCatalogo(filtros: FiltrosCatalogo = {}): Promise<ListadoCatalogoDTO> {
  const params = {
    ...(filtros.q && { q: filtros.q }),
    ...(filtros.categoria && { categoria: filtros.categoria }),
    ...(filtros.activo !== undefined && { activo: String(filtros.activo) }),
    page: filtros.page ?? 1,
    limit: filtros.limit ?? 50,
  };
  const { data } = await api.get<Respuesta<ListadoCatalogoDTO>>('/v1/admin/software', { params });
  return data.data;
}

/** POST /v1/admin/software (solo Coordinación). 409 si ya existe ese nombre y versión. */
export async function crearSoftwareCatalogo(nuevo: NuevoSoftware): Promise<SoftwareCatalogoDTO> {
  const { data } = await api.post<Respuesta<SoftwareCatalogoDTO>>('/v1/admin/software', nuevo);
  return data.data;
}

/** PATCH /v1/admin/software/:id (solo Coordinación; la versión no se edita). */
export async function editarSoftwareCatalogo(
  id: string,
  cambios: CambiosSoftware,
): Promise<SoftwareCatalogoDTO> {
  const { data } = await api.patch<Respuesta<SoftwareCatalogoDTO>>(
    `/v1/admin/software/${encodeURIComponent(id)}`,
    cambios,
  );
  return data.data;
}

/** PATCH /v1/admin/software/:id/estado — baja o reactivación lógica. */
export async function cambiarEstadoSoftwareCatalogo(
  id: string,
  activo: boolean,
): Promise<SoftwareCatalogoDTO> {
  const { data } = await api.patch<Respuesta<SoftwareCatalogoDTO>>(
    `/v1/admin/software/${encodeURIComponent(id)}/estado`,
    { activo },
  );
  return data.data;
}

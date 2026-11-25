import type { CategoriaSoftware } from './solicitudesSoftware';

/** Contrato del catálogo de software (backend/src/types/software.ts, Spec 08 §4, Issue 4.28). */
export type TipoLicencia = 'LIBRE' | 'EDUCATIVA' | 'COMERCIAL';

export interface SoftwareCatalogoDTO {
  id: string;
  nombre: string;
  /** `""` = software sin versión. */
  version: string;
  categoria: CategoriaSoftware;
  tipoLicencia: TipoLicencia;
  descripcion: string | null;
  fabricante: string | null;
  activo: boolean;
  fechaCreacion: string;
  /** Cuántos laboratorios lo tienen instalado y cuántas secciones lo requieren. */
  uso: { laboratorios: number; secciones: number };
}

export interface ListadoCatalogoDTO {
  items: SoftwareCatalogoDTO[];
  total: number;
  page: number;
  limit: number;
}

export interface FiltrosCatalogo {
  q?: string;
  categoria?: CategoriaSoftware;
  activo?: boolean;
  page?: number;
  limit?: number;
}

export interface NuevoSoftware {
  nombre: string;
  version: string;
  categoria: CategoriaSoftware;
  tipoLicencia: TipoLicencia;
  fabricante?: string;
  descripcion?: string;
}

/** La versión no se edita: otra versión es otra fila del catálogo (Spec 08 §4). */
export type CambiosSoftware = Partial<
  Omit<NuevoSoftware, 'version' | 'fabricante' | 'descripcion'>
> & {
  fabricante?: string | null;
  descripcion?: string | null;
};

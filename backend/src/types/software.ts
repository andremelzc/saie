import { CategoriaSoftware, ComparacionVersion, TipoLicencia } from '@prisma/client';

/** Entrada pura de la regla de software: un programa instalado en un laboratorio. */
export interface SoftwareInstaladoInput {
  nombre: string;
  /** Clave normalizada con la que compara el motor. */
  nombreNormalizado: string;
  /** `""` = software sin versión. */
  version: string;
}

/** Entrada pura de la regla: lo que exige una sección, con su regla de versión (Spec 08, §3). */
export interface SoftwareRequeridoInput extends SoftwareInstaladoInput {
  comparacionVersion: ComparacionVersion;
}

/** Referencia mínima que se expone en listados y en el historial. */
export interface SoftwareResumenDTO {
  id: string;
  nombre: string;
  version: string;
}

export interface SoftwareRequeridoDTO extends SoftwareResumenDTO {
  comparacionVersion: ComparacionVersion;
}

export interface SoftwareDTO extends SoftwareResumenDTO {
  nombreNormalizado: string;
  categoria: CategoriaSoftware;
  tipoLicencia: TipoLicencia;
  descripcion: string | null;
  fabricante: string | null;
  activo: boolean;
  creadoPorId: string | null;
  fechaCreacion: Date;
  fechaActualizacion: Date;
  /** Cuántos laboratorios lo tienen instalado y cuántas secciones lo requieren. */
  uso: { laboratorios: number; secciones: number };
}

export interface FiltrosSoftware {
  q?: string;
  categoria?: CategoriaSoftware;
  activo?: boolean;
  page: number;
  limit: number;
}

export interface ListadoSoftwareDTO {
  items: SoftwareDTO[];
  total: number;
  page: number;
  limit: number;
}

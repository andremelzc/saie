import { TipoEspacio } from '@prisma/client';
import { AlertaRegistradaDTO } from './alertas';
import { SoftwareResumenDTO } from './software';

export type CampoEspacio =
  | 'identificador'
  | 'pabellon'
  | 'piso'
  | 'aforoNominal'
  | 'contiguos'
  | 'habilitado'
  | 'descripcionUso'
  | 'softwareIds'
  | 'pcsMalogradas';

export interface EspacioAdminDTO {
  id: string;
  identificador: string;
  tipo: TipoEspacio;
  pabellon: string;
  piso: number;
  aforoNominal: number;
  /** Solo laboratorios; `null` en aulas teóricas. */
  softwareInstalado: SoftwareResumenDTO[] | null;
  pcsMalogradas: number | null;
  /** `false` = fuera de servicio: el motor no lo asigna. */
  habilitado: boolean;
  /** Rótulo visual opcional (ej. "Sala de investigación"). */
  descripcionUso: string | null;
  /** Ids de los espacios contiguos (siempre del mismo tipo). */
  contiguos: string[];
  /** Campos que el rol autenticado puede editar en este espacio (para armar el formulario). */
  camposEditables: CampoEspacio[];
}

export interface ResultadoEdicionEspacioDTO {
  espacio: EspacioAdminDTO;
  /** Alertas generadas por el cambio de aforo, de software o de PCs (Issues 4.1, 4.2 y 4.4). */
  alertas: AlertaRegistradaDTO[];
}

export interface FiltrosEspacios {
  tipo?: TipoEspacio;
  pabellon?: string;
  piso?: number;
  pagina?: number;
  limite?: number;
}

import { TipoEspacio } from '@prisma/client';
import { AlertaRegistradaDTO } from './alertas';

export type CampoEspacio =
  | 'identificador'
  | 'pabellon'
  | 'piso'
  | 'aforoNominal'
  | 'contiguos'
  | 'softwareInstalado'
  | 'pcsMalogradas';

export interface EspacioAdminDTO {
  id: string;
  identificador: string;
  tipo: TipoEspacio;
  pabellon: string;
  piso: number;
  aforoNominal: number;
  /** Solo laboratorios; `null` en aulas teóricas. */
  softwareInstalado: string[] | null;
  pcsMalogradas: number | null;
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
}

import { TipoEspacio } from '@prisma/client';

export interface EspacioCapacidadInput {
  id?: string;
  identificador?: string;
  tipo: TipoEspacio | 'AULA_TEORICA' | 'LABORATORIO';
  aforoNominal: number;
  pcsMalogradas?: number | null;
}

/**
 * Issue 2.1 (Capacidad Real de un Espacio):
 * - Para AULA_TEORICA: CapacidadReal = aforoNominal (nunca evalúa PCs malogradas)
 * - Para LABORATORIO: CapacidadReal = max(0, aforoNominal - pcsMalogradas)
 *
 * Regla pura que garantiza que la capacidad nunca sea negativa ni asuma aforos fijos.
 */
export function calcularCapacidadReal(espacio: EspacioCapacidadInput): number {
  if (espacio.aforoNominal < 0) {
    return 0;
  }

  if (espacio.tipo === TipoEspacio.AULA_TEORICA) {
    return espacio.aforoNominal;
  }

  if (espacio.tipo === TipoEspacio.LABORATORIO) {
    const pcsMalogradas =
      espacio.pcsMalogradas && espacio.pcsMalogradas > 0 ? espacio.pcsMalogradas : 0;
    return Math.max(0, espacio.aforoNominal - pcsMalogradas);
  }

  return 0;
}

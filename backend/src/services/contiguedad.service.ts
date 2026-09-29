import { TipoEspacio } from '@prisma/client';
import { EspacioNoEncontradoError } from './espacio.service';

export interface GrafoEspacioNodo {
  id: string;
  tipo: TipoEspacio;
  identificador?: string;
}

export interface GrafoContiguedad {
  espacios: Map<string, GrafoEspacioNodo>;
  adyacencias: Map<string, Set<string>>;
}

/**
 * Construye una estructura de grafo en memoria para evaluación pura de contigüidad.
 */
export function construirGrafoContiguedad(
  espacios: GrafoEspacioNodo[],
  relaciones: Array<{ idA: string; idB: string }>,
): GrafoContiguedad {
  const espaciosMap = new Map<string, GrafoEspacioNodo>();
  const adyacenciasMap = new Map<string, Set<string>>();

  for (const esp of espacios) {
    espaciosMap.set(esp.id, esp);
    adyacenciasMap.set(esp.id, new Set<string>());
  }

  for (const rel of relaciones) {
    if (espaciosMap.has(rel.idA) && espaciosMap.has(rel.idB)) {
      adyacenciasMap.get(rel.idA)?.add(rel.idB);
      adyacenciasMap.get(rel.idB)?.add(rel.idA);
    }
  }

  return {
    espacios: espaciosMap,
    adyacencias: adyacenciasMap,
  };
}

/**
 * Issue 2.3: Función pura que, dado un ID de espacio y el grafo,
 * devuelve la lista de IDs de espacios contiguos del mismo tipo.
 *
 * - Si el espacio no existe en el grafo, lanza EspacioNoEncontradoError.
 * - Si no tiene vecinos, retorna un arreglo vacío [] (sin error).
 * - Garantiza que solo retorna vecinos del mismo tipo.
 */
export function obtenerEspaciosContiguos(espacioId: string, grafo: GrafoContiguedad): string[] {
  const espacioOrigen = grafo.espacios.get(espacioId);
  if (!espacioOrigen) {
    throw new EspacioNoEncontradoError(espacioId);
  }

  const vecinosIds = grafo.adyacencias.get(espacioId);
  if (!vecinosIds || vecinosIds.size === 0) {
    return [];
  }

  const resultado: string[] = [];
  for (const vecinoId of vecinosIds) {
    const vecino = grafo.espacios.get(vecinoId);
    if (vecino && vecino.tipo === espacioOrigen.tipo) {
      resultado.push(vecino.id);
    }
  }

  return resultado.sort();
}

/**
 * Consulta de espacios contiguos directamente sobre Prisma.
 */
export async function obtenerEspaciosContiguosPorId(
  espacioId: string,
  prisma: {
    espacio: {
      findUnique: (args: any) => Promise<any>;
    };
  },
): Promise<string[]> {
  const espacio = await prisma.espacio.findUnique({
    where: { id: espacioId },
    include: {
      espaciosContiguosA: {
        include: { espacioB: true },
      },
    },
  });

  if (!espacio) {
    throw new EspacioNoEncontradoError(espacioId);
  }

  if (!espacio.espaciosContiguosA || espacio.espaciosContiguosA.length === 0) {
    return [];
  }

  const contiguos = espacio.espaciosContiguosA
    .filter((rel: any) => rel.espacioB && rel.espacioB.tipo === espacio.tipo)
    .map((rel: any) => rel.espacioB.id);

  return contiguos.sort();
}

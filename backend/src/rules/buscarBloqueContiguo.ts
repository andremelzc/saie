import { TipoEspacio } from '@prisma/client';
import { calcularCapacidadReal, EspacioCapacidadInput } from './calcularCapacidadReal';

export interface EspacioConexo extends EspacioCapacidadInput {
  id: string;
  identificador: string;
  pabellon: string;
  piso: number;
  softwareInstalado?: string[] | null;
}

export interface BloqueCandidato {
  espacios: EspacioConexo[];
  espacioIds: string[];
  capacidadTotal: number;
  desperdicio: number; // capacidadTotal - alumnosRequeridos
  piso: number;
  pabellon: string;
  tipo: TipoEspacio;
}

export interface ResultadoBusquedaBloque {
  encontrado: boolean;
  bloques: BloqueCandidato[];
}

export interface BuscarBloqueInput {
  alumnosRequeridos: number;
  tipoEspacioRequerido: TipoEspacio;
  espaciosDisponibles: EspacioConexo[];
  obtenerVecinosContiguos: (espacioId: string) => string[];
  maxEspaciosPorBloque?: number;
}

/**
 * Issue 2.5: Algoritmo de búsqueda de bloque contiguo con capacidad suficiente.
 *
 * - Encuentra todas las combinaciones conexas mínimas de espacios contiguos del mismo tipo.
 * - Descartar combinaciones no contiguas aunque estén en el mismo piso.
 * - Nunca mezcla AULA_TEORICA con LABORATORIO.
 * - Solo considera espacios reportados como disponibles.
 * - Retorna resultado determinista y deduplicado ordenado por:
 *   1. Menor cantidad de espacios
 *   2. Menor desperdicio de aforo
 *   3. Menor piso
 *   4. Orden léxico de identificadores
 */
export function buscarBloqueContiguo(input: BuscarBloqueInput): ResultadoBusquedaBloque {
  const {
    alumnosRequeridos,
    tipoEspacioRequerido,
    espaciosDisponibles,
    obtenerVecinosContiguos,
    maxEspaciosPorBloque = 4,
  } = input;

  if (alumnosRequeridos < 0) {
    return { encontrado: false, bloques: [] };
  }

  // 1. Filtrar espacios disponibles por el tipo requerido
  const espaciosFiltrados = espaciosDisponibles.filter((esp) => esp.tipo === tipoEspacioRequerido);

  const mapaEspacios = new Map<string, EspacioConexo>();
  const mapaCapacidad = new Map<string, number>();

  for (const esp of espaciosFiltrados) {
    mapaEspacios.set(esp.id, esp);
    mapaCapacidad.set(esp.id, calcularCapacidadReal(esp));
  }

  const bloquesEncontradosMap = new Map<string, BloqueCandidato>();

  // 2. Evaluar primero bloques de 1 solo espacio
  for (const esp of espaciosFiltrados) {
    const cap = mapaCapacidad.get(esp.id) || 0;
    if (cap >= alumnosRequeridos) {
      const bloque: BloqueCandidato = {
        espacios: [esp],
        espacioIds: [esp.id],
        capacidadTotal: cap,
        desperdicio: cap - alumnosRequeridos,
        piso: esp.piso,
        pabellon: esp.pabellon,
        tipo: esp.tipo as TipoEspacio,
      };
      bloquesEncontradosMap.set(esp.id, bloque);
    }
  }

  // 3. Expansión BFS de bloques conexos para satisfacer la capacidad
  // Cola de búsqueda con subconjuntos conexos
  interface EstadoBFS {
    espacioIds: string[];
    capacidadAcumulada: number;
    piso: number;
    pabellon: string;
  }

  const cola: EstadoBFS[] = [];

  for (const esp of espaciosFiltrados) {
    const cap = mapaCapacidad.get(esp.id) || 0;
    // Si individualmente no cubre, lo usamos como semilla para expandir
    if (cap < alumnosRequeridos) {
      cola.push({
        espacioIds: [esp.id],
        capacidadAcumulada: cap,
        piso: esp.piso,
        pabellon: esp.pabellon,
      });
    }
  }

  const visitadosSet = new Set<string>();

  while (cola.length > 0) {
    const estado = cola.shift()!;
    const claveActual = [...estado.espacioIds].sort().join('::');
    if (visitadosSet.has(claveActual)) {
      continue;
    }
    visitadosSet.add(claveActual);

    // Explorar todos los vecinos contiguos disponibles de cualquiera de los nodos del bloque actual
    const fronteraVecinos = new Set<string>();
    for (const idNodo of estado.espacioIds) {
      const vecinos = obtenerVecinosContiguos(idNodo);
      for (const idVecino of vecinos) {
        if (!estado.espacioIds.includes(idVecino)) {
          fronteraVecinos.add(idVecino);
        }
      }
    }

    for (const idVecino of fronteraVecinos) {
      const vecino = mapaEspacios.get(idVecino);
      // Validar que el vecino esté disponible, sea del mismo piso, pabellón y tipo
      if (!vecino || vecino.piso !== estado.piso || vecino.pabellon !== estado.pabellon) {
        continue;
      }

      const capVecino = mapaCapacidad.get(idVecino) || 0;
      const nuevaCapacidad = estado.capacidadAcumulada + capVecino;
      const nuevosIds = [...estado.espacioIds, idVecino].sort();
      const claveNueva = nuevosIds.join('::');

      if (nuevaCapacidad >= alumnosRequeridos) {
        if (!bloquesEncontradosMap.has(claveNueva)) {
          const espaciosBloque = nuevosIds.map((id) => mapaEspacios.get(id)!);
          bloquesEncontradosMap.set(claveNueva, {
            espacios: espaciosBloque,
            espacioIds: nuevosIds,
            capacidadTotal: nuevaCapacidad,
            desperdicio: nuevaCapacidad - alumnosRequeridos,
            piso: estado.piso,
            pabellon: estado.pabellon,
            tipo: tipoEspacioRequerido,
          });
        }
      } else if (nuevosIds.length < maxEspaciosPorBloque) {
        if (!visitadosSet.has(claveNueva)) {
          cola.push({
            espacioIds: nuevosIds,
            capacidadAcumulada: nuevaCapacidad,
            piso: estado.piso,
            pabellon: estado.pabellon,
          });
        }
      }
    }
  }

  const bloquesCandidatos = Array.from(bloquesEncontradosMap.values());

  if (bloquesCandidatos.length === 0) {
    return {
      encontrado: false,
      bloques: [],
    };
  }

  // 4. Ordenamiento determinista (RF-06):
  // 1) Menor cantidad de espacios
  // 2) Menor desperdicio de aforo residual
  // 3) Menor piso
  // 4) Orden léxico de los identificadores
  bloquesCandidatos.sort((a, b) => {
    if (a.espacios.length !== b.espacios.length) {
      return a.espacios.length - b.espacios.length;
    }
    if (a.desperdicio !== b.desperdicio) {
      return a.desperdicio - b.desperdicio;
    }
    if (a.piso !== b.piso) {
      return a.piso - b.piso;
    }
    const identsA = a.espacios
      .map((e) => e.identificador)
      .sort()
      .join(', ');
    const identsB = b.espacios
      .map((e) => e.identificador)
      .sort()
      .join(', ');
    return identsA.localeCompare(identsB);
  });

  return {
    encontrado: true,
    bloques: bloquesCandidatos,
  };
}

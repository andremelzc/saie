import { EstadoAsignacion } from '@prisma/client';
import { BloqueCandidato } from './buscarBloqueContiguo';

export interface UbicacionEspacioAsignado {
  pabellon: string;
  piso: number;
}

export interface AsignacionParalelaUbicacion {
  seccionId: string;
  codigoSeccion: string;
  espacios: UbicacionEspacioAsignado[];
}

export const PUNTAJE_CERCANIA_NEUTRO = 50;

/**
 * Calcula la puntuación entre dos ubicaciones físicas:
 * - Mismo pabellón y mismo piso: 100 puntos (máxima cercanía)
 * - Mismo pabellón y piso adyacente (|Δpiso| === 1): 70 puntos (cercanía intermedia)
 * - Mismo pabellón y piso distante (|Δpiso| >= 2): 30 puntos (poca cercanía)
 * - Distinto pabellón: 10 puntos (mínima cercanía)
 */
export function calcularPuntajeDistancia(
  pabellon1: string,
  piso1: number,
  pabellon2: string,
  piso2: number,
): number {
  if (pabellon1.trim().toLowerCase() !== pabellon2.trim().toLowerCase()) {
    return 10;
  }

  const deltaPiso = Math.abs(piso1 - piso2);
  if (deltaPiso === 0) {
    return 100;
  }
  if (deltaPiso === 1) {
    return 70;
  }
  return 30;
}

/**
 * Issue 2.13: Función pura que evalúa la cercanía física entre un bloque candidato y las
 * secciones paralelas ya asignadas del mismo curso en el periodo.
 *
 * - Si no hay secciones paralelas asignadas previamente, retorna puntuación neutra (50 pts).
 * - Calcula la puntuación respecto a cada sección paralela y devuelve el promedio ponderado.
 * - Funciona idéntico para bloques de aulas teóricas y laboratorios.
 */
export function evaluarCercaniaParalelas(
  bloque: BloqueCandidato,
  paralelasAsignadas: AsignacionParalelaUbicacion[],
): number {
  if (!paralelasAsignadas || paralelasAsignadas.length === 0) {
    return PUNTAJE_CERCANIA_NEUTRO;
  }

  const puntajesPorSeccion: number[] = [];

  for (const paralela of paralelasAsignadas) {
    if (!paralela.espacios || paralela.espacios.length === 0) {
      continue;
    }

    // Para una sección paralela con múltiples espacios, tomamos la máxima cercanía con el bloque
    let maxPuntajeSeccion = 0;
    for (const espacioParalelo of paralela.espacios) {
      const puntaje = calcularPuntajeDistancia(
        bloque.pabellon,
        bloque.piso,
        espacioParalelo.pabellon,
        espacioParalelo.piso,
      );
      if (puntaje > maxPuntajeSeccion) {
        maxPuntajeSeccion = puntaje;
      }
    }

    puntajesPorSeccion.push(maxPuntajeSeccion);
  }

  if (puntajesPorSeccion.length === 0) {
    return PUNTAJE_CERCANIA_NEUTRO;
  }

  const suma = puntajesPorSeccion.reduce((acc, p) => acc + p, 0);
  return Math.round((suma / puntajesPorSeccion.length) * 100) / 100;
}

/**
 * Consulta en Prisma las ubicaciones físicas de las demás secciones asignadas (VIGENTE)
 * del mismo curso en el periodo.
 */
export async function consultarUbicacionesSeccionesParalelas(
  cursoId: string,
  seccionIdActual: string,
  periodo: string,
  prisma: {
    asignacion: {
      findMany: (args: any) => Promise<any[]>;
    };
  },
): Promise<AsignacionParalelaUbicacion[]> {
  const asignacionesVigentes = await prisma.asignacion.findMany({
    where: {
      estado: EstadoAsignacion.VIGENTE,
      seccionId: { not: seccionIdActual },
      seccion: {
        cursoId,
        periodo,
      },
    },
    include: {
      seccion: true,
      espacios: {
        include: {
          espacio: true,
        },
      },
    },
  });

  return asignacionesVigentes.map((asig: any) => ({
    seccionId: asig.seccionId,
    codigoSeccion: asig.seccion?.codigoSeccion ?? '',
    espacios: (asig.espacios || []).map((ae: any) => ({
      pabellon: ae.espacio.pabellon,
      piso: ae.espacio.piso,
    })),
  }));
}

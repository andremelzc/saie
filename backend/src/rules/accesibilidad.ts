import { BloqueCandidato } from './buscarBloqueContiguo';

export interface MatriculaMovilidadInput {
  movilidadReducida?: boolean | null;
}

export interface ResultadoPriorizacionPiso1 {
  bloques: BloqueCandidato[];
  fallbackAplicado: boolean;
  motivoFallback?: string;
}

/**
 * Issue 2.8: Determina si una sección tiene al menos un alumno con movilidad reducida registrado en su matrícula.
 *
 * - El flag reside en la matrícula, no en el alumno.
 * - Si al menos un alumno tiene movilidadReducida === true, devuelve true.
 * - Si no hay ningún alumno con el flag activo o la lista está vacía, devuelve false.
 */
export function detectarMovilidadReducida(matriculas?: MatriculaMovilidadInput[] | null): boolean {
  if (!matriculas || matriculas.length === 0) {
    return false;
  }
  return matriculas.some((m) => m.movilidadReducida === true);
}

/**
 * Consulta en base de datos si alguna matrícula de la sección tiene el flag de movilidad reducida.
 */
export async function consultarMovilidadReducidaPorSeccionId(
  seccionId: string,
  prisma: {
    matricula: {
      findFirst: (args: {
        where: { seccionId: string; movilidadReducida: boolean };
      }) => Promise<any>;
    };
  },
): Promise<boolean> {
  const registro = await prisma.matricula.findFirst({
    where: {
      seccionId,
      movilidadReducida: true,
    },
  });

  return registro !== null;
}

/**
 * Issue 2.9: Prioriza bloques candidatos hacia Piso 1 cuando aplica el flag de movilidad reducida.
 *
 * - Si tieneMovilidadReducida === false: El orden de los bloques no se altera y fallbackAplicado es false.
 * - Si tieneMovilidadReducida === true:
 *   - Los bloques ubicados en piso === 1 se colocan al inicio del orden de evaluación.
 *   - Se preserva el orden relativo determinista dentro de los bloques de Piso 1 y dentro de los de otros pisos.
 *   - Si no existe ningún bloque disponible en Piso 1, se utilizan los bloques disponibles en otros pisos
 *     y se documenta explícitamente el fallback aplicado (fallbackAplicado = true).
 */
export function priorizarBloquesPiso1(
  bloques: BloqueCandidato[],
  tieneMovilidadReducida: boolean,
): ResultadoPriorizacionPiso1 {
  if (!tieneMovilidadReducida || bloques.length === 0) {
    return {
      bloques: [...bloques],
      fallbackAplicado: false,
    };
  }

  const bloquesPiso1 = bloques.filter((b) => b.piso === 1);
  const bloquesOtrosPisos = bloques.filter((b) => b.piso !== 1);

  if (bloquesPiso1.length > 0) {
    return {
      bloques: [...bloquesPiso1, ...bloquesOtrosPisos],
      fallbackAplicado: false,
    };
  }

  // Fallback: No hay bloques candidatos en Piso 1 disponibles
  return {
    bloques: [...bloquesOtrosPisos],
    fallbackAplicado: true,
    motivoFallback:
      'No se encontraron bloques candidatos disponibles en Piso 1; asignación derivada a piso superior con acceso a ascensor.',
  };
}

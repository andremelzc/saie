import { TipoEspacio } from '@prisma/client';
import { BloqueCandidato } from './buscarBloqueContiguo';

export interface ResultadoValidacionSoftwareLab {
  cumple: boolean;
  softwareFaltante: string[];
}

export interface DetalleFalloSoftwareLab {
  laboratorioId: string;
  identificador: string;
  softwareFaltante: string[];
}

export interface ResultadoValidacionSoftwareBloque {
  cumple: boolean;
  motivoRechazo?: string;
  detalles: DetalleFalloSoftwareLab[];
}

/**
 * Normaliza el nombre de un software eliminando espacios extra y convirtiendo a minúsculas.
 * Nota: La versión se considera parte del nombre (ej. "Python 3.12" != "Python 3.11").
 */
export function normalizarNombreSoftware(nombre: string): string {
  return nombre.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Issue 2.6: Función pura que determina si un laboratorio individual cumple con el stack requerido.
 *
 * - Recibe stack instalado y stack requerido.
 * - Compara nombres normalizados sin distinguir mayúsculas/minúsculas ni espacios sobrantes.
 * - Si el stack requerido está vacío o es nulo, siempre cumple.
 * - Si el stack instalado es nulo o indefinido, se asume vacío [].
 * - Devuelve { cumple, softwareFaltante }.
 */
export function validarSoftwareLaboratorio(
  softwareInstalado?: string[] | null,
  softwareRequerido?: string[] | null,
): ResultadoValidacionSoftwareLab {
  if (!softwareRequerido || softwareRequerido.length === 0) {
    return {
      cumple: true,
      softwareFaltante: [],
    };
  }

  const instaladosSet = new Set<string>(
    (softwareInstalado || []).map((s) => normalizarNombreSoftware(s)),
  );

  const softwareFaltante: string[] = [];

  for (const requerido of softwareRequerido) {
    const requeridoNormalizado = normalizarNombreSoftware(requerido);
    if (!instaladosSet.has(requeridoNormalizado)) {
      softwareFaltante.push(requerido.trim());
    }
  }

  return {
    cumple: softwareFaltante.length === 0,
    softwareFaltante,
  };
}

/**
 * Issue 2.7: Evalúa si un bloque completo cumple el stack de software.
 *
 * - Para AULA_TEORICA: Retorna cumple de inmediato sin invocar validación de software ni leer campos inexistentes.
 * - Para LABORATORIO: Evalúa cada laboratorio del bloque mediante el Issue 2.6.
 *   Rechaza el bloque completo si al menos un laboratorio no cumple, registrando qué laboratorio y qué faltó.
 */
export function validarSoftwareBloque(
  bloque: BloqueCandidato,
  softwareRequerido?: string[] | null,
): ResultadoValidacionSoftwareBloque {
  // Aulas teóricas no requieren ni poseen software
  if (bloque.tipo === TipoEspacio.AULA_TEORICA) {
    return {
      cumple: true,
      detalles: [],
    };
  }

  const detallesFallo: DetalleFalloSoftwareLab[] = [];

  for (const esp of bloque.espacios) {
    const resLab = validarSoftwareLaboratorio(esp.softwareInstalado, softwareRequerido);
    if (!resLab.cumple) {
      detallesFallo.push({
        laboratorioId: esp.id,
        identificador: esp.identificador,
        softwareFaltante: resLab.softwareFaltante,
      });
    }
  }

  if (detallesFallo.length > 0) {
    const nombresLabs = detallesFallo.map((d) => d.identificador).join(', ');
    return {
      cumple: false,
      motivoRechazo: `Software faltante en el bloque: no instalado en ${nombresLabs}`,
      detalles: detallesFallo,
    };
  }

  return {
    cumple: true,
    detalles: [],
  };
}

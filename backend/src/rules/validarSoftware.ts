import { ComparacionVersion, TipoEspacio } from '@prisma/client';
import { BloqueCandidato } from './buscarBloqueContiguo';
import { compararVersiones, esVersionNumerica, formatearSoftware } from '../lib/software';
import { SoftwareInstaladoInput, SoftwareRequeridoInput } from '../types/software';

export { normalizarNombreSoftware } from '../lib/software';

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
 * Issue 4.28 (Spec 08, §3): decide si un software instalado cubre un requerimiento.
 *
 * El nombre debe coincidir y, además, debe cumplirse la regla de versión que declara el
 * **requerimiento**:
 * - `CUALQUIERA`: cualquier versión del software sirve.
 * - `EXACTA`: la versión instalada es exactamente la requerida.
 * - `MINIMA`: la instalada es igual o superior, comparando por segmentos numéricos
 *   (`3.9 < 3.11 < 3.12`). Una versión no numérica nunca satisface `MINIMA`.
 */
export function cumpleRequerimiento(
  instalado: SoftwareInstaladoInput,
  requerido: SoftwareRequeridoInput,
): boolean {
  if (instalado.nombreNormalizado !== requerido.nombreNormalizado) return false;

  switch (requerido.comparacionVersion) {
    case ComparacionVersion.CUALQUIERA:
      return true;
    case ComparacionVersion.EXACTA:
      return instalado.version === requerido.version;
    case ComparacionVersion.MINIMA:
      return (
        esVersionNumerica(instalado.version) &&
        esVersionNumerica(requerido.version) &&
        compararVersiones(instalado.version, requerido.version) >= 0
      );
    default:
      return false;
  }
}

/**
 * Issue 2.6 / 4.28: función pura que determina si un laboratorio individual cumple el stack.
 *
 * - Recibe lo instalado y lo requerido ya resueltos contra el catálogo (sin texto libre).
 * - Si no hay requerimientos, siempre cumple.
 * - Devuelve los faltantes como `"nombre versión"` para mostrarlos en alertas e historial.
 */
export function validarSoftwareLaboratorio(
  softwareInstalado?: SoftwareInstaladoInput[] | null,
  softwareRequerido?: SoftwareRequeridoInput[] | null,
): ResultadoValidacionSoftwareLab {
  if (!softwareRequerido || softwareRequerido.length === 0) {
    return {
      cumple: true,
      softwareFaltante: [],
    };
  }

  const instalados = softwareInstalado ?? [];
  const softwareFaltante = softwareRequerido
    .filter(
      (requerido) => !instalados.some((instalado) => cumpleRequerimiento(instalado, requerido)),
    )
    .map(formatearSoftware);

  return {
    cumple: softwareFaltante.length === 0,
    softwareFaltante,
  };
}

/**
 * Issue 2.7 / 4.28: evalúa si un bloque completo cumple el stack de software.
 *
 * - Para AULA_TEORICA: cumple de inmediato, sin leer software.
 * - Para LABORATORIO: todos los laboratorios del bloque deben cubrir todos los requerimientos.
 */
export function validarSoftwareBloque(
  bloque: BloqueCandidato,
  softwareRequerido?: SoftwareRequeridoInput[] | null,
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

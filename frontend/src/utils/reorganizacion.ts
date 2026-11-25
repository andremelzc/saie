import type { VistaPreviaReorganizacionDTO } from '../types/admin';
import { plural } from './texto';

/**
 * Issue 2.26: lo que cambiaría «Reorganizar con prioridad», en frases para decidir («2 de 3
 * secciones en revisión conseguirían aula»).
 */
export function frasesSimulacion(
  simulacion: NonNullable<VistaPreviaReorganizacionDTO['simulacion']>,
): string[] {
  const { totalEscaladas, escaladasConAula, cambianDeAula, pierdenAula } = simulacion;
  return [
    `${escaladasConAula} de ${plural(totalEscaladas, 'sección en revisión', 'secciones en revisión')} ${
      escaladasConAula === 1 ? 'conseguiría' : 'conseguirían'
    } aula.`,
    `${plural(cambianDeAula, 'sección cambiaría', 'secciones cambiarían')} de aula.`,
    ...(pierdenAula > 0
      ? [
          `${plural(pierdenAula, 'sección quedaría', 'secciones quedarían')} en revisión porque su aula pasa a una prioritaria.`,
        ]
      : []),
  ];
}

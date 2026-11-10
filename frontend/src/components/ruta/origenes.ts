import { indiceFiguras } from '../mapa2d/indice';
import { pabellonDe } from '../mapa2d/plano';

export interface OpcionOrigen {
  /** Id de la figura en el plano (`ANT-104`). */
  id: string;
  nombre: string;
  piso: number;
}

export interface GrupoOrigen {
  /** «Pabellón antiguo · piso 1». */
  titulo: string;
  opciones: OpcionOrigen[];
}

/** Lugares donde una persona puede decir que está: aulas, laboratorios y los espacios con nombre. */
const CLASES_DE_ORIGEN = new Set(['aula', 'laboratorio', 'biblioteca', 'auditorio', 'comedor']);

/** Otros espacios con nombre propio que no son de una clase de arriba. */
const NOMBRES_DE_ORIGEN = new Set(['Capilla']);

const NOMBRE_PABELLON = { ANT: 'antiguo', NUE: 'nuevo' } as const;

/**
 * Los lugares que se pueden elegir como punto de partida, agrupados por pabellón y piso. Salen del
 * plano, no de la base de datos: así se puede partir de cualquier sitio de la facultad, no solo de
 * las aulas con datos de ocupación.
 */
export function origenesDeRuta(planos: Record<number, string>): GrupoOrigen[] {
  const grupos = new Map<string, { orden: number; opciones: OpcionOrigen[] }>();

  for (const { figura, piso } of indiceFiguras(planos).values()) {
    const pabellon = pabellonDe(figura.id);
    if (!pabellon) continue;
    if (!CLASES_DE_ORIGEN.has(figura.clase) && !NOMBRES_DE_ORIGEN.has(figura.nombre)) continue;

    const titulo = `Pabellón ${NOMBRE_PABELLON[pabellon]} · piso ${piso}`;
    // El antiguo (donde está la entrada) va primero; luego, por piso.
    const orden = (pabellon === 'ANT' ? 0 : 100) + piso;
    const grupo = grupos.get(titulo) ?? { orden, opciones: [] };
    grupo.opciones.push({ id: figura.id, nombre: figura.nombre || figura.id, piso });
    grupos.set(titulo, grupo);
  }

  return [...grupos.entries()]
    .sort((a, b) => a[1].orden - b[1].orden)
    .map(([titulo, { opciones }]) => ({
      titulo,
      opciones: opciones.sort((a, b) =>
        a.nombre.localeCompare(b.nombre, 'es', { numeric: true, sensitivity: 'base' }),
      ),
    }));
}

import { leerPlano2D, pabellonDe, type FiguraPlano2D } from '../mapa2d/plano';

export interface OpcionOrigen {
  /**
   * Identifica la opción: el id de la figura y el piso, porque baños, oficinas, escaleras y
   * ascensores repiten su id en cada piso (`ANT-bano-1@2`). Se lee con `leerOrigen`.
   */
  id: string;
  /** Id de la figura en el plano (`ANT-104`). */
  figuraId: string;
  nombre: string;
  piso: number;
}

export interface GrupoOrigen {
  /** «Pabellón antiguo · piso 1». */
  titulo: string;
  opciones: OpcionOrigen[];
}

const NOMBRE_PABELLON = { ANT: 'antiguo', NUE: 'nuevo' } as const;

/** `ANT-bano-1@2` → `{ id: 'ANT-bano-1', piso: 2 }`. */
export function leerOrigen(valor: string): { id: string; piso?: number } {
  const [id, piso] = valor.split('@');
  return piso === undefined ? { id } : { id, piso: Number(piso) };
}

/** Número que cierra el id de una figura (`ANT-bano-2` → `2`). */
const numeroDe = (id: string) => /-(\d+)[a-z]?$/.exec(id)?.[1] ?? '';

/**
 * Cómo se llama un lugar en la lista, o `null` si no es un sitio donde alguien diga «estoy aquí»
 * (puertas, salas sin nombre). Las figuras repetidas (baños, oficinas, escaleras, patios) llevan su
 * número para distinguirlas; si solo hay una de su clase en el pabellón, va sin número.
 */
function nombreDeOrigen(figura: FiguraPlano2D, hayVarias: boolean): string | null {
  const n = numeroDe(figura.id);
  const conNumero = (base: string) => (hayVarias && n ? `${base} ${n}` : base);
  switch (figura.clase) {
    case 'aula':
    case 'laboratorio':
    case 'biblioteca':
    case 'auditorio':
    case 'comedor':
      return figura.nombre || figura.id;
    case 'bano':
      return conNumero('Baño');
    case 'administrativo':
      // Salas con nombre propio (profesores, capilla…) y, si no, una oficina más.
      return figura.nombre && figura.nombre !== 'Administrativo'
        ? figura.nombre
        : conNumero('Oficina');
    case 'escalera':
      return conNumero('Escalera');
    case 'ascensor':
      return conNumero('Ascensor');
    case 'patio':
      return figura.nombre === 'Jardín' ? 'Jardín' : conNumero('Patio');
    default:
      return null;
  }
}

/**
 * Los lugares que se pueden elegir como punto de partida, agrupados por pabellón y piso: aulas,
 * laboratorios, baños, oficinas, sala de profesores, biblioteca, comedor, escaleras, ascensores y
 * el patio. Salen del plano, no de la base de datos: se puede partir de cualquier sitio de la
 * facultad, no solo de las aulas con datos de ocupación. Las puertas no son un punto de partida.
 */
export function origenesDeRuta(planos: Record<number, string>): GrupoOrigen[] {
  const grupos = new Map<string, { orden: number; opciones: OpcionOrigen[] }>();

  for (const [textoPiso, texto] of Object.entries(planos)) {
    const piso = Number(textoPiso);
    let figuras: FiguraPlano2D[];
    try {
      figuras = leerPlano2D(texto).figuras;
    } catch {
      continue; // Un plano ilegible no impide ofrecer los demás.
    }

    // Cuántas figuras de cada clase hay por pabellón en este piso: decide si llevan número.
    const cuantas = new Map<string, number>();
    for (const f of figuras) {
      const clave = `${pabellonDe(f.id) ?? ''}|${f.clase}`;
      cuantas.set(clave, (cuantas.get(clave) ?? 0) + 1);
    }

    for (const figura of figuras) {
      const pabellon = pabellonDe(figura.id);
      // El patio y el jardín no son de un pabellón; cualquier otra figura sin pabellón, sí se omite.
      if (!pabellon && figura.clase !== 'patio') continue;
      const nombre = nombreDeOrigen(
        figura,
        (cuantas.get(`${pabellon ?? ''}|${figura.clase}`) ?? 0) > 1,
      );
      if (!nombre) continue;

      const titulo = pabellon
        ? `Pabellón ${NOMBRE_PABELLON[pabellon]} · piso ${piso}`
        : `Patio y jardín · piso ${piso}`;
      // El antiguo (donde está la entrada) va primero, luego el nuevo y al final el patio.
      const orden = (pabellon === 'ANT' ? 0 : pabellon === 'NUE' ? 100 : 200) + piso;
      const grupo = grupos.get(titulo) ?? { orden, opciones: [] };
      grupo.opciones.push({ id: `${figura.id}@${piso}`, figuraId: figura.id, nombre, piso });
      grupos.set(titulo, grupo);
    }
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

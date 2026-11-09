import type { RutaReferencia } from '../ruta/tipos';
import type { EspacioMapa2D } from './etiquetas';
import { indiceFiguras, normalizar } from './indice';
import type { Pabellon } from './plano';

/**
 * Enlace entre la base de datos y los planos SVG.
 *
 * La BD identifica un espacio por su UUID y por (`pabellon`, `identificador`), p. ej.
 * «Antiguo Pabellón» + «Aula 104 - Laboratorio 08». El plano lo dibuja como la figura `ANT-104`.
 * La traducción no se deduce del código: se hace por el **nombre**, porque cada figura de
 * aula o laboratorio lleva en `data-nombre` el mismo texto que `identificador` en la BD, y el
 * prefijo del plano (`NUE`/`ANT`) sale del nombre del pabellón.
 */

/** Nombre de pabellón en la BD (normalizado) -> prefijo de los ids del plano. */
const PREFIJO_DE_PABELLON: Record<string, Pabellon> = {
  'nuevo pabellon': 'NUE',
  'antiguo pabellon': 'ANT',
};

/** Nombres de los pabellones en la BD, en el orden en que se consultan. */
export const PABELLONES_BD = ['Nuevo Pabellón', 'Antiguo Pabellón'] as const;

/** Prefijo del plano para un pabellón de la BD, o `null` si no es uno de los dos conocidos. */
export function prefijoDePabellon(nombre: string): Pabellon | null {
  return PREFIJO_DE_PABELLON[normalizar(nombre)] ?? null;
}

const CLASES_ENLAZABLES = new Set(['aula', 'laboratorio']);

export interface FiguraEnlazada {
  /** Id de la figura en el plano (`ANT-104`). */
  id: string;
  piso: number;
  /** `data-nombre` de la figura, igual al `identificador` de la BD. */
  nombre: string;
  prefijo: Pabellon;
}

export interface EnlacePlano {
  /** Id de la figura que corresponde a un espacio de la BD, o `null` si el plano no lo dibuja. */
  idDeEspacio: (pabellon: string, identificador: string) => string | null;
  /** Figuras de aula y laboratorio del plano. */
  figuras: FiguraEnlazada[];
  /** Nombres que aparecen en más de una figura del mismo pabellón (el enlace sería ambiguo). */
  ambiguos: string[];
}

const claveDe = (prefijo: string, nombre: string) => `${prefijo}|${normalizar(nombre)}`;

/** Construye el enlace a partir de los planos (piso -> texto del SVG). */
export function crearEnlacePlano(planos: Record<number, string>): EnlacePlano {
  const figuras: FiguraEnlazada[] = [];
  const porClave = new Map<string, string>();
  const ambiguos = new Set<string>();

  for (const { piso, figura } of indiceFiguras(planos).values()) {
    if (!CLASES_ENLAZABLES.has(figura.clase) || !figura.nombre) continue;
    const prefijo = figura.id.slice(0, 3);
    if (prefijo !== 'NUE' && prefijo !== 'ANT') continue;
    figuras.push({ id: figura.id, piso, nombre: figura.nombre, prefijo });
    const clave = claveDe(prefijo, figura.nombre);
    if (porClave.has(clave)) ambiguos.add(`${prefijo} · ${figura.nombre}`);
    else porClave.set(clave, figura.id);
  }

  return {
    figuras,
    ambiguos: [...ambiguos],
    idDeEspacio: (pabellon, identificador) => {
      const prefijo = prefijoDePabellon(pabellon);
      return prefijo ? (porClave.get(claveDe(prefijo, identificador)) ?? null) : null;
    },
  };
}

// --- Ocupación (Issues 3.13 y 4.11) -------------------------------------------------------------

/** Lo mínimo que se necesita de un espacio de `MapaOcupacionDTO` / `MapaOcupacionLecturaDTO`. */
export interface EspacioOcupacionEntrada {
  identificador: string;
  tipo: EspacioMapa2D['tipo'];
  estado: EspacioMapa2D['estado'] | 'DESHABILITADO';
  aforoNominal?: number;
  descripcionUso?: string | null;
  /** Solo en la vista del panel: qué sección ocupa el espacio. El alumno no la recibe. */
  asignacion?: { nombreCurso: string; codigoSeccion: string; docenteNombre: string | null } | null;
  /** Solo en la vista del panel. */
  alertas?: { motivo: string }[];
}

/** Texto de contexto del espacio: la alerta, la sección que lo ocupa o su rótulo de uso. */
function detalleDe(e: EspacioOcupacionEntrada): string | undefined {
  if (e.alertas && e.alertas.length > 0) return e.alertas.map((a) => a.motivo).join(' · ');
  if (e.asignacion) {
    const { nombreCurso, codigoSeccion, docenteNombre } = e.asignacion;
    return [`${nombreCurso} (sección ${codigoSeccion})`, docenteNombre].filter(Boolean).join(' · ');
  }
  return e.descripcionUso ?? undefined;
}

export interface MapaOcupacionEntrada {
  pabellon: string;
  piso: number;
  espacios: EspacioOcupacionEntrada[];
}

export interface ResultadoOcupacion {
  /** Espacios listos para el mapa: `id` es el de la figura del plano. */
  espacios: EspacioMapa2D[];
  /** Espacios de la BD que el plano no dibuja (no aparecen en el mapa). */
  sinFigura: string[];
  /** Espacios deshabilitados: el mapa los deja neutros y no interactivos. */
  deshabilitados: string[];
}

/** Traduce la respuesta del endpoint de ocupación de un piso a los espacios del mapa. */
export function espaciosDesdeOcupacion(
  dto: MapaOcupacionEntrada,
  enlace: EnlacePlano,
): ResultadoOcupacion {
  const salida: ResultadoOcupacion = { espacios: [], sinFigura: [], deshabilitados: [] };
  for (const e of dto.espacios) {
    const id = enlace.idDeEspacio(dto.pabellon, e.identificador);
    if (!id) {
      salida.sinFigura.push(`${dto.pabellon} · ${e.identificador}`);
      continue;
    }
    if (e.estado === 'DESHABILITADO') {
      salida.deshabilitados.push(id);
      continue;
    }
    salida.espacios.push({
      id,
      nombre: e.identificador,
      tipo: e.tipo,
      estado: e.estado,
      piso: dto.piso,
      aforo: e.aforoNominal,
      detalle: detalleDe(e),
    });
  }
  return salida;
}

// --- Ruta (Issues 3.14 y 3.15) ------------------------------------------------------------------

/**
 * Sustituye el `espacioId` de cada tramo (un UUID de la BD) por el id de la figura del plano,
 * que es lo que espera `calcularTrazado`. Un tramo cuyo espacio el plano no dibuja queda sin
 * `espacioId`; un `espacioId` que ya es el de una figura (datos de ejemplo) no se toca.
 */
export function rutaConIdsDePlano(
  ruta: RutaReferencia,
  enlace: EnlacePlano,
  planos: Record<number, string>,
): RutaReferencia {
  const ids = new Set(indiceFiguras(planos).keys());
  return {
    ...ruta,
    tramos: ruta.tramos.map((t) => {
      if (t.tipo !== 'ESPACIO_ASIGNADO' || !t.espacioId || ids.has(t.espacioId)) return t;
      const id =
        t.pabellon && t.identificador ? enlace.idDeEspacio(t.pabellon, t.identificador) : null;
      return { ...t, espacioId: id ?? undefined };
    }),
  };
}

// --- Diagnóstico --------------------------------------------------------------------------------

/**
 * Desajustes entre los espacios de la BD y el plano, como texto para `onAviso` o para una
 * comprobación: figuras de aula o laboratorio que ningún espacio reclama, y espacios sin figura.
 */
export function avisosDeCruce(
  espacios: { pabellon: string; identificador: string }[],
  enlace: EnlacePlano,
): { figurasSinEspacio: string[]; espaciosSinFigura: string[]; ambiguos: string[] } {
  const reclamadas = new Set<string>();
  const espaciosSinFigura: string[] = [];
  for (const e of espacios) {
    const id = enlace.idDeEspacio(e.pabellon, e.identificador);
    if (id) reclamadas.add(id);
    else espaciosSinFigura.push(`${e.pabellon} · ${e.identificador}`);
  }
  return {
    figurasSinEspacio: enlace.figuras.filter((f) => !reclamadas.has(f.id)).map((f) => f.id),
    espaciosSinFigura,
    ambiguos: enlace.ambiguos,
  };
}

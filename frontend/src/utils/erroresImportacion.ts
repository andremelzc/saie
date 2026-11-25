export interface GrupoErrorImportacion {
  /** Tipo de error en lenguaje llano, sin el número de fila ni los valores concretos. */
  tipo: string;
  /** Los mensajes originales de este grupo, en el orden en que llegaron. */
  errores: string[];
}

/** «Fila 12: …» o «Fila 12 - …»: el prefijo con el número de fila que añade el backend. */
const PREFIJO_FILA = /^\s*fila\s+\d+\s*[:\-–]\s*/i;

/**
 * Convierte un mensaje de error de una fila en su «tipo»: sin el número de fila y con los valores
 * concretos (entre comillas) y los números reemplazados, de modo que 400 filas con un código de
 * curso inexistente distinto cada una caigan en un solo grupo (Issue 4.53).
 */
export function tipoDeError(mensaje: string): string {
  const sinFila = mensaje.replace(PREFIJO_FILA, '').trim();
  const generico = sinFila
    .replace(/'[^']*'|"[^"]*"|«[^»]*»/g, '«…»')
    .replace(/\b\d+(?:[.,:]\d+)*\b/g, 'N')
    .replace(/\s+/g, ' ');
  return generico || 'Error sin detalle';
}

/**
 * Agrupa los errores de una importación por tipo, del grupo más numeroso al menos numeroso. Un
 * archivo puede traer hasta 20 000 filas: la pantalla muestra los primeros de cada grupo y deja
 * descargar todos, así que agrupar aquí es lo que evita pintar miles de líneas.
 */
export function agruparErroresPorTipo(errores: string[]): GrupoErrorImportacion[] {
  const grupos = new Map<string, GrupoErrorImportacion>();
  for (const error of errores) {
    const tipo = tipoDeError(error);
    const grupo = grupos.get(tipo);
    if (grupo) grupo.errores.push(error);
    else grupos.set(tipo, { tipo, errores: [error] });
  }
  return [...grupos.values()].sort((a, b) => b.errores.length - a.errores.length);
}

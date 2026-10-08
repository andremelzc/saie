import { parse } from 'csv-parse/sync';
import { HttpError } from './http';
import { TipoImportacion } from '../types/importacion';

/** Tope de filas por envío: cada fila implica varias consultas a la base de datos. */
export const MAX_FILAS_IMPORTACION = 20000;

const VALORES_VERDADEROS = new Set(['true', '1', 'si', 'sí', 's', 'x', 'yes', 'y']);

function aBooleano(valor: string): boolean {
  return VALORES_VERDADEROS.has(valor.trim().toLowerCase());
}

function sinAcentos(valor: string): string {
  return valor.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Las listas dentro de una celda CSV se separan con `|`, `;` o `,` (esta última entre comillas). */
function aLista(valor: string): string[] {
  return valor
    .split(/[|;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Lee un CSV con encabezado. Acepta `,` o `;` como separador (Excel en español exporta con `;`)
 * y un BOM inicial. Cualquier problema de formato se reporta como 400.
 */
export function parsearCsv(texto: string): Record<string, string>[] {
  const sinBom = texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto;
  const primeraLinea = sinBom.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = primeraLinea.includes(';') && !primeraLinea.includes(',') ? ';' : ',';

  try {
    return parse(texto, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      delimiter,
    }) as Record<string, string>[];
  } catch (error: unknown) {
    const detalle = error instanceof Error ? error.message : 'formato desconocido';
    throw new HttpError(400, `El archivo CSV no es válido: ${detalle}`);
  }
}

/**
 * Un CSV solo trae texto: convierte las columnas que los esquemas Zod esperan como booleano o
 * lista. Los nombres de columna son los mismos campos del esquema (camelCase).
 */
export function normalizarFilaCsv(
  tipo: TipoImportacion,
  fila: Record<string, string>,
): Record<string, unknown> {
  const normalizada: Record<string, unknown> = { ...fila };

  switch (tipo) {
    case 'cursos-secciones':
      if (typeof fila.tipoEspacioRequerido === 'string') {
        normalizada.tipoEspacioRequerido = fila.tipoEspacioRequerido.trim().toUpperCase();
      }
      if (typeof fila.stackSoftwareRequerido === 'string') {
        normalizada.stackSoftwareRequerido = aLista(fila.stackSoftwareRequerido);
      }
      break;
    case 'horarios':
      if (typeof fila.diaSemana === 'string') {
        normalizada.diaSemana = sinAcentos(fila.diaSemana.trim().toUpperCase());
      }
      break;
    case 'matriculas':
      if (typeof fila.movilidadReducida === 'string') {
        normalizada.movilidadReducida = aBooleano(fila.movilidadReducida);
      }
      if (typeof fila.crearCuentaAcceso === 'string') {
        if (fila.crearCuentaAcceso === '') {
          delete normalizada.crearCuentaAcceso;
        } else {
          normalizada.crearCuentaAcceso = aBooleano(fila.crearCuentaAcceso);
        }
      }
      break;
    case 'docentes':
      break;
  }

  return normalizada;
}

/**
 * Obtiene las filas a importar del cuerpo de la solicitud:
 * - texto (`text/csv`): CSV con encabezado;
 * - JSON: un arreglo de filas o un objeto `{ "datos": [...] }`.
 */
export function extraerFilas(tipo: TipoImportacion, cuerpo: unknown): unknown[] {
  let filas: unknown[];

  if (typeof cuerpo === 'string') {
    filas = parsearCsv(cuerpo).map((fila) => normalizarFilaCsv(tipo, fila));
  } else if (Array.isArray(cuerpo)) {
    filas = cuerpo;
  } else if (
    cuerpo !== null &&
    typeof cuerpo === 'object' &&
    Array.isArray((cuerpo as { datos?: unknown }).datos)
  ) {
    filas = (cuerpo as { datos: unknown[] }).datos;
  } else {
    throw new HttpError(
      400,
      'Envía un CSV (Content-Type: text/csv) o un JSON con la lista de filas',
    );
  }

  if (filas.length === 0) {
    throw new HttpError(400, 'El archivo no contiene filas para importar');
  }
  if (filas.length > MAX_FILAS_IMPORTACION) {
    throw new HttpError(
      413,
      `El archivo supera el máximo de ${MAX_FILAS_IMPORTACION} filas por envío`,
    );
  }

  return filas;
}

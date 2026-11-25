import type { CambioAulaDocenteDTO, EspacioCambioAulaDTO } from '../types/docente';
import { etiquetaTipoEspacio, rotuloClase } from './horario';

/**
 * Issue 7.18 (riesgo R24): avisos de cambio de aula en el portal docente.
 *
 * El docente marca un aviso como leído con «Entendido». Se recuerda en este navegador
 * (`localStorage`): es solo una comodidad, el aviso deja de salir igual a los 7 días.
 */

const CLAVE_VISTOS = 'saie:docente:cambiosAulaVistos';
/** Se guardan como mucho estos ids: los avisos viejos ya no llegan del backend. */
const MAX_VISTOS = 50;

export function leerAvisosVistos(): string[] {
  try {
    const crudo = window.localStorage.getItem(CLAVE_VISTOS);
    const valor: unknown = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(valor) ? valor.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function guardarAvisoVisto(id: string): string[] {
  const vistos = [id, ...leerAvisosVistos().filter((v) => v !== id)].slice(0, MAX_VISTOS);
  try {
    window.localStorage.setItem(CLAVE_VISTOS, JSON.stringify(vistos));
  } catch {
    // Sin almacenamiento (modo privado o bloqueado): el aviso se oculta solo en esta visita.
  }
  return vistos;
}

/** Avisos que aún no se marcaron como leídos. */
export function avisosPendientes(
  cambios: CambioAulaDocenteDTO[],
  vistos: string[],
): CambioAulaDocenteDTO[] {
  return cambios.filter((c) => !vistos.includes(c.id));
}

/** «Laboratorio L-03 (Nuevo, piso 2)» o «sin aula» si la sección se quedó sin espacio. */
export function textoEspacios(espacios: EspacioCambioAulaDTO[]): string {
  if (espacios.length === 0) return 'sin aula por ahora';
  return espacios
    .map((e) => `${etiquetaTipoEspacio(e.tipo)} ${e.identificador} (${e.pabellon}, piso ${e.piso})`)
    .join(', ');
}

/** Título del aviso: «202SW0805 · Grupo 2 · Laboratorio». */
export function tituloCambio(c: CambioAulaDocenteDTO): string {
  return `${c.codigoCurso} · ${rotuloClase(c)}`;
}

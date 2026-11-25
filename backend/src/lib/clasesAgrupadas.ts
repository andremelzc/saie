import { TipoEspacio } from '@prisma/client';
import { minutosDesdeHora } from './horario';

/**
 * Issue 3.62: cada grupo de un curso son dos secciones (por ejemplo `2` teoría y `2-LAB`
 * laboratorio). Estas funciones las juntan bajo el mismo curso y grupo y rotulan cada clase
 * como «Teoría» o «Laboratorio», para que ninguna vista muestre el código de sección crudo.
 */

const SUFIJO_LABORATORIO = '-LAB';

/** Lo mínimo que necesita una clase para agruparse por curso y grupo. */
export interface ClaseAgrupable {
  codigoCurso: string;
  nombreCurso: string;
  codigoSeccion: string;
  tipoEspacioRequerido: TipoEspacio;
  horaInicio: string;
  horaFin: string;
}

/** Un curso y grupo con sus clases (la de teoría y la de laboratorio). */
export interface GrupoDeClases<T extends ClaseAgrupable> {
  codigoCurso: string;
  nombreCurso: string;
  grupo: string;
  clases: T[];
}

/** Grupo al que pertenece una sección: «2» tanto para `2` como para `2-LAB`. */
export function grupoDeSeccion(codigoSeccion: string): string {
  const codigo = codigoSeccion.trim();
  return codigo.toUpperCase().endsWith(SUFIJO_LABORATORIO)
    ? codigo.slice(0, -SUFIJO_LABORATORIO.length)
    : codigo;
}

/** «Teoría» o «Laboratorio» según el tipo de espacio que requiere la sección. */
export function etiquetaTipoClase(tipo: TipoEspacio): 'Teoría' | 'Laboratorio' {
  return tipo === TipoEspacio.LABORATORIO ? 'Laboratorio' : 'Teoría';
}

/** Rótulo corto de una clase suelta, p. ej. «Grupo 2 · Laboratorio». */
export function rotuloClase(clase: Pick<ClaseAgrupable, 'codigoSeccion' | 'tipoEspacioRequerido'>) {
  return `Grupo ${grupoDeSeccion(clase.codigoSeccion)} · ${etiquetaTipoClase(clase.tipoEspacioRequerido)}`;
}

const ORDEN_TIPO: Record<TipoEspacio, number> = {
  [TipoEspacio.AULA_TEORICA]: 0,
  [TipoEspacio.LABORATORIO]: 1,
};

function compararClases(a: ClaseAgrupable, b: ClaseAgrupable): number {
  return (
    minutosDesdeHora(a.horaInicio) - minutosDesdeHora(b.horaInicio) ||
    ORDEN_TIPO[a.tipoEspacioRequerido] - ORDEN_TIPO[b.tipoEspacioRequerido]
  );
}

/**
 * Agrupa las clases por curso y grupo. Dentro de cada grupo las clases van por hora de inicio
 * (y teoría antes que laboratorio si empiezan a la vez); los grupos van por la hora de su primera
 * clase y, a igual hora, por código de curso.
 */
export function agruparClases<T extends ClaseAgrupable>(clases: T[]): GrupoDeClases<T>[] {
  const grupos = new Map<string, GrupoDeClases<T>>();

  for (const clase of clases) {
    const grupo = grupoDeSeccion(clase.codigoSeccion);
    const clave = `${clase.codigoCurso}\u0000${grupo}`;
    const existente = grupos.get(clave);
    if (existente) {
      existente.clases.push(clase);
    } else {
      grupos.set(clave, {
        codigoCurso: clase.codigoCurso,
        nombreCurso: clase.nombreCurso,
        grupo,
        clases: [clase],
      });
    }
  }

  return [...grupos.values()]
    .map((g) => ({ ...g, clases: [...g.clases].sort(compararClases) }))
    .sort(
      (a, b) =>
        minutosDesdeHora(a.clases[0].horaInicio) - minutosDesdeHora(b.clases[0].horaInicio) ||
        a.codigoCurso.localeCompare(b.codigoCurso) ||
        a.grupo.localeCompare(b.grupo, 'es', { numeric: true }),
    );
}

/** Encabezado de un grupo en los mensajes de texto: «202SW0805 - Nombre (Grupo 2)». */
export function encabezadoGrupo(grupo: GrupoDeClases<ClaseAgrupable>): string {
  return `${grupo.codigoCurso} - ${grupo.nombreCurso} (Grupo ${grupo.grupo})`;
}

import { EstadoAsignacion } from '@prisma/client';
import { EspacioConexo } from '../rules/buscarBloqueContiguo';
import { AlertaRegistradaDTO } from '../types/alertas';
import { SeccionInputMotor } from '../types/asignacion';
import { bus } from './bus';
import { AsignacionCambiadaEvento, EspacioEventoDTO } from './tipos';

interface AsignacionPreviaMinima {
  estado: EstadoAsignacion;
  espacioIds: string[];
}

function mismoConjunto(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const conjunto = new Set(a);
  return b.every((id) => conjunto.has(id));
}

/**
 * Issue 2.16: decide si una asignación nueva es un CAMBIO que merece aviso. Solo lo es si la
 * anterior estaba VIGENTE, la nueva también lo está y los espacios son distintos. No lo es:
 * - la primera asignación de una sección (no había anterior),
 * - una sección que estaba escalada (nunca tuvo aula que avisar),
 * - una sección que pasa a escalada (no hay aula nueva que informar),
 * - una asignación conservada por idempotencia (los espacios no cambian).
 */
export function detectarCambioDeEspacios(
  previa: AsignacionPreviaMinima | null | undefined,
  nuevoEstado: EstadoAsignacion,
  nuevosEspacioIds: string[],
): { anteriores: string[]; nuevos: string[] } | null {
  if (!previa || previa.estado !== EstadoAsignacion.VIGENTE) return null;
  if (nuevoEstado !== EstadoAsignacion.VIGENTE) return null;
  if (mismoConjunto(previa.espacioIds, nuevosEspacioIds)) return null;
  return { anteriores: previa.espacioIds, nuevos: nuevosEspacioIds };
}

function aEspacios(ids: string[], todos: Map<string, EspacioConexo>): EspacioEventoDTO[] {
  return ids.map((id) => ({ id, identificador: todos.get(id)?.identificador ?? id }));
}

/** Arma el contenido del evento `asignacion.cambiada` con los identificadores legibles. */
export function construirEventoCambio(
  seccion: SeccionInputMotor,
  cambio: { anteriores: string[]; nuevos: string[] },
  espacios: EspacioConexo[],
): AsignacionCambiadaEvento {
  const porId = new Map(espacios.map((e) => [e.id, e]));
  return {
    seccionId: seccion.id,
    codigoCurso: seccion.codigoCurso ?? '',
    nombreCurso: seccion.nombreCurso ?? '',
    codigoSeccion: seccion.codigoSeccion,
    periodo: seccion.periodo,
    espaciosAnteriores: aEspacios(cambio.anteriores, porId),
    espaciosNuevos: aEspacios(cambio.nuevos, porId),
    horarios: seccion.horarios,
  };
}

/** Emite `asignacion.cambiada` para cada cambio. Llamar después de confirmar la transacción. */
export function emitirCambiosDeAsignacion(eventos: AsignacionCambiadaEvento[]): void {
  for (const evento of eventos) {
    void bus.emitir('asignacion.cambiada', evento);
  }
}

/**
 * Emite `alerta.creada` solo para las alertas nuevas (`creada: true`); las que solo actualizaron
 * una pendiente idéntica no generan evento. Llamar después de confirmar la transacción.
 */
export function emitirAlertasCreadas(alertas: AlertaRegistradaDTO[]): void {
  for (const alerta of alertas) {
    if (!alerta.creada) continue;
    void bus.emitir('alerta.creada', {
      alertaId: alerta.id,
      tipo: alerta.tipo,
      espacioId: alerta.espacioId,
      motivo: alerta.motivo,
      asignacionesAfectadas: alerta.asignacionesAfectadas,
    });
  }
}

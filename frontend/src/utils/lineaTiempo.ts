import type { EstadoAsignacion, HistorialAsignacionDTO } from '../types/admin';
import { describirMotivoEscalamiento } from './admin';
import { ubicacionDeEspacios } from './historial';

/** Un paso de la línea de tiempo de una sección (Issue 4.46). */
export interface PasoLineaTiempo {
  id: string;
  fecha: string;
  /** «Asignada a Aula 102», «Pasó a revisión», «Reasignada a Lab 04». */
  titulo: string;
  /** Ubicación del aula o motivo de la revisión, en lenguaje llano. */
  detalle: string | null;
  estado: EstadoAsignacion;
  /** Es la asignación que rige hoy (la última vigente o en revisión). */
  actual: boolean;
}

/**
 * Convierte el historial de una sección (cualquier orden) en su línea de tiempo, de la más
 * antigua a la más reciente: asignada a X → pasó a revisión → reasignada a Y.
 */
export function lineaTiempoDeSeccion(items: readonly HistorialAsignacionDTO[]): PasoLineaTiempo[] {
  const ordenados = [...items].sort((a, b) => a.fechaAsignacion.localeCompare(b.fechaAsignacion));
  let yaTuvoAula = false;
  const pasos = ordenados.map((a): PasoLineaTiempo => {
    const aulas = a.espacios.map((e) => e.identificador).join(', ');
    if (a.estado === 'ESCALADA' || a.espacios.length === 0) {
      const motivo = describirMotivoEscalamiento(a.motivoEscalamiento);
      return {
        id: a.id,
        fecha: a.fechaAsignacion,
        titulo: 'Pasó a revisión',
        detalle: a.motivoEscalamiento ? `${motivo.etiqueta}: ${motivo.descripcion}` : null,
        estado: a.estado,
        actual: false,
      };
    }
    const titulo = `${yaTuvoAula ? 'Reasignada a' : 'Asignada a'} ${aulas}`;
    yaTuvoAula = true;
    return {
      id: a.id,
      fecha: a.fechaAsignacion,
      titulo,
      detalle: ubicacionDeEspacios(a.espacios) || null,
      estado: a.estado,
      actual: false,
    };
  });
  // La que rige hoy es la última que no es histórica.
  for (let i = pasos.length - 1; i >= 0; i--) {
    if (pasos[i].estado !== 'HISTORICA') {
      pasos[i].actual = true;
      break;
    }
  }
  return pasos;
}

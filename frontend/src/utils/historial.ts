import type { HistorialAsignacionDTO } from '../types/admin';
import { formatearFechaCorta } from './fechas';

export interface GrupoCorrida {
  /** `null` agrupa las asignaciones que no vienen de una corrida (p. ej. el reintento de una sección). */
  corridaId: string | null;
  items: HistorialAsignacionDTO[];
  /** Fecha de la asignación más reciente del grupo. */
  fecha: string;
  asignadas: number;
  enRevision: number;
}

/**
 * Agrupa el historial por corrida conservando el orden recibido (más reciente primero): cada
 * grupo aparece donde está su primera fila. Así el UUID de la corrida no se muestra ni se repite
 * en cada fila (Issue 4.47).
 */
export function agruparPorCorrida(items: HistorialAsignacionDTO[]): GrupoCorrida[] {
  const grupos = new Map<string, GrupoCorrida>();
  for (const item of items) {
    const clave = item.corridaId ?? '';
    let grupo = grupos.get(clave);
    if (!grupo) {
      grupo = {
        corridaId: item.corridaId,
        items: [],
        fecha: item.fechaAsignacion,
        asignadas: 0,
        enRevision: 0,
      };
      grupos.set(clave, grupo);
    }
    grupo.items.push(item);
    if (item.fechaAsignacion > grupo.fecha) grupo.fecha = item.fechaAsignacion;
    if (item.estado === 'ESCALADA') grupo.enRevision += 1;
    else grupo.asignadas += 1;
  }
  return [...grupos.values()];
}

/** «Corrida del 12 oct, 10:32 · 230 asignadas · 17 en revisión». */
export function tituloDeCorrida(grupo: GrupoCorrida): string {
  const cuando = formatearFechaCorta(grupo.fecha);
  const inicio = grupo.corridaId ? `Corrida del ${cuando}` : `Asignación individual del ${cuando}`;
  const partes = [
    `${grupo.asignadas} ${grupo.asignadas === 1 ? 'asignada' : 'asignadas'}`,
    ...(grupo.enRevision > 0 ? [`${grupo.enRevision} en revisión`] : []),
  ];
  return `${inicio} · ${partes.join(' · ')}`;
}

/** «Pabellón C · piso 3» a partir de los espacios de una asignación (sin repetir ubicaciones). */
export function ubicacionDeEspacios(espacios: HistorialAsignacionDTO['espacios']): string {
  const pabellon = (nombre: string) => (/^pabell/i.test(nombre) ? nombre : `Pabellón ${nombre}`);
  const ubicaciones = [...new Set(espacios.map((e) => `${pabellon(e.pabellon)} · piso ${e.piso}`))];
  return ubicaciones.join(', ');
}

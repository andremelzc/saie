import type { DiaSemana } from '../types/consulta';
import type { AsignacionActivaDocenteDTO } from '../types/docente';
import type { HorarioSemanalDTO, SesionDTO } from '../types/horario';
import { estadoDeClase, proximoDiaConClases, sesionesDeDia } from './horario';

export interface ProximaClase {
  sesion: SesionDTO;
  dia: DiaSemana;
  /** `true` si la clase es hoy: solo entonces tiene sentido la cuenta regresiva. */
  esHoy: boolean;
}

/**
 * La clase en curso o la siguiente de hoy; si hoy ya no queda ninguna, la primera del próximo
 * día con clases (Issue 7.8). `null` si el docente no tiene clases en la semana.
 */
export function proximaClaseDocente(
  horario: HorarioSemanalDTO,
  hoy: DiaSemana,
  ahoraEnMinutos: number,
): ProximaClase | null {
  const deHoy = sesionesDeDia(horario, hoy).find(
    (s) => estadoDeClase(s, ahoraEnMinutos) !== 'FINALIZADA',
  );
  if (deHoy) return { sesion: deHoy, dia: hoy, esHoy: true };
  const siguiente = proximoDiaConClases(horario, hoy);
  if (!siguiente) return null;
  return { sesion: siguiente.sesiones[0], dia: siguiente.dia, esHoy: false };
}

/** Laboratorios distintos donde el docente tiene una asignación vigente (para ver sus equipos). */
export function laboratoriosDelDocente(
  asignaciones: AsignacionActivaDocenteDTO[],
): { id: string; identificador: string; pabellon: string; piso: number; cursos: string[] }[] {
  const porId = new Map<
    string,
    { id: string; identificador: string; pabellon: string; piso: number; cursos: string[] }
  >();
  for (const a of asignaciones) {
    for (const e of a.espacios) {
      if (e.tipo !== 'LABORATORIO') continue;
      const curso = `${a.codigoCurso} · ${a.codigoSeccion}`;
      const previo = porId.get(e.id);
      if (previo) {
        if (!previo.cursos.includes(curso)) previo.cursos.push(curso);
      } else {
        porId.set(e.id, {
          id: e.id,
          identificador: e.identificador,
          pabellon: e.pabellon,
          piso: e.piso,
          cursos: [curso],
        });
      }
    }
  }
  return [...porId.values()].sort((a, b) =>
    a.identificador.localeCompare(b.identificador, 'es', { numeric: true }),
  );
}

/** «Pabellón A, piso 2»: ubicación legible de un espacio. */
export function ubicacionEspacio(e: { pabellon: string; piso: number }): string {
  return `${e.pabellon}, piso ${e.piso}`;
}

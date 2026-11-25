import type { DiaSemana } from '../types/consulta';
import type { AsignacionActivaDocenteDTO, CambioHistorialLaboratorioDTO } from '../types/docente';
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

/** Lista de nombres de software guardada como JSON; `null` si no se puede interpretar. */
function leerListaSoftware(valor: string | null): string[] | null {
  if (valor === null) return [];
  try {
    const lista: unknown = JSON.parse(valor);
    if (!Array.isArray(lista) || !lista.every((x) => typeof x === 'string')) return null;
    return lista.map((x) => x.trim()).filter((x) => x !== '');
  } catch {
    return null;
  }
}

function unirConY(nombres: string[]): string {
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

/**
 * Issue 7.15 — Frase de un cambio del historial de software: qué se instaló y qué se retiró,
 * sin los corchetes ni las listas completas que guarda el backend. `valorAnterior` nulo cuenta
 * como lista vacía; un valor que no se puede interpretar da un texto genérico, nunca el crudo.
 */
export function describirCambioSoftware(valorAnterior: string | null, valorNuevo: string): string {
  const antes = leerListaSoftware(valorAnterior);
  const despues = leerListaSoftware(valorNuevo);
  if (antes === null || despues === null) return 'Se actualizó el software instalado';

  const instalados = despues.filter((n) => !antes.includes(n));
  const retirados = antes.filter((n) => !despues.includes(n));
  if (instalados.length === 0 && retirados.length === 0) {
    return 'No hubo cambios en el software instalado';
  }

  const instalo = instalados.length === 1 ? 'instaló' : 'instalaron';
  const retiro = retirados.length === 1 ? 'retiró' : 'retiraron';
  if (retirados.length === 0) return `Se ${instalo} ${unirConY(instalados)}`;
  if (instalados.length === 0) return `Se ${retiro} ${unirConY(retirados)}`;
  return `Se ${instalo} ${unirConY(instalados)} y se ${retiro} ${unirConY(retirados)}`;
}

/** Issue 7.15 — Texto de una fila de «Cambios recientes» de Mi laboratorio. */
export function describirCambioLaboratorio(cambio: CambioHistorialLaboratorioDTO): string {
  if (cambio.campo === 'PCS_MALOGRADAS') {
    return `PCs inoperativas: ${cambio.valorAnterior ?? '—'} → ${cambio.valorNuevo}`;
  }
  return describirCambioSoftware(cambio.valorAnterior, cambio.valorNuevo);
}

import type { HorarioSemanalDTO, SesionDTO } from '../types/horario';
import type { FranjaFusionDTO, SolicitudLaboratorioDTO } from '../types/fusionLaboratorio';
import { DIAS_LECTIVOS, ETIQUETA_DIA, agruparClases, aMinutos, todasLasSesiones } from './horario';

/**
 * Issue 7.17 — «dictar todo en laboratorio»: qué secciones de teoría del docente se pueden juntar
 * con su laboratorio y cómo se muestran las franjas.
 */

/** Una sección de teoría del docente que tiene laboratorio en su mismo grupo. */
export interface CandidataLaboratorio {
  seccionTeoriaId: string;
  codigoCurso: string;
  nombreCurso: string;
  grupo: string;
  franjasTeoria: FranjaFusionDTO[];
  franjasLaboratorio: FranjaFusionDTO[];
}

const ORDEN_DIAS = [...DIAS_LECTIVOS, 'DOMINGO'];

function ordenarFranjas(franjas: FranjaFusionDTO[]): FranjaFusionDTO[] {
  return [...franjas].sort(
    (a, b) =>
      ORDEN_DIAS.indexOf(a.diaSemana) - ORDEN_DIAS.indexOf(b.diaSemana) ||
      aMinutos(a.horaInicio) - aMinutos(b.horaInicio),
  );
}

const aFranja = (s: SesionDTO): FranjaFusionDTO => ({
  diaSemana: s.diaSemana,
  horaInicio: s.horaInicio,
  horaFin: s.horaFin,
});

/**
 * Secciones de teoría del horario del docente que tienen un laboratorio en su grupo (p. ej. `2` y
 * `2-LAB`): son las únicas para las que tiene sentido pedir dictar todo en laboratorio.
 */
export function candidatasLaboratorio(horario: HorarioSemanalDTO): CandidataLaboratorio[] {
  return agruparClases(todasLasSesiones(horario))
    .map((g) => {
      const teoria = g.clases.filter((c) => c.tipoEspacioRequerido === 'AULA_TEORICA');
      const laboratorio = g.clases.filter((c) => c.tipoEspacioRequerido === 'LABORATORIO');
      if (teoria.length === 0 || laboratorio.length === 0) return null;
      return {
        seccionTeoriaId: teoria[0].seccionId,
        codigoCurso: g.codigoCurso,
        nombreCurso: g.nombreCurso,
        grupo: g.grupo,
        franjasTeoria: ordenarFranjas(teoria.map(aFranja)),
        franjasLaboratorio: ordenarFranjas(laboratorio.map(aFranja)),
      };
    })
    .filter((c): c is CandidataLaboratorio => c !== null)
    .sort((a, b) => a.codigoCurso.localeCompare(b.codigoCurso) || a.grupo.localeCompare(b.grupo));
}

/** «Jueves 18:00 – 20:00, Jueves 20:00 – 22:00». */
export function textoFranjas(franjas: FranjaFusionDTO[]): string {
  if (franjas.length === 0) return 'sin horario';
  return ordenarFranjas(franjas)
    .map(
      (f) => `${ETIQUETA_DIA[f.diaSemana]} ${f.horaInicio.slice(0, 5)} – ${f.horaFin.slice(0, 5)}`,
    )
    .join(', ');
}

/** «202SW0805 · Grupo 2»: cómo se nombra el curso y grupo de una solicitud. */
export function tituloSolicitudLaboratorio(s: SolicitudLaboratorioDTO): string {
  return `${s.curso.codigo} · Grupo ${s.grupo}`;
}

/** La sección de teoría ya tiene una solicitud pendiente: no se puede pedir otra. */
export function tienePendiente(seccionTeoriaId: string, solicitudes: SolicitudLaboratorioDTO[]) {
  return solicitudes.some(
    (s) => s.estado === 'PENDIENTE' && s.seccionTeoria.id === seccionTeoriaId,
  );
}

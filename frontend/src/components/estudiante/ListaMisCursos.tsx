import React from 'react';
import type { CursoMatriculadoDTO } from '../../types/horario';
import { ABREVIATURA_DIA, ETIQUETA_DIA, PALETA_CURSOS, formatearRango } from '../../utils/horario';
import type { ColorCurso } from '../../utils/horario';
import EnlaceComoLlegar from './EnlaceComoLlegar';
import { UbicacionEspacios } from './ElementosHorario';

export interface ListaMisCursosProps {
  cursos: CursoMatriculadoDTO[];
  colores: Record<string, ColorCurso>;
  className?: string;
}

/**
 * Cursos matriculados del periodo: docente, horarios, próxima clase y su espacio, o el badge
 * «Espacio pendiente de asignación» cuando aún no hay aula o laboratorio.
 */
export const ListaMisCursos: React.FC<ListaMisCursosProps> = ({
  cursos,
  colores,
  className = '',
}) => {
  const resumen =
    cursos.length === 1 ? '1 curso matriculado' : `${cursos.length} cursos matriculados`;

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <p className="m-0 text-sm font-medium text-saie-muted">{resumen}</p>

      <ul className="saie-stagger m-0 flex list-none flex-col gap-4 p-0">
        {cursos.map((curso) => {
          const color = colores[curso.codigoCurso] ?? PALETA_CURSOS[0];
          const idTitulo = `curso-${curso.codigoCurso}-${curso.codigoSeccion}`;
          const proxima = curso.proximaSesion;
          return (
            <li key={idTitulo}>
              <article
                aria-labelledby={idTitulo}
                className="saie-lift flex flex-col gap-4 rounded-2xl border border-l-[6px] border-saie-divider bg-white p-5 shadow-[0_2px_8px_rgba(34,34,34,0.08)]"
                style={{ borderLeftColor: color.borde }}
              >
                <header className="flex flex-col gap-1">
                  <h3 id={idTitulo} className="m-0 text-lg font-bold text-saie-text">
                    {curso.nombreCurso}
                  </h3>
                  <p className="m-0 text-sm text-saie-muted">
                    {`${curso.codigoCurso} · Sección ${curso.codigoSeccion} · Periodo ${curso.periodo}`}
                  </p>
                </header>

                <dl className="m-0 grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <dt className="text-xs font-medium text-saie-muted">Docente</dt>
                    <dd className="m-0 text-sm text-saie-text">
                      {curso.docenteNombre ?? 'Por asignar'}
                    </dd>
                  </div>

                  <div className="flex flex-col gap-1">
                    <dt className="text-xs font-medium text-saie-muted">Horario</dt>
                    <dd className="m-0">
                      <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                        {curso.horarios.map((h) => (
                          <li
                            key={`${h.diaSemana}-${h.horaInicio}`}
                            className="rounded-full bg-saie-canvas px-2.5 py-1 text-xs font-medium text-saie-text"
                          >
                            {`${ABREVIATURA_DIA[h.diaSemana]} ${formatearRango(h.horaInicio, h.horaFin)}`}
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>

                  <div className="flex flex-col gap-1">
                    <dt className="text-xs font-medium text-saie-muted">Próxima clase</dt>
                    <dd className="m-0 text-sm text-saie-text">
                      {proxima
                        ? `${ETIQUETA_DIA[proxima.diaSemana]}, ${formatearRango(proxima.horaInicio, proxima.horaFin)}`
                        : 'Sin próxima clase programada'}
                    </dd>
                  </div>

                  <div className="flex flex-col gap-1">
                    <dt className="text-xs font-medium text-saie-muted">Próximo espacio</dt>
                    <dd className="m-0">
                      <UbicacionEspacios
                        espacios={proxima?.espacios ?? curso.espacios}
                        estado={curso.estadoAsignacion}
                      />
                    </dd>
                  </div>
                </dl>
                <EnlaceComoLlegar
                  asignacionId={curso.asignacionId}
                  nombreCurso={curso.nombreCurso}
                />
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ListaMisCursos;

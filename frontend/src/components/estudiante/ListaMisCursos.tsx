import React from 'react';
import type { CursoMatriculadoDTO } from '../../types/horario';
import {
  ABREVIATURA_DIA,
  ETIQUETA_DIA,
  PALETA_CURSOS,
  agruparPorCurso,
  formatearRango,
} from '../../utils/horario';
import type { ColorCurso } from '../../utils/horario';
import { UbicacionEspacios } from './ElementosHorario';

export interface ListaMisCursosProps {
  cursos: CursoMatriculadoDTO[];
  colores: Record<string, ColorCurso>;
  className?: string;
}

/** Ficha de una sección (la parte concreta de un curso: su docente, su horario y su aula). */
const FichaSeccion: React.FC<{ seccion: CursoMatriculadoDTO }> = ({ seccion }) => {
  const proxima = seccion.proximaSesion;

  return (
    <li className="rounded-xl border border-saie-divider bg-saie-canvas p-4">
      <h4 className="m-0 text-sm font-bold text-saie-text">Sección {seccion.codigoSeccion}</h4>
      <dl className="m-0 mt-3 grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className="text-xs font-medium text-saie-muted">Docente</dt>
          <dd className="m-0 text-sm text-saie-text">{seccion.docenteNombre ?? 'Por asignar'}</dd>
        </div>

        <div className="flex flex-col gap-1">
          <dt className="text-xs font-medium text-saie-muted">Horario</dt>
          <dd className="m-0">
            {seccion.horarios.length === 0 ? (
              <span className="text-sm italic text-saie-muted">Horario por confirmar</span>
            ) : (
              <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
                {seccion.horarios.map((h) => (
                  <li
                    key={`${h.diaSemana}-${h.horaInicio}`}
                    className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-saie-text"
                  >
                    {`${ABREVIATURA_DIA[h.diaSemana]} ${formatearRango(h.horaInicio, h.horaFin)}`}
                  </li>
                ))}
              </ul>
            )}
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
              espacios={proxima?.espacios ?? seccion.espacios}
              estado={seccion.estadoAsignacion}
            />
          </dd>
        </div>
      </dl>
    </li>
  );
};

/**
 * Cursos matriculados del periodo. El bloque es el curso (por código), no la sección: un curso
 * con parte teórica y laboratorio se muestra como un solo curso con sus secciones dentro.
 */
export const ListaMisCursos: React.FC<ListaMisCursosProps> = ({
  cursos,
  colores,
  className = '',
}) => {
  const grupos = agruparPorCurso(cursos);
  const resumen =
    grupos.length === 1 ? '1 curso matriculado' : `${grupos.length} cursos matriculados`;

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <p className="m-0 text-sm font-medium text-saie-muted">{resumen}</p>

      <ul className="saie-stagger m-0 flex list-none flex-col gap-4 p-0">
        {grupos.map((grupo) => {
          const color = colores[grupo.codigoCurso] ?? PALETA_CURSOS[0];
          const idTitulo = `curso-${grupo.codigoCurso}`;
          const periodos = [...new Set(grupo.secciones.map((s) => s.periodo))];
          return (
            <li key={grupo.codigoCurso}>
              <article
                aria-labelledby={idTitulo}
                className="saie-lift flex flex-col gap-4 rounded-2xl border border-l-[6px] border-saie-divider bg-white p-5 shadow-saie-card"
                style={{ borderLeftColor: color.borde }}
              >
                <header className="flex flex-col gap-1">
                  <h3 id={idTitulo} className="m-0 text-lg font-bold text-saie-text">
                    {grupo.nombreCurso}
                  </h3>
                  <p className="m-0 text-sm text-saie-muted">
                    {`${grupo.codigoCurso} · ${grupo.secciones.length} ${
                      grupo.secciones.length === 1 ? 'sección' : 'secciones'
                    }${periodos.length === 1 ? ` · Periodo ${periodos[0]}` : ''}`}
                  </p>
                </header>

                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                  {grupo.secciones.map((seccion) => (
                    <FichaSeccion key={seccion.codigoSeccion} seccion={seccion} />
                  ))}
                </ul>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ListaMisCursos;

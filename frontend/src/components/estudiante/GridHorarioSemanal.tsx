import React from 'react';
import type { DiaSemana } from '../../types/consulta';
import type { HorarioSemanalDTO } from '../../types/horario';
import {
  ALTO_HORA_PX,
  DIAS_LECTIVOS,
  ETIQUETA_DIA,
  HORAS_GRILLA,
  PALETA_CURSOS,
  formatearRango,
  posicionBloque,
  resumenUbicacion,
  sesionesDeDia,
} from '../../utils/horario';
import type { ColorCurso } from '../../utils/horario';

export interface GridHorarioSemanalProps {
  horario: HorarioSemanalDTO;
  /** Color de cada curso, por código (ver `asignarColoresCursos`). */
  colores: Record<string, ColorCurso>;
  /** Día actual, para resaltar su columna. */
  hoy?: DiaSemana;
  className?: string;
}

const ALTO_TOTAL_PX = HORAS_GRILLA.length * ALTO_HORA_PX;
const COLUMNAS = 'grid grid-cols-[3.5rem_repeat(6,minmax(7rem,1fr))]';

function etiquetaHora(hora: number): string {
  return `${String(hora).padStart(2, '0')}:00`;
}

/**
 * Grilla semanal de lunes a sábado, de 08:00 a 22:00 (Guía de diseño 2.3). Cada clase es un
 * bloque con el color de su curso, su código y sección, el tipo de espacio y el aula o
 * laboratorio. En pantallas angostas la grilla se desplaza horizontalmente.
 */
export const GridHorarioSemanal: React.FC<GridHorarioSemanalProps> = ({
  horario,
  colores,
  hoy,
  className = '',
}) => {
  return (
    <section
      aria-label="Horario semanal de lunes a sábado"
      className={`overflow-x-auto rounded-xl border border-saie-divider bg-white ${className}`}
    >
      <div className="min-w-[48rem]">
        <div className={`${COLUMNAS} border-b border-saie-divider bg-saie-canvas`}>
          <div aria-hidden="true" />
          {DIAS_LECTIVOS.map((dia) => {
            const esHoy = dia === hoy;
            return (
              <div
                key={dia}
                className={`px-2 py-3 text-center text-sm ${
                  esHoy
                    ? 'border-b-4 border-saie-primary font-bold text-saie-primary'
                    : 'font-medium text-saie-text'
                }`}
              >
                <span>{ETIQUETA_DIA[dia]}</span>
                {esHoy && <span className="block text-xs font-medium">Hoy</span>}
              </div>
            );
          })}
        </div>

        <div className={COLUMNAS}>
          <div aria-hidden="true" className="relative" style={{ height: ALTO_TOTAL_PX }}>
            {HORAS_GRILLA.map((hora, i) => (
              <span
                key={hora}
                className="absolute right-2 text-xs text-saie-muted"
                style={{ top: i * ALTO_HORA_PX + 4 }}
              >
                {etiquetaHora(hora)}
              </span>
            ))}
          </div>

          {DIAS_LECTIVOS.map((dia) => (
            <section
              key={dia}
              aria-label={ETIQUETA_DIA[dia]}
              className={`relative border-l border-saie-divider ${
                dia === hoy ? 'bg-saie-primary/5' : ''
              }`}
              style={{ height: ALTO_TOTAL_PX }}
            >
              {HORAS_GRILLA.map((hora, i) => (
                <div
                  key={hora}
                  aria-hidden="true"
                  className="absolute inset-x-0 border-t border-saie-divider"
                  style={{ top: i * ALTO_HORA_PX }}
                />
              ))}

              <ul className="absolute inset-0 m-0 list-none p-0">
                {sesionesDeDia(horario, dia).map((sesion) => {
                  const { top, height } = posicionBloque(sesion.horaInicio, sesion.horaFin);
                  const color = colores[sesion.codigoCurso] ?? PALETA_CURSOS[0];
                  return (
                    <li
                      key={`${sesion.seccionId}-${sesion.horaInicio}`}
                      title={sesion.nombreCurso}
                      className="absolute inset-x-1 overflow-hidden rounded-lg border-l-4 px-2 py-1 text-saie-text shadow-[0_1px_2px_rgba(34,34,34,0.12)]"
                      style={{
                        top: `${top}%`,
                        height: `calc(${height}% - 2px)`,
                        backgroundColor: color.fondo,
                        borderLeftColor: color.borde,
                      }}
                    >
                      <p className="m-0 truncate text-xs font-bold leading-4">
                        {`${sesion.codigoCurso} · Sec. ${sesion.codigoSeccion}`}
                      </p>
                      <p className="m-0 truncate text-xs leading-4">
                        {resumenUbicacion(sesion.espacios)}
                      </p>
                      <p className="m-0 truncate text-xs leading-4 text-[#444444]">
                        {formatearRango(sesion.horaInicio, sesion.horaFin)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GridHorarioSemanal;

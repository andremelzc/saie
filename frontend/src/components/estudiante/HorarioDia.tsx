import React from 'react';
import type { DiaSemana } from '../../types/consulta';
import type { HorarioSemanalDTO } from '../../types/horario';
import {
  ABREVIATURA_DIA,
  DIAS_LECTIVOS,
  ETIQUETA_DIA,
  PALETA_CURSOS,
  estadoDeClase,
  formatearHora,
  sesionesDeDia,
} from '../../utils/horario';
import type { ColorCurso } from '../../utils/horario';
import { BadgeEstadoClase, EstadoVacio, UbicacionEspacios } from './ElementosHorario';

export interface HorarioDiaProps {
  horario: HorarioSemanalDTO;
  colores: Record<string, ColorCurso>;
  /** Día mostrado. */
  dia: DiaSemana;
  onCambiarDia: (dia: DiaSemana) => void;
  /** Día actual (para el botón «Hoy» y el estado de cada clase). */
  hoy: DiaSemana;
  /** Hora actual en minutos desde las 00:00. */
  ahoraEnMinutos: number;
  className?: string;
}

function etiquetaBotonDia(dia: DiaSemana, esHoy: boolean, cantidad: number): string {
  const partes: string[] = [ETIQUETA_DIA[dia]];
  if (esHoy) partes.push('hoy');
  partes.push(cantidad === 1 ? '1 clase' : `${cantidad} clases`);
  return partes.join(', ');
}

/**
 * Vista diaria: tira de días (lunes a sábado) y clases del día elegido en orden cronológico,
 * con la hora exacta, el docente y la ubicación (Guía de diseño 2.3).
 */
export const HorarioDia: React.FC<HorarioDiaProps> = ({
  horario,
  colores,
  dia,
  onCambiarDia,
  hoy,
  ahoraEnMinutos,
  className = '',
}) => {
  const sesiones = sesionesDeDia(horario, dia);
  const esDiaActual = dia === hoy;
  // La clase en curso, o la próxima si ninguna ha empezado, se resalta (solo para hoy).
  const indiceDestacada = esDiaActual
    ? sesiones.findIndex((s) => estadoDeClase(s, ahoraEnMinutos) !== 'FINALIZADA')
    : -1;

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <fieldset className="m-0 grid min-w-0 grid-cols-6 gap-1.5 border-0 p-0">
        <legend className="sr-only">Seleccionar día de la semana</legend>
        {DIAS_LECTIVOS.map((d) => {
          const activo = d === dia;
          const esHoy = d === hoy;
          const cantidad = (horario.dias[d] ?? []).length;
          return (
            <button
              key={d}
              type="button"
              aria-pressed={activo}
              aria-label={etiquetaBotonDia(d, esHoy, cantidad)}
              onClick={() => onCambiarDia(d)}
              className={`flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-xl border text-sm transition-colors ${
                activo
                  ? 'border-saie-primary bg-saie-primary font-bold text-white'
                  : 'border-saie-divider bg-white font-medium text-saie-text hover:bg-saie-primary/5'
              }`}
            >
              <span aria-hidden="true">{ABREVIATURA_DIA[d]}</span>
              {esHoy && (
                <span aria-hidden="true" className="text-xs font-medium">
                  Hoy
                </span>
              )}
            </button>
          );
        })}
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 font-serif text-xl font-bold text-saie-text">{ETIQUETA_DIA[dia]}</h3>
        {!esDiaActual && hoy !== 'DOMINGO' && (
          <button
            type="button"
            onClick={() => onCambiarDia(hoy)}
            className="min-h-11 cursor-pointer rounded-xl border border-saie-primary bg-white px-4 text-sm font-medium text-saie-primary hover:bg-saie-canvas"
          >
            Ir a hoy
          </button>
        )}
      </div>

      {sesiones.length === 0 ? (
        <EstadoVacio
          titulo={
            esDiaActual
              ? 'Hoy no tienes clases programadas'
              : `No tienes clases el ${ETIQUETA_DIA[dia].toLowerCase()}`
          }
          descripcion="Elige otro día de la tira superior para ver tus clases."
        />
      ) : (
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {sesiones.map((sesion, indice) => {
            const color = colores[sesion.codigoCurso] ?? PALETA_CURSOS[0];
            const estadoClase = esDiaActual ? estadoDeClase(sesion, ahoraEnMinutos) : null;
            return (
              <li
                key={`${sesion.seccionId}-${sesion.horaInicio}`}
                className={`flex gap-3 rounded-xl border border-l-4 border-saie-divider bg-white p-4 shadow-[0_2px_8px_rgba(34,34,34,0.08)] ${
                  indice === indiceDestacada ? 'ring-2 ring-saie-primary' : ''
                }`}
                style={{ borderLeftColor: color.borde }}
              >
                <div className="w-14 shrink-0 text-center">
                  <p className="m-0 text-base font-bold text-saie-text">
                    {formatearHora(sesion.horaInicio)}
                  </p>
                  <p className="m-0 text-sm text-saie-muted">{formatearHora(sesion.horaFin)}</p>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="m-0 text-base font-bold text-saie-text">{sesion.nombreCurso}</h4>
                    {estadoClase && <BadgeEstadoClase estado={estadoClase} />}
                  </div>
                  <p className="m-0 text-sm text-saie-muted">
                    {`${sesion.codigoCurso} · Sección ${sesion.codigoSeccion}`}
                  </p>
                  <p className="m-0 text-sm text-saie-text">
                    {`Docente: ${sesion.docenteNombre ?? 'Por asignar'}`}
                  </p>
                  <UbicacionEspacios espacios={sesion.espacios} estado={sesion.estadoAsignacion} />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

export default HorarioDia;

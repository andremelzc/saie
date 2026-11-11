import React, { useId } from 'react';
import { CLASE_CAMPO_MAPA, CLASE_ROTULO_MAPA, claseBotonMapa } from './controles';
import { DIAS, esFranjaValida, franjaPorDefecto, HORAS, type Franja } from './franja';

export interface FranjaMapaProps {
  /** `null` = ahora. */
  franja: Franja | null;
  onCambiar: (f: Franja | null) => void;
  className?: string;
}

/** Elige el día y la hora del mapa de ocupación, o vuelve a «ahora». */
export const FranjaMapa: React.FC<FranjaMapaProps> = ({ franja, onCambiar, className = '' }) => {
  const id = useId();
  const base = franja ?? franjaPorDefecto();
  const cambiar = (parcial: Partial<Franja>) => onCambiar({ ...base, ...parcial });
  const invalida = franja !== null && !esFranjaValida(franja);

  return (
    <fieldset className={`m-0 flex min-w-0 flex-col gap-2 border-0 p-0 ${className}`}>
      <legend className={CLASE_ROTULO_MAPA}>Día y hora</legend>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={franja === null}
          onClick={() => onCambiar(null)}
          className={claseBotonMapa(franja === null)}
        >
          Ahora
        </button>
        <label htmlFor={`${id}-dia`} className="sr-only">
          Día
        </label>
        <select
          id={`${id}-dia`}
          className={CLASE_CAMPO_MAPA}
          value={franja?.dia ?? ''}
          onChange={(e) => cambiar({ dia: e.target.value as Franja['dia'] })}
        >
          {franja === null && <option value="">Día…</option>}
          {DIAS.map((d) => (
            <option key={d.valor} value={d.valor}>
              {d.etiqueta}
            </option>
          ))}
        </select>
        <label htmlFor={`${id}-desde`} className="sr-only">
          Desde
        </label>
        <select
          id={`${id}-desde`}
          className={CLASE_CAMPO_MAPA}
          value={franja?.horaInicio ?? ''}
          onChange={(e) => cambiar({ horaInicio: e.target.value })}
        >
          {franja === null && <option value="">Desde…</option>}
          {HORAS.map((h) => (
            <option key={h}>{h}</option>
          ))}
        </select>
        <span aria-hidden="true" className="text-saie-muted">
          –
        </span>
        <label htmlFor={`${id}-hasta`} className="sr-only">
          Hasta
        </label>
        <select
          id={`${id}-hasta`}
          className={CLASE_CAMPO_MAPA}
          value={franja?.horaFin ?? ''}
          onChange={(e) => cambiar({ horaFin: e.target.value })}
        >
          {franja === null && <option value="">Hasta…</option>}
          {HORAS.map((h) => (
            <option key={h}>{h}</option>
          ))}
        </select>
      </div>
      {invalida && (
        <p role="alert" className="m-0 text-sm text-saie-danger-strong">
          La hora de inicio debe ser anterior a la de fin.
        </p>
      )}
    </fieldset>
  );
};

export default FranjaMapa;

import React from 'react';
import type { EstadoOcupacion } from '../mapa3d/tipos';
import { ESTADO_TEXTO, TIPO_TEXTO } from './etiquetas';
import {
  alternar,
  FILTRO_TODO,
  hayFiltro,
  TODOS_LOS_ESTADOS,
  TODOS_LOS_TIPOS,
  type FiltroMapa,
} from './filtros';

export interface FiltrosMapaProps {
  filtro: FiltroMapa;
  onCambiar: (f: FiltroMapa) => void;
  /** Estados que existen en este mapa (el alumno solo ve disponible y ocupado). */
  estados?: EstadoOcupacion[];
  className?: string;
}

const Chip: React.FC<{ activo: boolean; onClick: () => void; children: React.ReactNode }> = ({
  activo,
  onClick,
  children,
}) => (
  <button
    type="button"
    aria-pressed={activo}
    onClick={onClick}
    className={`min-h-9 cursor-pointer rounded-full border px-3 text-sm ${
      activo
        ? 'border-saie-primary bg-saie-primary text-white'
        : 'border-saie-divider bg-white text-saie-muted line-through'
    }`}
  >
    {children}
  </button>
);

/** Filtros por estado y tipo: lo que no se elige queda atenuado en el mapa. */
export const FiltrosMapa: React.FC<FiltrosMapaProps> = ({
  filtro,
  onCambiar,
  estados = TODOS_LOS_ESTADOS,
  className = '',
}) => (
  <fieldset className={`m-0 flex min-w-0 flex-col gap-2 border-0 p-0 ${className}`}>
    <legend className="mb-1 p-0 text-sm font-medium text-saie-text">Mostrar</legend>
    <div role="group" aria-label="Estado" className="flex flex-wrap gap-2">
      {estados.map((e) => (
        <Chip
          key={e}
          activo={filtro.estados.includes(e)}
          onClick={() => onCambiar({ ...filtro, estados: alternar(filtro.estados, e) })}
        >
          {ESTADO_TEXTO[e]}
        </Chip>
      ))}
    </div>
    <div role="group" aria-label="Tipo" className="flex flex-wrap gap-2">
      {TODOS_LOS_TIPOS.map((t) => (
        <Chip
          key={t}
          activo={filtro.tipos.includes(t)}
          onClick={() => onCambiar({ ...filtro, tipos: alternar(filtro.tipos, t) })}
        >
          {`${TIPO_TEXTO[t]}s`}
        </Chip>
      ))}
    </div>
    {hayFiltro(filtro, estados) && (
      <button
        type="button"
        onClick={() => onCambiar(FILTRO_TODO)}
        className="min-h-9 cursor-pointer self-start rounded-lg px-2 text-sm font-medium text-saie-primary hover:bg-saie-primary/5"
      >
        Mostrar todo
      </button>
    )}
  </fieldset>
);

export default FiltrosMapa;

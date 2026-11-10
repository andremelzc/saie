import React from 'react';
import { Boton } from './Boton';

export interface FiltroActivo {
  /** Identificador estable del filtro (sirve de `key`). */
  id: string;
  /** Nombre del filtro, p. ej. «Tipo de espacio». */
  etiqueta: string;
  /** Valor legible, p. ej. «Laboratorios» (nunca el código del backend). */
  valor: string;
  /** Devuelve ese filtro a su valor por defecto. */
  onQuitar: () => void;
}

export interface FiltrosActivosProps {
  /** Solo los filtros que están activos; si no hay ninguno, el componente no se muestra. */
  filtros: FiltroActivo[];
  /** Restablece todos los filtros de la pantalla. */
  onLimpiar: () => void;
  className?: string;
}

/**
 * Chips de los filtros aplicados (Issue 4.40, hallazgo DEN-04): cada uno se quita por separado y
 * «Limpiar filtros» los restablece todos. Para el lector de pantalla es un grupo con nombre, una
 * lista y botones que dicen qué filtro quitan.
 */
export const FiltrosActivos: React.FC<FiltrosActivosProps> = ({
  filtros,
  onLimpiar,
  className = '',
}) => {
  if (filtros.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Filtros activos"
      className={`flex flex-wrap items-center gap-2 saie-no-imprimir ${className}`}
    >
      <ul className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
        {filtros.map((f) => (
          <li
            key={f.id}
            className="inline-flex min-h-9 items-center gap-1 rounded-full border border-saie-divider bg-white py-0.5 pr-1 pl-3 text-sm text-saie-text"
          >
            <span>
              <span className="text-saie-muted">{f.etiqueta}:</span>{' '}
              <span className="font-semibold">{f.valor}</span>
            </span>
            <button
              type="button"
              onClick={f.onQuitar}
              aria-label={`Quitar filtro ${f.etiqueta}: ${f.valor}`}
              className="-my-2 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-lg text-saie-muted hover:bg-saie-canvas hover:text-saie-text"
            >
              <span aria-hidden="true">×</span>
            </button>
          </li>
        ))}
      </ul>
      <Boton variante="fantasma" tamano="sm" onClick={onLimpiar}>
        Limpiar filtros
      </Boton>
    </div>
  );
};

export default FiltrosActivos;

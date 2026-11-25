import React, { useId } from 'react';
import { Boton } from './Boton';

export interface PaginadorProps {
  /** Página actual, desde 1. */
  pagina: number;
  /** Filas por página. */
  tamano: number;
  /** Total de registros de toda la consulta (lo devuelve el backend). */
  total: number;
  onCambiarPagina: (pagina: number) => void;
  onCambiarTamano: (tamano: number) => void;
  /** Tamaños que se ofrecen; el backend acepta de 1 a 200. */
  opcionesTamano?: number[];
  /** Nombre accesible de la navegación, p. ej. «Paginación de secciones». */
  etiqueta?: string;
  /** Sustantivo plural para el resumen («secciones», «registros»…). */
  nombreRegistros?: string;
  className?: string;
}

const CLASE_SELECT =
  'min-h-11 rounded-xl border border-saie-border bg-white px-3 text-sm text-saie-text focus:border-saie-primary focus:outline-none focus:ring-3 focus:ring-saie-primary/20';

const formato = new Intl.NumberFormat('es-PE');

/**
 * Paginador reutilizable (Issue 4.38): resumen «Mostrando X–Y de TOTAL», anterior/siguiente,
 * salto a cualquier página y tamaño de página. Todo son controles nativos, así que se usa
 * entero con el teclado. No conoce la pantalla que lo usa: recibe y devuelve números.
 */
export const Paginador: React.FC<PaginadorProps> = ({
  pagina,
  tamano,
  total,
  onCambiarPagina,
  onCambiarTamano,
  opcionesTamano = [25, 50, 100, 200],
  etiqueta = 'Paginación',
  nombreRegistros = 'registros',
  className = '',
}) => {
  const idTamano = useId();
  const idPagina = useId();

  if (total <= 0) return null;

  const paginas = Math.max(1, Math.ceil(total / tamano));
  const actual = Math.min(Math.max(pagina, 1), paginas);
  const desde = (actual - 1) * tamano + 1;
  const hasta = Math.min(actual * tamano, total);
  const opciones = opcionesTamano.includes(tamano)
    ? opcionesTamano
    : [...opcionesTamano, tamano].sort((a, b) => a - b);

  return (
    <nav
      aria-label={etiqueta}
      className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <p className="m-0 text-sm text-saie-muted" aria-live="polite">
        Mostrando{' '}
        <strong className="font-semibold text-saie-text tabular-nums">
          {formato.format(desde)}–{formato.format(hasta)}
        </strong>{' '}
        de{' '}
        <strong className="font-semibold text-saie-text tabular-nums">
          {formato.format(total)}
        </strong>{' '}
        {nombreRegistros}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor={idTamano} className="flex items-center gap-2 text-sm text-saie-text">
          Por página
          <select
            id={idTamano}
            value={tamano}
            onChange={(e) => onCambiarTamano(Number(e.target.value))}
            className={CLASE_SELECT}
          >
            {opciones.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <Boton
            variante="secundario"
            tamano="sm"
            onClick={() => onCambiarPagina(actual - 1)}
            disabled={actual <= 1}
            aria-label="Página anterior"
          >
            Anterior
          </Boton>
          <label htmlFor={idPagina} className="flex items-center gap-2 text-sm text-saie-text">
            <span className="sr-only">Ir a la página</span>
            <select
              id={idPagina}
              value={actual}
              onChange={(e) => onCambiarPagina(Number(e.target.value))}
              className={CLASE_SELECT}
              disabled={paginas === 1}
            >
              {Array.from({ length: paginas }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <span className="text-sm text-saie-text tabular-nums">de {formato.format(paginas)}</span>
          <Boton
            variante="secundario"
            tamano="sm"
            onClick={() => onCambiarPagina(actual + 1)}
            disabled={actual >= paginas}
            aria-label="Página siguiente"
          >
            Siguiente
          </Boton>
        </div>
      </div>
    </nav>
  );
};

export default Paginador;

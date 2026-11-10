import React from 'react';
import { PERIODO_TODOS, type PeriodoFiltro } from '../../hooks/usePeriodoFiltro';
import { Campo } from '../ui/Campo';
import { CLASE_CAMPO } from '../ui/campos';

export interface SelectorPeriodoProps {
  filtro: PeriodoFiltro;
  /** Ofrece «Todos los periodos» (el historial; en secciones e informe siempre hay uno). */
  permitirTodos?: boolean;
  className?: string;
}

/**
 * Lista de periodos con el vigente preseleccionado (Issue 4.43). Sustituye al campo de texto: ya
 * no se puede enviar un periodo mal escrito ni uno que no existe.
 */
export const SelectorPeriodo: React.FC<SelectorPeriodoProps> = ({
  filtro,
  permitirTodos = false,
  className = '',
}) => {
  const sinPeriodos = filtro.periodos.length === 0;
  return (
    <Campo
      etiqueta="Periodo"
      className={className}
      ayuda={filtro.todos ? 'Se muestran los registros de todos los periodos.' : undefined}
    >
      <select
        value={filtro.valor}
        onChange={(e) => filtro.elegir(e.target.value)}
        disabled={!filtro.listo || (sinPeriodos && !permitirTodos)}
        className={CLASE_CAMPO}
      >
        {permitirTodos && <option value={PERIODO_TODOS}>Todos los periodos</option>}
        {sinPeriodos && !permitirTodos && <option value="">Sin periodos</option>}
        {filtro.periodos.map((p) => (
          <option key={p} value={p}>
            {p === filtro.vigente ? `${p} (vigente)` : p}
          </option>
        ))}
      </select>
    </Campo>
  );
};

export default SelectorPeriodo;

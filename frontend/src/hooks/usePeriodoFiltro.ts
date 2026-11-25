import { useCarga } from './useCarga';
import { useState } from 'react';
import { obtenerPeriodos } from '../services/admin';

/** Valor del selector que significa «sin filtrar por periodo» (solo en el historial). */
export const PERIODO_TODOS = '__todos__';

export interface PeriodoFiltro {
  /** Periodo a pedir al servidor; `''` si no se filtra por periodo. */
  periodo: string;
  /** Ya se sabe cuál es el vigente (o la consulta falló): se puede pedir el listado. */
  listo: boolean;
  vigente: string | null;
  periodos: string[];
  /** Lo que muestra el selector. */
  valor: string;
  elegir: (valor: string) => void;
  /** Se eligió «todos los periodos». */
  todos: boolean;
  /** El filtro se aparta de su valor por defecto (el vigente). */
  cambiado: boolean;
  /** Vuelve al periodo vigente. */
  restablecer: () => void;
  error: string | null;
}

/**
 * Filtro de periodo de las pantallas del panel (Issue 4.43): el vigente viene preseleccionado y la
 * persona solo puede elegir uno de los que existen (`GET /api/v1/admin/periodos`), así que no hay
 * texto libre que se pueda escribir mal. La lista se pide una vez y se comparte por la caché breve.
 */
export function usePeriodoFiltro(): PeriodoFiltro {
  const { datos, cargando, error } = useCarga(obtenerPeriodos, { clave: 'periodos' });
  // `null` = el vigente. Solo se guarda lo que la persona cambia.
  const [elegido, setElegido] = useState<string | null>(null);

  const vigente = datos?.vigente ?? null;
  const efectivo = elegido ?? vigente ?? '';
  const todos = efectivo === PERIODO_TODOS;

  return {
    periodo: todos ? '' : efectivo,
    listo: !cargando,
    vigente,
    periodos: datos?.periodos ?? [],
    valor: efectivo,
    elegir: (valor) => setElegido(valor === vigente ? null : valor),
    todos,
    cambiado: elegido !== null && elegido !== vigente,
    restablecer: () => setElegido(null),
    error,
  };
}

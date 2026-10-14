import { useCallback, useEffect, useState } from 'react';
import { mensajeDeError } from '../services/estudiante';

export interface EstadoCarga<T> {
  datos: T | null;
  cargando: boolean;
  error: string | null;
  recargar: () => void;
}

interface ResultadoCarga<T> {
  /** Petición a la que corresponde este resultado. */
  cargador: () => Promise<T>;
  intento: number;
  datos: T | null;
  error: string | null;
}

/**
 * Ejecuta `cargador` al montar (y cada vez que se llama a `recargar`) y expone su estado.
 * `cargador` debe ser estable (función de módulo o `useCallback`).
 */
export function useCarga<T>(cargador: () => Promise<T>): EstadoCarga<T> {
  const [intento, setIntento] = useState(0);
  const [resultado, setResultado] = useState<ResultadoCarga<T> | null>(null);

  useEffect(() => {
    // Si el efecto se vuelve a ejecutar o el componente se desmonta, se ignora la petición en vuelo.
    let vigente = true;

    cargador()
      .then((datos) => {
        if (vigente) setResultado({ cargador, intento, datos, error: null });
      })
      .catch((e: unknown) => {
        if (vigente) {
          setResultado((previo) => ({
            cargador,
            intento,
            datos: previo?.datos ?? null,
            error: mensajeDeError(e),
          }));
        }
      });

    return () => {
      vigente = false;
    };
  }, [cargador, intento]);

  // Está cargando mientras el último resultado no corresponda a la petición actual.
  const cargando =
    resultado === null || resultado.cargador !== cargador || resultado.intento !== intento;

  const recargar = useCallback(() => setIntento((n) => n + 1), []);

  return {
    datos: resultado?.datos ?? null,
    cargando,
    error: cargando ? null : (resultado?.error ?? null),
    recargar,
  };
}

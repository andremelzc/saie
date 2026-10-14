import { useCallback, useEffect, useRef, useState } from 'react';
import { mensajeDeError } from '../services/estudiante';

export interface EstadoCarga<T> {
  datos: T | null;
  cargando: boolean;
  error: string | null;
  recargar: () => void;
}

/**
 * Ejecuta `cargador` al montar (y cada vez que se llama a `recargar`) y expone su estado.
 * `cargador` debe ser estable (función de módulo o `useCallback`).
 */
export function useCarga<T>(cargador: () => Promise<T>): EstadoCarga<T> {
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const ultimo = useRef(0);

  useEffect(() => {
    const idPeticion = ++ultimo.current;
    setCargando(true);
    setError(null);
    cargador()
      .then((resultado) => {
        if (idPeticion === ultimo.current) setDatos(resultado);
      })
      .catch((e: unknown) => {
        if (idPeticion === ultimo.current) setError(mensajeDeError(e));
      })
      .finally(() => {
        if (idPeticion === ultimo.current) setCargando(false);
      });
    return () => {
      // Invalida la petición en vuelo si el componente se desmonta o se recarga.
      ultimo.current++;
    };
  }, [cargador, intento]);

  const recargar = useCallback(() => setIntento((n) => n + 1), []);

  return { datos, cargando, error, recargar };
}

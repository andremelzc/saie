import { useCallback, useContext, useRef, useState } from 'react';
import { ContextoAvisos } from '../components/ui/avisosContexto';
import { esTiempoAgotado, estadoHttp, mensajeDeError } from '../services/errores';

export interface OpcionesAccion<T> {
  /** Aviso de éxito al terminar; puede calcularse a partir del resultado. */
  exito?: string | ((resultado: T) => string);
  /**
   * Muestra el error como aviso (región viva `assertive`). Es lo normal; ponlo en `false` solo
   * si la pantalla ya muestra `error` en línea y un segundo aviso sería ruido.
   */
  avisarError?: boolean;
}

export type ResultadoAccion<T> =
  | { ok: true; valor: T }
  | {
      ok: false;
      error: string;
      /** Se agotó el tiempo de espera: la operación pudo completarse en el servidor. */
      tiempoAgotado: boolean;
      /** Estado HTTP de la respuesta, si la hubo (p. ej. 409 con una corrida en curso). */
      estado?: number;
    };

export interface EstadoAccion {
  /** Hay una acción en curso. Un segundo `ejecutar` mientras tanto se ignora. */
  cargando: boolean;
  /** Mensaje legible del último fallo, para mostrarlo en línea; null si no hay. */
  error: string | null;
  limpiarError: () => void;
  ejecutar: <T>(
    accion: () => Promise<T>,
    opciones?: OpcionesAccion<T>,
  ) => Promise<ResultadoAccion<T> | null>;
}

/**
 * Ejecuta una acción asíncrona del usuario (guardar, resolver, reintentar) con el mismo
 * comportamiento en todo el sistema (Issue 3.51): gestiona `cargando`, traduce el error con la
 * política de `mensajeDeError` (un 400 explica la causa; «Revisa tu conexión» solo si no hubo
 * respuesta), avisa el éxito o el error y deja el error disponible para mostrarlo en línea.
 *
 * Devuelve `null` si la ignoró porque ya había otra en curso, para que un doble clic no lance dos
 * peticiones.
 */
export function useAccion(): EstadoAccion {
  // Sin proveedor de avisos (p. ej. en una prueba aislada) la acción funciona igual, sin avisos.
  const mostrar = useContext(ContextoAvisos)?.mostrar;
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enCurso = useRef(false);

  const limpiarError = useCallback(() => setError(null), []);

  const ejecutar = useCallback(
    async <T>(
      accion: () => Promise<T>,
      opciones: OpcionesAccion<T> = {},
    ): Promise<ResultadoAccion<T> | null> => {
      if (enCurso.current) return null;
      enCurso.current = true;
      setCargando(true);
      setError(null);
      try {
        const valor = await accion();
        const { exito } = opciones;
        if (exito) mostrar?.('exito', typeof exito === 'function' ? exito(valor) : exito);
        return { ok: true, valor };
      } catch (e: unknown) {
        const mensaje = mensajeDeError(e);
        setError(mensaje);
        if (opciones.avisarError !== false) mostrar?.('error', mensaje);
        return {
          ok: false,
          error: mensaje,
          tiempoAgotado: esTiempoAgotado(e),
          estado: estadoHttp(e),
        };
      } finally {
        enCurso.current = false;
        setCargando(false);
      }
    },
    [mostrar],
  );

  return { cargando, error, limpiarError, ejecutar };
}

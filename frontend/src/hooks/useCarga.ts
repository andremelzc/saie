import { useCallback, useEffect, useState } from 'react';
import { mensajeDeError } from '../services/estudiante';

export interface EstadoCarga<T> {
  datos: T | null;
  cargando: boolean;
  error: string | null;
  recargar: () => void;
}

export interface OpcionesCarga {
  /**
   * Identifica la consulta en la caché breve (incluye los filtros: `secciones:bases|TODOS|`). Con
   * clave, volver a una pantalla muestra al instante los datos de la última visita mientras se
   * revalidan (stale-while-revalidate, Issue 3.49). Sin clave no hay caché.
   */
  clave?: string;
  /** `false` aplaza la carga (p. ej. datos que solo hacen falta al abrir un panel). */
  habilitado?: boolean;
}

interface ResultadoCarga<T> {
  /** Petición a la que corresponde este resultado (`null` si viene de la caché). */
  cargador: (() => Promise<T>) | null;
  intento: number;
  datos: T | null;
  error: string | null;
}

/** Cuánto vale un dato en caché: lo bastante para volver a una pantalla, no para quedarse viejo. */
const VIGENCIA_CACHE_MS = 5 * 60 * 1000;

const cache = new Map<string, { datos: unknown; momento: number }>();

function leerCache<T>(clave: string | undefined): T | null {
  if (!clave) return null;
  const entrada = cache.get(clave);
  if (!entrada) return null;
  if (Date.now() - entrada.momento > VIGENCIA_CACHE_MS) {
    cache.delete(clave);
    return null;
  }
  return entrada.datos as T;
}

/** Vacía la caché: al iniciar o cerrar sesión, para no mostrar datos de otra cuenta. */
export function vaciarCacheCarga(): void {
  cache.clear();
}

/** Olvida las consultas cuya clave empieza por `prefijo` (tras una acción que las deja viejas). */
export function invalidarCacheCarga(prefijo: string): void {
  for (const clave of [...cache.keys()]) {
    if (clave.startsWith(prefijo)) cache.delete(clave);
  }
}

/**
 * Ejecuta `cargador` al montar (y cada vez que se llama a `recargar`) y expone su estado.
 * `cargador` debe ser estable (función de módulo o `useCallback`).
 *
 * Con `opciones.clave`, los datos de la última visita se muestran de inmediato y se revalidan:
 * `cargando` es verdadero mientras tanto, pero `datos` ya trae lo anterior, así que la pantalla
 * puede atenuarlo («Actualizando…») en lugar de vaciarse.
 */
export function useCarga<T>(
  cargador: () => Promise<T>,
  opciones: OpcionesCarga = {},
): EstadoCarga<T> {
  const { clave, habilitado = true } = opciones;
  const [intento, setIntento] = useState(0);
  const [resultado, setResultado] = useState<ResultadoCarga<T> | null>(null);

  useEffect(() => {
    if (!habilitado) return;
    // Si el efecto se vuelve a ejecutar o el componente se desmonta, se ignora la petición en vuelo.
    let vigente = true;

    cargador()
      .then((datos) => {
        if (!vigente) return;
        if (clave) cache.set(clave, { datos, momento: Date.now() });
        setResultado({ cargador, intento, datos, error: null });
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
  }, [cargador, intento, clave, habilitado]);

  // Está cargando mientras el último resultado no corresponda a la petición actual.
  const actual =
    resultado !== null && resultado.cargador === cargador && resultado.intento === intento;
  const cargando = habilitado && !actual;

  // Mientras llega la respuesta se muestra lo de la caché para esta consulta; si no hay, lo último
  // que se vio (así un cambio de filtro conserva la lista anterior en vez de vaciarla).
  const enCache = leerCache<T>(clave);
  const datos = actual && resultado ? resultado.datos : (enCache ?? resultado?.datos ?? null);

  const recargar = useCallback(() => setIntento((n) => n + 1), []);

  return {
    datos,
    cargando,
    error: cargando ? null : (resultado?.error ?? null),
    recargar,
  };
}

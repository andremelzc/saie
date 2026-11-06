import { useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

/** Marca, en el estado de la entrada de historial, que el panel se abrió desde la lista. */
const ESTADO_ABIERTO_DESDE_LISTA = { detalleEnUrl: true };

function abiertoDesdeLista(estado: unknown): boolean {
  return (
    typeof estado === 'object' &&
    estado !== null &&
    (estado as typeof ESTADO_ABIERTO_DESDE_LISTA).detalleEnUrl === true
  );
}

export interface DetalleEnUrl {
  /** Valor del parámetro (p. ej. el código del espacio), o null si el panel está cerrado. */
  valor: string | null;
  /** Abre el panel: añade el parámetro con una entrada nueva de historial, así «Atrás» lo cierra. */
  abrir: (valor: string) => void;
  /** Cambia el valor sin crear una entrada nueva (p. ej. si el código del espacio se edita). */
  reemplazar: (valor: string) => void;
  /** Cierra el panel: vuelve atrás si se abrió desde la lista; si no, quita el parámetro. */
  cerrar: () => void;
}

/**
 * Sincroniza un panel de detalle (drawer) con un parámetro de consulta (Issue 4.51): el botón
 * «Atrás» del navegador o del móvil cierra el panel en lugar de salir de la pantalla, y un
 * enlace con el parámetro abre el detalle al cargar o recargar la página.
 */
export function useDetalleEnUrl(nombre: string): DetalleEnUrl {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const valor = params.get(nombre);

  const abrir = useCallback(
    (nuevo: string) => {
      const siguiente = new URLSearchParams(params);
      siguiente.set(nombre, nuevo);
      setParams(siguiente, { state: ESTADO_ABIERTO_DESDE_LISTA });
    },
    [nombre, params, setParams],
  );

  const reemplazar = useCallback(
    (nuevo: string) => {
      const siguiente = new URLSearchParams(params);
      siguiente.set(nombre, nuevo);
      setParams(siguiente, { replace: true, state: location.state });
    },
    [location.state, nombre, params, setParams],
  );

  const cerrar = useCallback(() => {
    if (abiertoDesdeLista(location.state)) {
      void navigate(-1);
      return;
    }
    const siguiente = new URLSearchParams(params);
    siguiente.delete(nombre);
    setParams(siguiente, { replace: true });
  }, [location.state, navigate, nombre, params, setParams]);

  return { valor, abrir, reemplazar, cerrar };
}

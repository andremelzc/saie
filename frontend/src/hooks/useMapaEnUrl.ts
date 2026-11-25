import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { leerFranja, type Franja } from '../components/mapa2d/franja';

export type VistaUrl = '2d' | '3d';
export type PisoUrl = number | 'todos';

export interface MapaEnUrl {
  vista: VistaUrl;
  setVista: (v: VistaUrl) => void;
  piso: PisoUrl | undefined;
  setPiso: (p: PisoUrl) => void;
  espacio: string | null;
  setEspacio: (id: string | null) => void;
  franja: Franja | null;
  setFranja: (f: Franja | null) => void;
}

/**
 * Guarda el estado del mapa en la URL (`?vista=3d&piso=2&espacio=NUE-204&dia=LUNES&desde=08:00&hasta=10:00`):
 * se puede compartir el enlace, recargar sin perder el sitio y el botón «Atrás» no se llena de
 * pasos intermedios (los cambios reemplazan la entrada del historial). Lo que vale por defecto
 * (plano 2D, ahora) no se escribe.
 */
export function useMapaEnUrl(): MapaEnUrl {
  const [params, setParams] = useSearchParams();

  const cambiar = useCallback(
    (cambios: Record<string, string | null>) =>
      setParams(
        (previos) => {
          const siguientes = new URLSearchParams(previos);
          for (const [clave, valor] of Object.entries(cambios)) {
            if (valor === null) siguientes.delete(clave);
            else siguientes.set(clave, valor);
          }
          return siguientes;
        },
        { replace: true },
      ),
    [setParams],
  );

  const pisoTexto = params.get('piso');
  const piso: PisoUrl | undefined =
    pisoTexto === 'todos'
      ? 'todos'
      : pisoTexto !== null && Number.isInteger(Number(pisoTexto)) && Number(pisoTexto) > 0
        ? Number(pisoTexto)
        : undefined;
  const dia = params.get('dia');
  const desde = params.get('desde');
  const hasta = params.get('hasta');
  const franja = useMemo(() => leerFranja(dia, desde, hasta), [dia, desde, hasta]);

  return {
    vista: params.get('vista') === '3d' ? '3d' : '2d',
    setVista: (v) => cambiar({ vista: v === '3d' ? '3d' : null }),
    piso,
    setPiso: (p) => cambiar({ piso: String(p) }),
    espacio: params.get('espacio'),
    setEspacio: (id) => cambiar({ espacio: id }),
    franja,
    setFranja: (f) =>
      cambiar(
        f
          ? { dia: f.dia, desde: f.horaInicio, hasta: f.horaFin }
          : { dia: null, desde: null, hasta: null },
      ),
  };
}

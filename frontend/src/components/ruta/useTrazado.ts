import { useEffect, useState } from 'react';
import type { RutaReferencia } from './tipos';
import { calcularTrazado, type OrigenRuta, type Trazado } from './trazado';

/**
 * El trazado de una ruta, calculado después de pintar: así la pantalla puede mostrar «Calculando…»
 * mientras se resuelve, en vez de quedarse congelada con la ruta anterior. `calculando` es verdadero
 * desde que cambia la ruta o el punto de partida hasta que el trazado nuevo está listo; nunca se
 * entrega un trazado que no corresponda a lo pedido.
 */
export function useTrazado(
  ruta: RutaReferencia | null,
  planos: Record<number, string>,
  origen: OrigenRuta,
): { trazado: Trazado | null; calculando: boolean } {
  const [listo, setListo] = useState<{
    ruta: RutaReferencia | null;
    planos: Record<number, string>;
    origen: OrigenRuta;
    trazado: Trazado | null;
  } | null>(null);

  useEffect(() => {
    if (!ruta) return undefined;
    let vigente = true;
    // Un respiro para que el navegador pinte el estado de carga antes del cálculo.
    const temporizador = setTimeout(() => {
      const trazado = calcularTrazado(ruta, planos, origen);
      if (vigente) setListo({ ruta, planos, origen, trazado });
    }, 30);
    return () => {
      vigente = false;
      clearTimeout(temporizador);
    };
  }, [ruta, planos, origen]);

  const corresponde =
    listo !== null && listo.ruta === ruta && listo.planos === planos && listo.origen === origen;
  return {
    trazado: corresponde ? listo.trazado : null,
    calculando: ruta !== null && !corresponde,
  };
}

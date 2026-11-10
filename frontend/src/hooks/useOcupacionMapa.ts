import { useCallback } from 'react';
import type { ResultadoOcupacion } from '../components/mapa2d/enlacePlano';
import type { Franja } from '../components/mapa2d/franja';
import { cargarOcupacionEdificio, type PedirOcupacion } from '../components/mapa2d/ocupacionReal';
import { useCarga, type EstadoCarga } from './useCarga';

/**
 * Ocupación real del edificio para el mapa, en la franja elegida (`null` es «ahora»). `pedir` debe
 * ser estable (una función de módulo) y `origen` distingue la caché del alumno de la del panel.
 */
export function useOcupacionMapa(
  pedir: PedirOcupacion,
  origen: 'alumno' | 'admin',
  franja: Franja | null,
): EstadoCarga<ResultadoOcupacion> {
  const cargador = useCallback(() => cargarOcupacionEdificio(pedir, franja), [pedir, franja]);
  const clave = `mapa:${origen}:${franja ? `${franja.dia}|${franja.horaInicio}|${franja.horaFin}` : 'ahora'}`;
  return useCarga(cargador, { clave });
}

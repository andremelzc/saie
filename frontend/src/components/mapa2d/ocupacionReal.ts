import {
  crearEnlacePlano,
  espaciosDesdeOcupacion,
  PABELLONES_BD,
  type EnlacePlano,
  type MapaOcupacionEntrada,
  type ResultadoOcupacion,
} from './enlacePlano';
import type { Franja } from './franja';
import { PLANOS_SVG } from './planos';

/** Enlace de la BD con los planos que se empaquetan con la aplicación. */
export const ENLACE_PLANOS: EnlacePlano = crearEnlacePlano(PLANOS_SVG);

/** Pide la ocupación de un piso de un pabellón (la del alumno o la del panel). */
export type PedirOcupacion = (
  pabellon: string,
  piso: number,
  franja: Franja | null,
) => Promise<MapaOcupacionEntrada>;

/**
 * Ocupación de todo el edificio: el endpoint responde por pabellón y piso, y el mapa muestra los
 * dos pabellones de cada piso, así que se piden todas las combinaciones y se juntan. Los espacios
 * ya salen con el id de su figura del plano.
 */
export async function cargarOcupacionEdificio(
  pedir: PedirOcupacion,
  franja: Franja | null,
  enlace: EnlacePlano = ENLACE_PLANOS,
  pisos: number[] = Object.keys(PLANOS_SVG).map(Number),
): Promise<ResultadoOcupacion> {
  const consultas = PABELLONES_BD.flatMap((pabellon) =>
    pisos.map((piso) => pedir(pabellon, piso, franja)),
  );
  const respuestas = await Promise.all(consultas);
  const unido: ResultadoOcupacion = { espacios: [], sinFigura: [], deshabilitados: [] };
  for (const dto of respuestas) {
    const r = espaciosDesdeOcupacion(dto, enlace);
    unido.espacios.push(...r.espacios);
    unido.sinFigura.push(...r.sinFigura);
    unido.deshabilitados.push(...r.deshabilitados);
  }
  return unido;
}

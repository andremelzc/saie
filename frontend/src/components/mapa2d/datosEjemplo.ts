import type { EstadoOcupacion } from '../mapa3d/tipos';
import type { EspacioMapa2D } from './etiquetas';
import { leerPlano2D, pabellonDe } from './plano';

const CICLO: EstadoOcupacion[] = [
  'DISPONIBLE',
  'OCUPADO',
  'OCUPADO',
  'ALERTA_ACTIVA',
  'DISPONIBLE',
];
const CICLO_SIN_ALERTAS: EstadoOcupacion[] = ['DISPONIBLE', 'OCUPADO', 'OCUPADO', 'DISPONIBLE'];

/**
 * Datos de ejemplo del mapa (Issues 4.13 y 3.18: se construye sin depender del backend). Toma
 * cada aula y laboratorio del plano y le reparte un estado de forma determinista. Se sustituye
 * por los datos reales al conectar el mapa con el endpoint de ocupación (Issues 4.14 y 3.20).
 */
export function espaciosDeEjemplo(
  planos: Record<number, string>,
  opciones: { conAlertas?: boolean } = {},
): EspacioMapa2D[] {
  const ciclo = opciones.conAlertas === false ? CICLO_SIN_ALERTAS : CICLO;
  const salida: EspacioMapa2D[] = [];
  let n = 0;
  for (const [piso, texto] of Object.entries(planos)) {
    for (const f of leerPlano2D(texto).figuras) {
      if (f.clase !== 'aula' && f.clase !== 'laboratorio') continue;
      if (pabellonDe(f.id) === null) continue;
      const estado = ciclo[n % ciclo.length];
      const laboratorio = f.clase === 'laboratorio';
      salida.push({
        id: f.id,
        nombre: f.nombre || f.id,
        tipo: laboratorio ? 'LABORATORIO' : 'AULA_TEORICA',
        estado,
        piso: Number(piso),
        aforo: laboratorio ? 24 : 40,
        detalle:
          estado === 'OCUPADO'
            ? 'Sección de ejemplo en curso'
            : estado === 'ALERTA_ACTIVA'
              ? 'Alerta de ejemplo: capacidad insuficiente'
              : undefined,
      });
      n += 1;
    }
  }
  return salida;
}

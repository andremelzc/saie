import type { Pabellon } from '../mapa2d/plano';
import { PABELLON_TEXTO } from '../mapa2d/etiquetas';
import type { RutaReferencia, TramoRuta } from './tipos';

/** Mismas constantes que `TIEMPO_CAMINATA_CONFIG` del backend (`rutaReferencia.service.ts`). */
export const TIEMPOS = {
  entrada: 45,
  porPisoEscalera: 60,
  porPisoAscensor: 50,
  transito: 30,
  entreContiguos: 15,
} as const;

export interface AsignacionEjemplo {
  id: string;
  /** Texto del selector. */
  etiqueta: string;
  /** Ids de plano de los espacios (varios si es un bloque de salas contiguas); vacío = sin aula. */
  espacios: { id: string; nombre: string; laboratorio?: boolean }[];
  piso: number;
  pabellon: Pabellon;
}

export const ASIGNACIONES_EJEMPLO: AsignacionEjemplo[] = [
  {
    id: 'ej-nue-204',
    etiqueta: 'Aula 204 · Pabellón nuevo, piso 2',
    espacios: [{ id: 'NUE-204', nombre: 'Aula 204' }],
    piso: 2,
    pabellon: 'NUE',
  },
  {
    id: 'ej-ant-104',
    etiqueta: 'Laboratorio 08 (aula 104) · Pabellón antiguo, piso 1',
    espacios: [{ id: 'ANT-104', nombre: 'Aula 104 - Laboratorio 08', laboratorio: true }],
    piso: 1,
    pabellon: 'ANT',
  },
  {
    id: 'ej-ant-301-302',
    etiqueta: 'Aulas 301 y 302 (bloque) · Pabellón antiguo, piso 3',
    espacios: [
      { id: 'ANT-301', nombre: 'Aula 301' },
      { id: 'ANT-302', nombre: 'Aula 302' },
    ],
    piso: 3,
    pabellon: 'ANT',
  },
  {
    id: 'ej-sin-aula',
    etiqueta: 'Clase sin aula registrada',
    espacios: [],
    piso: 0,
    pabellon: 'NUE',
  },
];

/**
 * Ruta de ejemplo con la misma forma y las mismas reglas que `calcularRutaReferencia` del
 * backend: entrada del pabellón, cambio de piso (ascensor si hay movilidad reducida) y una sala
 * por tramo. Se sustituye por la respuesta real al conectar la pantalla (Issue 3.20).
 */
export function rutaDeEjemplo(a: AsignacionEjemplo, movilidadReducida: boolean): RutaReferencia {
  if (a.espacios.length === 0) {
    return {
      asignacionId: a.id,
      estado: 'RUTA_NO_DISPONIBLE',
      mensaje: 'La asignación no cuenta con espacios registrados.',
      tiempoEstimadoTotalSegundos: 0,
      tramos: [],
      movilidadReducida,
    };
  }
  const pabellon = PABELLON_TEXTO[a.pabellon];
  const tramos: TramoRuta[] = [];
  let total = 0;
  let orden = 1;

  total += TIEMPOS.entrada;
  tramos.push({
    orden: orden++,
    tipo: 'ENTRADA_PABELLON',
    titulo: `Acceso principal — ${pabellon}`,
    descripcion: `Ingresar por la puerta principal del ${pabellon} (piso 1) hacia el vestíbulo central.`,
    tiempoEstimadoSegundos: TIEMPOS.entrada,
    esAccesible: true,
    pabellon,
    piso: 1,
  });

  if (a.piso > 1) {
    const pisos = a.piso - 1;
    const tiempo = pisos * (movilidadReducida ? TIEMPOS.porPisoAscensor : TIEMPOS.porPisoEscalera);
    total += tiempo;
    tramos.push({
      orden: orden++,
      tipo: 'CAMBIO_PISO',
      titulo: `Subida al piso ${a.piso} vía ${movilidadReducida ? 'ascensor accesible' : 'escaleras principales'}`,
      descripcion: movilidadReducida
        ? `Tomar el ascensor accesible ubicado en el hall principal hasta el piso ${a.piso}.`
        : `Subir por las escaleras principales del ${pabellon} hasta alcanzar el piso ${a.piso}.`,
      tiempoEstimadoSegundos: tiempo,
      esAccesible: movilidadReducida,
      pabellon,
      piso: a.piso,
    });
  }

  a.espacios.forEach((e, i) => {
    const tiempo = i === 0 ? TIEMPOS.transito : TIEMPOS.entreContiguos;
    total += tiempo;
    tramos.push({
      orden: orden++,
      tipo: 'ESPACIO_ASIGNADO',
      titulo: `${e.laboratorio ? 'Laboratorio' : 'Aula'}: ${e.nombre}`,
      descripcion:
        a.espacios.length > 1
          ? i === 0
            ? `Desplazarse por el pasillo del piso ${a.piso} hasta la primera sala del bloque asignado: ${e.nombre}.`
            : `Acceder a la sala contigua del bloque: ${e.nombre} (puerta con puerta).`
          : `Desplazarse por el pasillo del piso ${a.piso} hasta la entrada de ${e.nombre}.`,
      tiempoEstimadoSegundos: tiempo,
      esAccesible: true,
      espacioId: e.id,
      identificador: e.id.split('-').slice(1).join('-'),
      tipoEspacio: e.laboratorio ? 'LABORATORIO' : 'AULA_TEORICA',
      pabellon,
      piso: a.piso,
    });
  });

  return {
    asignacionId: a.id,
    estado: 'DISPONIBLE',
    pabellon,
    pisoDestino: a.piso,
    tiempoEstimadoTotalSegundos: total,
    tramos,
    movilidadReducida,
  };
}

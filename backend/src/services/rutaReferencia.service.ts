import { TipoEspacio } from '@prisma/client';
import { GrafoContiguedad, obtenerEspaciosContiguos } from './contiguedad.service';
import { RutaReferenciaDTO, TramoRutaDTO } from '../types/ruta';

/**
 * Constantes de configuración de tiempos estimados de caminata (en segundos).
 */
export const TIEMPO_CAMINATA_CONFIG = {
  /** Tiempo base de ingreso desde la entrada del pabellón al hall principal */
  TIEMPO_BASE_ENTRADA_SEGUNDOS: 45,
  /** Tiempo por cada piso que se debe subir (por ejemplo vía escaleras) */
  TIEMPO_POR_PISO_ESCALERA_SEGUNDOS: 60,
  /** Tiempo por cada piso usando ascensor (incluye espera y desplazamiento) */
  TIEMPO_POR_PISO_ASCENSOR_SEGUNDOS: 50,
  /** Tiempo estimado de tránsito hacia el primer espacio asignado en el piso */
  TIEMPO_TRANSITO_PISO_SEGUNDOS: 30,
  /** Tiempo adicional de desplazamiento entre espacios contiguos del mismo bloque */
  TIEMPO_ENTRE_ESPACIOS_CONTIGUOS_SEGUNDOS: 15,
};

export interface EspacioParaRuta {
  id: string;
  identificador?: string | null;
  pabellon?: string | null;
  piso?: number | null;
  tipo?: TipoEspacio | null;
}

export interface CalcularRutaInput {
  asignacionId?: string;
  espacios: EspacioParaRuta[];
  grafoContiguedad?: GrafoContiguedad;
  movilidadReducida?: boolean;
}

/**
 * Ordena los espacios de un bloque usando la función de contigüidad pura del Issue 2.3
 * (`obtenerEspaciosContiguos`).
 * Si no hay grafo o solo hay un espacio, los devuelve ordenados de forma determinista por identificador.
 */
export function ordenarEspaciosPorContiguedad(
  espacios: EspacioParaRuta[],
  grafo?: GrafoContiguedad,
): EspacioParaRuta[] {
  if (espacios.length <= 1) {
    return [...espacios];
  }

  // Si no tenemos grafo de contigüidad provisto, ordenamos por identificador
  if (!grafo) {
    return [...espacios].sort((a, b) =>
      (a.identificador || '').localeCompare(b.identificador || ''),
    );
  }

  const espacioMap = new Map<string, EspacioParaRuta>();
  for (const esp of espacios) {
    espacioMap.set(esp.id, esp);
  }

  // Seleccionar espacio inicial: aquel con identificador menor o de menor grado dentro del bloque
  const candidatos = [...espacios].sort((a, b) =>
    (a.identificador || '').localeCompare(b.identificador || ''),
  );

  const visitados = new Set<string>();
  const ordenados: EspacioParaRuta[] = [];

  for (const cand of candidatos) {
    if (visitados.has(cand.id)) continue;

    // Recorrido BFS/cadena partiendo de cand respetando vecinos del bloque
    const cola: string[] = [cand.id];
    visitados.add(cand.id);

    while (cola.length > 0) {
      const actualId = cola.shift()!;
      const actualObj = espacioMap.get(actualId);
      if (actualObj) {
        ordenados.push(actualObj);
      }

      let vecinosIds: string[] = [];
      try {
        vecinosIds = obtenerEspaciosContiguos(actualId, grafo);
      } catch {
        vecinosIds = [];
      }

      // Filtrar solo los vecinos que forman parte de este bloque y no han sido visitados
      const vecinosDelBloque = vecinosIds
        .filter((vid) => espacioMap.has(vid) && !visitados.has(vid))
        .sort((a, b) => {
          const objA = espacioMap.get(a);
          const objB = espacioMap.get(b);
          return (objA?.identificador || '').localeCompare(objB?.identificador || '');
        });

      for (const vId of vecinosDelBloque) {
        visitados.add(vId);
        cola.push(vId);
      }
    }
  }

  return ordenados;
}

/**
 * Issue 3.14 — Algoritmo: calcular ruta de referencia hacia un espacio o bloque asignado.
 *
 * Flujo de 3 tramos:
 * 1. Entrada del pabellón: punto fijo por pabellón en el piso 1.
 * 2. Cambio de piso: escalera o ascensor (si el piso destino > 1).
 *    Si el alumno tiene movilidad reducida o requiere accesibilidad, se indica ascensor/rampa accesible.
 * 3. Espacios del bloque asignado: ordenados con el grafo de contigüidad del Issue 2.3.
 *
 * Casos borde:
 * - Espacio en piso 1: se omite el tramo de cambio de piso (la ruta es directa en planta baja).
 * - Espacio sin pabellón o sin piso registrado: devuelve estado explícito "RUTA_NO_DISPONIBLE".
 * - Bloque vacío o sin espacios: devuelve estado "RUTA_NO_DISPONIBLE".
 */
export function calcularRutaReferencia(input: CalcularRutaInput): RutaReferenciaDTO {
  const { asignacionId, espacios, grafoContiguedad, movilidadReducida = false } = input;

  // Validación de caso borde: lista vacía
  if (!espacios || espacios.length === 0) {
    return {
      asignacionId,
      estado: 'RUTA_NO_DISPONIBLE',
      mensaje: 'La asignación no cuenta con espacios registrados.',
      tiempoEstimadoTotalSegundos: 0,
      tramos: [],
      movilidadReducida,
    };
  }

  const primerEspacio = espacios[0];
  const pabellon = primerEspacio.pabellon?.trim();
  const piso = primerEspacio.piso;

  // Caso borde: espacio sin pabellón o piso registrado
  if (!pabellon || piso === null || piso === undefined || isNaN(piso) || piso < 1) {
    return {
      asignacionId,
      estado: 'RUTA_NO_DISPONIBLE',
      mensaje: 'El espacio asignado no tiene pabellón o piso válido registrado.',
      tiempoEstimadoTotalSegundos: 0,
      tramos: [],
      movilidadReducida,
    };
  }

  // Ordenar los espacios del bloque utilizando la contigüidad del Issue 2.3
  const espaciosOrdenados = ordenarEspaciosPorContiguedad(espacios, grafoContiguedad);

  const tramos: TramoRutaDTO[] = [];
  let tiempoTotalSegundos = 0;
  let ordenTramo = 1;

  // TRAMO 1: Entrada del pabellón (Piso 1)
  const tiempoEntrada = TIEMPO_CAMINATA_CONFIG.TIEMPO_BASE_ENTRADA_SEGUNDOS;
  tiempoTotalSegundos += tiempoEntrada;

  tramos.push({
    orden: ordenTramo++,
    tipo: 'ENTRADA_PABELLON',
    titulo: `Acceso Principal — ${pabellon}`,
    descripcion: `Ingresar por la puerta principal del ${pabellon} (Piso 1) hacia el vestíbulo central.`,
    tiempoEstimadoSegundos: tiempoEntrada,
    esAccesible: true,
    pabellon,
    piso: 1,
  });

  // TRAMO 2: Cambio de piso (únicamente si piso > 1)
  if (piso > 1) {
    const pisosADesplazar = piso - 1;
    const tiempoCambioPiso = movilidadReducida
      ? pisosADesplazar * TIEMPO_CAMINATA_CONFIG.TIEMPO_POR_PISO_ASCENSOR_SEGUNDOS
      : pisosADesplazar * TIEMPO_CAMINATA_CONFIG.TIEMPO_POR_PISO_ESCALERA_SEGUNDOS;

    tiempoTotalSegundos += tiempoCambioPiso;

    const medioAcceso = movilidadReducida ? 'Ascensor accesible' : 'Escaleras principales';
    const detalleMedio = movilidadReducida
      ? `Tomar el ascensor accesible ubicado en el hall principal hasta el Piso ${piso}.`
      : `Subir por las escaleras principales del ${pabellon} hasta alcanzar el Piso ${piso}.`;

    tramos.push({
      orden: ordenTramo++,
      tipo: 'CAMBIO_PISO',
      titulo: `Subida al Piso ${piso} vía ${medioAcceso}`,
      descripcion: detalleMedio,
      tiempoEstimadoSegundos: tiempoCambioPiso,
      esAccesible: movilidadReducida,
      pabellon,
      piso,
    });
  }

  // TRAMO 3: Llegada a los espacios del bloque asignado
  for (let i = 0; i < espaciosOrdenados.length; i++) {
    const esp = espaciosOrdenados[i];
    const tiempoEspacio =
      i === 0
        ? TIEMPO_CAMINATA_CONFIG.TIEMPO_TRANSITO_PISO_SEGUNDOS
        : TIEMPO_CAMINATA_CONFIG.TIEMPO_ENTRE_ESPACIOS_CONTIGUOS_SEGUNDOS;

    tiempoTotalSegundos += tiempoEspacio;

    const esMultiple = espaciosOrdenados.length > 1;
    const tipoTexto = esp.tipo === TipoEspacio.LABORATORIO ? 'Laboratorio' : 'Aula';
    const nombreEspacio = esp.identificador || `Espacio ${esp.id}`;

    const descripcion = esMultiple
      ? i === 0
        ? `Desplazarse por el pasillo del Piso ${piso} hasta la primera sala del bloque asignado: ${nombreEspacio}.`
        : `Acceder a la sala contigua del bloque: ${nombreEspacio} (puerta con puerta).`
      : `Desplazarse por el pasillo del Piso ${piso} hasta la entrada de ${nombreEspacio}.`;

    tramos.push({
      orden: ordenTramo++,
      tipo: 'ESPACIO_ASIGNADO',
      titulo: `${tipoTexto}: ${nombreEspacio}`,
      descripcion,
      tiempoEstimadoSegundos: tiempoEspacio,
      esAccesible: true,
      espacioId: esp.id,
      identificador: esp.identificador || undefined,
      tipoEspacio: esp.tipo || undefined,
      pabellon,
      piso,
    });
  }

  return {
    asignacionId,
    estado: 'DISPONIBLE',
    pabellon,
    pisoDestino: piso,
    tiempoEstimadoTotalSegundos: tiempoTotalSegundos,
    tramos,
    movilidadReducida,
  };
}

import crypto from 'crypto';
import { EstadoAsignacion, TipoEspacio } from '@prisma/client';
import { EspacioConexo } from './buscarBloqueContiguo';
import {
  AsignacionOcupacionInput,
  haySolapamientoHorario,
} from '../services/disponibilidad.service';
import { HttpError } from '../lib/http';
import { AsignacionParalelaUbicacion } from './cercaniaParalelas';
import {
  orquestarAsignacionSeccion,
  calcularHuellaEntradaSeccion,
  puedeConservarse,
} from './orquestadorAsignacion';
import {
  AsignacionExistenteContexto,
  ResultadoCorridaBatch,
  ResultadoOrquestacion,
  SeccionInputMotor,
} from '../types/asignacion';

export interface CorridaBatchInput {
  periodo: string;
  secciones: SeccionInputMotor[];
  todosLosEspacios: EspacioConexo[];
  obtenerVecinosContiguos: (espacioId: string) => string[];
  asignacionesPrevias?: AsignacionExistenteContexto[];
  corridaId?: string;
  maxEspaciosPorBloque?: number;
  /**
   * Issue 2.26 (riesgo R9): «Reorganizar con prioridad» al inicio del ciclo. Las secciones que
   * estaban ESCALADAS se procesan primero y ninguna asignación se conserva por idempotencia, así
   * las escaladas pueden ocupar aulas que tenían otras secciones (que se reubican después).
   */
  priorizarEscaladas?: boolean;
}

/**
 * Issue 2.11: Ejecuta la corrida batch de asignación para todas las secciones de un periodo académico.
 *
 * Características clave:
 * 1. **Determinismo:** Aplica ordenamiento canónico prioritario (movilidad reducida, laboratorios con stack,
 *    mayor aforo y orden léxico de curso/sección).
 * 2. **Idempotencia:** Si los requerimientos de una sección no cambiaron respecto a su asignación previa
 *    vigente, se preserva íntegramente la asignación existente.
 * 3. **Acumulación de Ocupación:** Conforme se asignan secciones en el lote, sus espacios y franjas horarias
 *    quedan reservados para evitar doble asignación en las secciones subsecuentes del batch.
 * 4. **Cercanía Progresiva:** Las secciones paralelas asignadas durante la misma corrida batch sirven
 *    como referencia de cercanía para las secciones restantes del mismo curso.
 * 5. **Escalamiento Automático:** Si una sección no encuentra bloque disponible, se clasifica el motivo
 *    exacto del fallo y se marca como ESCALADA sin interrumpir la corrida de las demás secciones.
 */
export function ejecutarCorridaBatch(input: CorridaBatchInput): ResultadoCorridaBatch {
  const {
    periodo,
    secciones,
    todosLosEspacios,
    obtenerVecinosContiguos,
    asignacionesPrevias = [],
    corridaId = crypto.randomUUID(),
    maxEspaciosPorBloque = 4,
    priorizarEscaladas = false,
  } = input;

  const mapaEspaciosPorId = new Map<string, EspacioConexo>();
  for (const esp of todosLosEspacios) {
    mapaEspaciosPorId.set(esp.id, esp);
  }

  // Mapa de asignaciones previas indexadas por seccionId
  const mapaPrevias = new Map<string, AsignacionExistenteContexto>();
  for (const prev of asignacionesPrevias) {
    mapaPrevias.set(prev.seccionId, prev);
  }

  // Ordenamiento determinista para el lote de secciones:
  // 1. Primero las que tienen alumnos con movilidad reducida (prioridad en Piso 1)
  // 2. Luego por mayor número de alumnos (mayor aforo primero)
  // 3. Laboratorios antes que aulas (mayor restricción por software)
  // 4. Desempate por ID de sección
  // Issue 2.26: al reorganizar con prioridad, antes que todo van las que estaban escaladas.
  const estabaEscalada = (id: string) =>
    priorizarEscaladas && mapaPrevias.get(id)?.estado === EstadoAsignacion.ESCALADA ? 1 : 0;
  const seccionesOrdenadas = [...secciones].sort((a, b) => {
    const escaladaPrimero = estabaEscalada(b.id) - estabaEscalada(a.id);
    if (escaladaPrimero !== 0) {
      return escaladaPrimero;
    }

    const aMov = a.movilidadReducida ? 1 : 0;
    const bMov = b.movilidadReducida ? 1 : 0;
    if (bMov !== aMov) {
      return bMov - aMov;
    }

    if (b.alumnosMatriculados !== a.alumnosMatriculados) {
      return b.alumnosMatriculados - a.alumnosMatriculados;
    }

    if (a.tipoEspacioRequerido !== b.tipoEspacioRequerido) {
      return a.tipoEspacioRequerido === TipoEspacio.LABORATORIO ? -1 : 1;
    }

    return a.id.localeCompare(b.id);
  });

  // Ocupaciones dinámicas acumuladas durante la corrida
  const ocupacionesVigentes: AsignacionOcupacionInput[] = [];

  // Mapa de ubicaciones de secciones paralelas por cursoId
  const mapaParalelasPorCurso = new Map<string, AsignacionParalelaUbicacion[]>();

  const registrarUbicacionParalela = (
    cursoId: string,
    seccionId: string,
    codigoSeccion: string,
    espacioIds: string[],
  ) => {
    const espacios = espacioIds
      .map((espId) => mapaEspaciosPorId.get(espId))
      .filter((esp): esp is EspacioConexo => esp !== undefined)
      .map((esp) => ({ pabellon: esp.pabellon, piso: esp.piso }));
    const ubicacion: AsignacionParalelaUbicacion = { seccionId, codigoSeccion, espacios };
    if (!mapaParalelasPorCurso.has(cursoId)) {
      mapaParalelasPorCurso.set(cursoId, []);
    }
    mapaParalelasPorCurso.get(cursoId)!.push(ubicacion);
  };

  // Inicializar mapa de paralelas con asignaciones previas vigentes de secciones que no están en el lote
  const idsSeccionesEnLote = new Set(secciones.map((s) => s.id));
  for (const prev of asignacionesPrevias) {
    if (prev.estado === EstadoAsignacion.VIGENTE && !idsSeccionesEnLote.has(prev.seccionId)) {
      ocupacionesVigentes.push({
        id: prev.id,
        estado: prev.estado,
        espacioIds: prev.espacioIds,
        horarios: prev.horarios,
      });
    }
  }

  // Issue 2.20 (riesgo R1 de la auditoría): las asignaciones que se van a conservar por
  // idempotencia se reservan ANTES de recorrer el lote. Si se reservaran al llegar a su sección,
  // una sección que cambió y se procesa antes vería libre el espacio y lo tomaría: doble reserva.
  // Issue 2.22 (riesgo R3): solo se conserva si sus espacios siguen sirviendo a la sección.
  // Issue 2.26: al reorganizar con prioridad no se conserva ninguna, para que las escaladas
  // puedan tomar las aulas que tenían otras secciones.
  const idsConservadas = new Set<string>();
  for (const seccion of priorizarEscaladas ? [] : secciones) {
    const previa = mapaPrevias.get(seccion.id);
    if (
      puedeConservarse(seccion, previa, todosLosEspacios) &&
      !chocaConReservadas(seccion, previa.espacioIds, ocupacionesVigentes)
    ) {
      idsConservadas.add(seccion.id);
      ocupacionesVigentes.push({
        id: previa.id,
        estado: EstadoAsignacion.VIGENTE,
        espacioIds: previa.espacioIds,
        horarios: seccion.horarios,
      });
      registrarUbicacionParalela(
        seccion.cursoId,
        seccion.id,
        seccion.codigoSeccion,
        previa.espacioIds,
      );
    }
  }

  const desglosePorTipoEspacio = {
    [TipoEspacio.AULA_TEORICA]: { total: 0, asignadas: 0, escaladas: 0, conservadas: 0 },
    [TipoEspacio.LABORATORIO]: { total: 0, asignadas: 0, escaladas: 0, conservadas: 0 },
  };

  const resultados: ResultadoOrquestacion[] = [];
  let contadorAsignadas = 0;
  let contadorEscaladas = 0;
  let contadorConservadas = 0;

  for (const seccion of seccionesOrdenadas) {
    const asignacionPrevia = mapaPrevias.get(seccion.id) || null;
    const huellaActual = calcularHuellaEntradaSeccion(seccion);
    const desglose = desglosePorTipoEspacio[seccion.tipoEspacioRequerido];
    desglose.total++;

    // Obtener las secciones paralelas ya ubicadas para el mismo curso
    const paralelasDelCurso = mapaParalelasPorCurso.get(seccion.cursoId) || [];

    // Idempotencia: Verificar si la asignación previa vigente sigue siendo 100% válida
    let resultado: ResultadoOrquestacion;

    if (asignacionPrevia && idsConservadas.has(seccion.id)) {
      resultado = {
        seccionId: seccion.id,
        codigoSeccion: seccion.codigoSeccion,
        cursoId: seccion.cursoId,
        estado: EstadoAsignacion.VIGENTE,
        espacioIds: asignacionPrevia.espacioIds,
        huellaEntrada: huellaActual,
        conservadaPorIdempotencia: true,
      };
      contadorConservadas++;
      contadorAsignadas++;
      desglose.asignadas++;
      desglose.conservadas++;
    } else {
      // Reevaluación con el Issue 2.10
      resultado = orquestarAsignacionSeccion({
        seccion,
        todosLosEspacios,
        asignacionesVigentes: ocupacionesVigentes,
        obtenerVecinosContiguos,
        paralelasAsignadas: paralelasDelCurso,
        // La decisión de conservar ya se tomó arriba (con las reservas de toda la corrida).
        asignacionPrevia: null,
        maxEspaciosPorBloque,
      });

      if (resultado.estado === EstadoAsignacion.VIGENTE) {
        contadorAsignadas++;
        desglose.asignadas++;
      } else {
        // Idempotencia de ESCALADAS: si ya estaba escalada con la misma huella, se conserva sin duplicar
        if (
          asignacionPrevia &&
          asignacionPrevia.estado === EstadoAsignacion.ESCALADA &&
          asignacionPrevia.huellaEntrada === huellaActual
        ) {
          resultado.conservadaPorIdempotencia = true;
          contadorConservadas++;
          desglose.conservadas++;
        }
        contadorEscaladas++;
        desglose.escaladas++;
      }
    }

    resultados.push(resultado);

    // Si fue asignada con éxito, registrar su ocupación y ubicación física para el resto de la
    // corrida. Las conservadas ya se registraron antes del recorrido.
    if (
      !idsConservadas.has(seccion.id) &&
      resultado.estado === EstadoAsignacion.VIGENTE &&
      resultado.espacioIds.length > 0
    ) {
      ocupacionesVigentes.push({
        id: `temp-${seccion.id}`,
        estado: EstadoAsignacion.VIGENTE,
        espacioIds: resultado.espacioIds,
        horarios: seccion.horarios,
      });
      registrarUbicacionParalela(
        seccion.cursoId,
        seccion.id,
        seccion.codigoSeccion,
        resultado.espacioIds,
      );
    }
  }

  const conflictos = detectarDobleReserva(resultados, secciones);
  if (conflictos.length > 0) {
    throw new DobleReservaError(conflictos);
  }

  return {
    corridaId,
    periodo,
    fechaEjecucion: new Date(),
    totalSecciones: secciones.length,
    asignadas: contadorAsignadas,
    escaladas: contadorEscaladas,
    conservadas: contadorConservadas,
    desglosePorTipoEspacio,
    resultados,
  };
}

/**
 * Una asignación previa que ya choca con otra reservada (dato viejo con doble reserva) no se
 * conserva: el motor la reasigna y la base se corrige sola, en vez de bloquear la corrida.
 */
function chocaConReservadas(
  seccion: SeccionInputMotor,
  espacioIds: string[],
  reservadas: AsignacionOcupacionInput[],
): boolean {
  return reservadas.some(
    (o) =>
      o.espacioIds.some((id) => espacioIds.includes(id)) &&
      o.horarios.some((ho) => seccion.horarios.some((hs) => haySolapamientoHorario(ho, hs))),
  );
}

/** Dos secciones que la corrida dejaría en el mismo espacio a la misma hora. */
export interface ConflictoDobleReserva {
  espacioId: string;
  seccionIdA: string;
  seccionIdB: string;
}

/**
 * Issue 2.20: la corrida no se guarda si deja una doble reserva. Es la red de seguridad del
 * recorrido: un error lógico del motor no debe llegar a la base.
 */
export class DobleReservaError extends HttpError {
  constructor(public readonly conflictos: ConflictoDobleReserva[]) {
    super(
      409,
      `La corrida produjo ${conflictos.length} doble(s) reserva(s) y no se guardó`,
      conflictos.map(
        (c) =>
          `Espacio ${c.espacioId}: secciones ${c.seccionIdA} y ${c.seccionIdB} a la misma hora`,
      ),
    );
    this.name = 'DobleReservaError';
  }
}

/**
 * Issue 2.20: busca pares de asignaciones vigentes de la corrida que compartan un espacio en
 * franjas que se solapan.
 */
export function detectarDobleReserva(
  resultados: ResultadoOrquestacion[],
  secciones: SeccionInputMotor[],
): ConflictoDobleReserva[] {
  const horariosPorSeccion = new Map(secciones.map((s) => [s.id, s.horarios ?? []]));
  const vigentes = resultados.filter(
    (r) => r.estado === EstadoAsignacion.VIGENTE && r.espacioIds.length > 0,
  );
  const conflictos: ConflictoDobleReserva[] = [];

  for (let i = 0; i < vigentes.length; i++) {
    for (let j = i + 1; j < vigentes.length; j++) {
      const a = vigentes[i];
      const b = vigentes[j];
      const compartidos = a.espacioIds.filter((id) => b.espacioIds.includes(id));
      if (compartidos.length === 0) continue;

      const horariosA = horariosPorSeccion.get(a.seccionId) ?? [];
      const horariosB = horariosPorSeccion.get(b.seccionId) ?? [];
      const seSolapan = horariosA.some((ha) =>
        horariosB.some((hb) => haySolapamientoHorario(ha, hb)),
      );
      if (seSolapan) {
        for (const espacioId of compartidos) {
          conflictos.push({ espacioId, seccionIdA: a.seccionId, seccionIdB: b.seccionId });
        }
      }
    }
  }

  return conflictos;
}

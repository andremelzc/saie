import crypto from 'crypto';
import { EstadoAsignacion, TipoEspacio } from '@prisma/client';
import { EspacioConexo } from './buscarBloqueContiguo';
import { AsignacionOcupacionInput } from '../services/disponibilidad.service';
import { AsignacionParalelaUbicacion } from './cercaniaParalelas';
import {
  orquestarAsignacionSeccion,
  calcularHuellaEntradaSeccion,
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
  const seccionesOrdenadas = [...secciones].sort((a, b) => {
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

    if (
      asignacionPrevia &&
      asignacionPrevia.estado === EstadoAsignacion.VIGENTE &&
      asignacionPrevia.huellaEntrada === huellaActual &&
      asignacionPrevia.espacioIds.length > 0
    ) {
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
        asignacionPrevia,
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

    // Si fue asignada con éxito, registrar su ocupación y ubicación física para el resto de la corrida
    if (resultado.estado === EstadoAsignacion.VIGENTE && resultado.espacioIds.length > 0) {
      ocupacionesVigentes.push({
        id: `temp-${seccion.id}`,
        estado: EstadoAsignacion.VIGENTE,
        espacioIds: resultado.espacioIds,
        horarios: seccion.horarios,
      });

      const ubicacionesEspacios = resultado.espacioIds
        .map((espId) => {
          const esp = mapaEspaciosPorId.get(espId);
          if (esp) {
            return { pabellon: esp.pabellon, piso: esp.piso };
          }
          return null;
        })
        .filter((u): u is { pabellon: string; piso: number } => u !== null);

      const nuevaParalela: AsignacionParalelaUbicacion = {
        seccionId: seccion.id,
        codigoSeccion: seccion.codigoSeccion,
        espacios: ubicacionesEspacios,
      };

      if (!mapaParalelasPorCurso.has(seccion.cursoId)) {
        mapaParalelasPorCurso.set(seccion.cursoId, []);
      }
      mapaParalelasPorCurso.get(seccion.cursoId)!.push(nuevaParalela);
    }
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

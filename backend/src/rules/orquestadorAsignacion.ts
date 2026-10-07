import crypto from 'crypto';
import { EstadoAsignacion, TipoEspacio } from '@prisma/client';
import {
  BloqueCandidato,
  buscarBloqueContiguo,
  EspacioConexo,
} from './buscarBloqueContiguo';
import {
  calcularEspaciosDisponibles,
  HorarioSlot,
  AsignacionOcupacionInput,
} from '../services/disponibilidad.service';
import { validarSoftwareBloque } from './validarSoftware';
import { priorizarBloquesPiso1 } from './accesibilidad';
import {
  AsignacionParalelaUbicacion,
  evaluarCercaniaParalelas,
} from './cercaniaParalelas';
import {
  clasificarMotivoEscalamiento,
  formatearMotivoEscalamiento,
} from './escalamiento';
import {
  AsignacionExistenteContexto,
  ResultadoOrquestacion,
  SeccionInputMotor,
} from '../types/asignacion';

export interface OrquestarAsignacionInput {
  seccion: SeccionInputMotor;
  todosLosEspacios: EspacioConexo[];
  asignacionesVigentes: AsignacionOcupacionInput[];
  obtenerVecinosContiguos: (espacioId: string) => string[];
  paralelasAsignadas?: AsignacionParalelaUbicacion[];
  asignacionPrevia?: AsignacionExistenteContexto | null;
  maxEspaciosPorBloque?: number;
}

/**
 * Genera una huella digital determinista (hash SHA-256) basada en los datos y restricciones
 * de la sección. Usada para garantizar idempotencia en asignaciones repetidas.
 */
export function calcularHuellaEntradaSeccion(seccion: SeccionInputMotor): string {
  const horariosNormalizados = (seccion.horarios || [])
    .map((h) => `${h.diaSemana}:${h.horaInicio}-${h.horaFin}`)
    .sort()
    .join('|');

  const softwareNormalizado = (seccion.stackSoftwareRequerido || [])
    .map((s) => s.trim().toLowerCase())
    .sort()
    .join('|');

  const payload = [
    seccion.cursoId,
    seccion.codigoSeccion,
    seccion.periodo,
    seccion.tipoEspacioRequerido,
    seccion.alumnosMatriculados,
    Boolean(seccion.movilidadReducida),
    horariosNormalizados,
    softwareNormalizado,
  ].join(':::');

  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Issue 2.10 & 2.14: Orquesta la asignación integral para una sección individual,
 * aplicando las 5 reglas del motor:
 *
 * 1. Capacidad real (aforo nominal vs PCs malogradas)
 * 2. Disponibilidad temporal estricta en todas las franjas horarias de la sección
 * 3. Contigüidad física (bloques conexos en el mismo piso y pabellón)
 * 4. Matriz de software para laboratorios (omisión automática en aulas teóricas)
 * 5. Accesibilidad (Piso 1 si movilidad reducida) y cercanía física entre secciones paralelas
 *
 * Si no es factible satisfacer las reglas, escala automáticamente a revisión manual (Issue 2.12).
 */
export function orquestarAsignacionSeccion(
  input: OrquestarAsignacionInput,
): ResultadoOrquestacion {
  const {
    seccion,
    todosLosEspacios,
    asignacionesVigentes,
    obtenerVecinosContiguos,
    paralelasAsignadas = [],
    asignacionPrevia,
    maxEspaciosPorBloque = 4,
  } = input;

  const huellaEntrada = calcularHuellaEntradaSeccion(seccion);

  // Idempotencia: Si ya existía asignación VIGENTE y los requerimientos no cambiaron, conservar
  if (
    asignacionPrevia &&
    asignacionPrevia.estado === EstadoAsignacion.VIGENTE &&
    asignacionPrevia.huellaEntrada === huellaEntrada &&
    asignacionPrevia.espacioIds.length > 0
  ) {
    return {
      seccionId: seccion.id,
      codigoSeccion: seccion.codigoSeccion,
      cursoId: seccion.cursoId,
      estado: EstadoAsignacion.VIGENTE,
      espacioIds: asignacionPrevia.espacioIds,
      huellaEntrada,
      conservadaPorIdempotencia: true,
    };
  }

  // 1. Validar horarios
  if (!seccion.horarios || seccion.horarios.length === 0) {
    const detalle = clasificarMotivoEscalamiento({
      seccion,
      todosLosEspacios,
      espaciosDisponiblesEnFranja: [],
    });

    return {
      seccionId: seccion.id,
      codigoSeccion: seccion.codigoSeccion,
      cursoId: seccion.cursoId,
      estado: EstadoAsignacion.ESCALADA,
      espacioIds: [],
      motivoEscalamiento: formatearMotivoEscalamiento(detalle),
      detalleEscalamiento: detalle,
      huellaEntrada,
    };
  }

  // 2. Calcular espacios disponibles que estén libres en TODAS las franjas horarias de la sección
  let espaciosDisponiblesEnTodasFranjas = [...todosLosEspacios];

  for (const slot of seccion.horarios) {
    const libresEnSlot = calcularEspaciosDisponibles(
      slot,
      seccion.tipoEspacioRequerido,
      todosLosEspacios,
      asignacionesVigentes,
    );
    const idsLibresEnSlot = new Set(libresEnSlot.map((e) => e.id));
    espaciosDisponiblesEnTodasFranjas = espaciosDisponiblesEnTodasFranjas.filter((e) =>
      idsLibresEnSlot.has(e.id),
    );
  }

  // 3. Buscar bloques contiguos conexos con capacidad suficiente
  const resBusqueda = buscarBloqueContiguo({
    alumnosRequeridos: seccion.alumnosMatriculados,
    tipoEspacioRequerido: seccion.tipoEspacioRequerido,
    espaciosDisponibles: espaciosDisponiblesEnTodasFranjas,
    obtenerVecinosContiguos,
    maxEspaciosPorBloque,
  });

  if (!resBusqueda.encontrado || resBusqueda.bloques.length === 0) {
    const detalle = clasificarMotivoEscalamiento({
      seccion,
      todosLosEspacios,
      espaciosDisponiblesEnFranja: espaciosDisponiblesEnTodasFranjas,
      softwareRequerido: seccion.stackSoftwareRequerido,
    });

    return {
      seccionId: seccion.id,
      codigoSeccion: seccion.codigoSeccion,
      cursoId: seccion.cursoId,
      estado: EstadoAsignacion.ESCALADA,
      espacioIds: [],
      motivoEscalamiento: formatearMotivoEscalamiento(detalle),
      detalleEscalamiento: detalle,
      huellaEntrada,
    };
  }

  // 4. Filtrar bloques por Matriz de Software (si es LABORATORIO)
  let bloquesCandidatos = resBusqueda.bloques;

  if (
    seccion.tipoEspacioRequerido === TipoEspacio.LABORATORIO &&
    seccion.stackSoftwareRequerido &&
    seccion.stackSoftwareRequerido.length > 0
  ) {
    bloquesCandidatos = bloquesCandidatos.filter((bloque) => {
      const resSoft = validarSoftwareBloque(bloque, seccion.stackSoftwareRequerido);
      return resSoft.cumple;
    });

    if (bloquesCandidatos.length === 0) {
      const detalle = clasificarMotivoEscalamiento({
        seccion,
        todosLosEspacios,
        espaciosDisponiblesEnFranja: espaciosDisponiblesEnTodasFranjas,
        softwareRequerido: seccion.stackSoftwareRequerido,
      });

      return {
        seccionId: seccion.id,
        codigoSeccion: seccion.codigoSeccion,
        cursoId: seccion.cursoId,
        estado: EstadoAsignacion.ESCALADA,
        espacioIds: [],
        motivoEscalamiento: formatearMotivoEscalamiento(detalle),
        detalleEscalamiento: detalle,
        huellaEntrada,
      };
    }
  }

  // 5. Evaluar accesibilidad y movilidad reducida (Piso 1)
  const tieneMovilidad = Boolean(seccion.movilidadReducida);
  const resPriorizacion = priorizarBloquesPiso1(bloquesCandidatos, tieneMovilidad);
  bloquesCandidatos = resPriorizacion.bloques;

  // 6. Evaluar puntuación de cercanía con secciones paralelas (Issue 2.13 & 2.14)
  interface BloqueConMetricas {
    bloque: BloqueCandidato;
    puntajeCercania: number;
    esPiso1: boolean;
  }

  const bloquesEvaluados: BloqueConMetricas[] = bloquesCandidatos.map((bloque) => ({
    bloque,
    puntajeCercania: evaluarCercaniaParalelas(bloque, paralelasAsignadas),
    esPiso1: bloque.piso === 1,
  }));

  // 7. Criterio jerárquico de selección y desempate:
  // (1) Si aplica movilidad reducida: Piso 1 tiene máxima prioridad
  // (2) Mayor puntaje de cercanía entre secciones paralelas
  // (3) Menor cantidad de espacios en el bloque
  // (4) Menor desperdicio de aforo residual
  // (5) Menor número de piso
  // (6) Orden léxico de identificadores
  bloquesEvaluados.sort((a, b) => {
    if (tieneMovilidad) {
      if (a.esPiso1 !== b.esPiso1) {
        return a.esPiso1 ? -1 : 1;
      }
    }

    if (b.puntajeCercania !== a.puntajeCercania) {
      return b.puntajeCercania - a.puntajeCercania;
    }

    if (a.bloque.espacios.length !== b.bloque.espacios.length) {
      return a.bloque.espacios.length - b.bloque.espacios.length;
    }

    if (a.bloque.desperdicio !== b.bloque.desperdicio) {
      return a.bloque.desperdicio - b.bloque.desperdicio;
    }

    if (a.bloque.piso !== b.bloque.piso) {
      return a.bloque.piso - b.bloque.piso;
    }

    const identsA = a.bloque.espacios
      .map((e) => e.identificador)
      .sort()
      .join(', ');
    const identsB = b.bloque.espacios
      .map((e) => e.identificador)
      .sort()
      .join(', ');

    return identsA.localeCompare(identsB);
  });

  const seleccionado = bloquesEvaluados[0];

  return {
    seccionId: seccion.id,
    codigoSeccion: seccion.codigoSeccion,
    cursoId: seccion.cursoId,
    estado: EstadoAsignacion.VIGENTE,
    bloqueAsignado: seleccionado.bloque,
    espacioIds: seleccionado.bloque.espacioIds,
    puntajeCercania: seleccionado.puntajeCercania,
    fallbackPiso1Aplicado: tieneMovilidad ? resPriorizacion.fallbackAplicado : false,
    motivoFallbackPiso1: resPriorizacion.motivoFallback,
    huellaEntrada,
  };
}

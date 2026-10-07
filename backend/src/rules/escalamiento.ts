import { TipoEspacio } from '@prisma/client';
import { EspacioConexo } from './buscarBloqueContiguo';
import { calcularCapacidadReal } from './calcularCapacidadReal';
import { validarSoftwareLaboratorio } from './validarSoftware';
import {
  DetalleEscalamiento,
  MotivoEscalamientoTipo,
  SeccionInputMotor,
} from '../types/asignacion';

export interface DiagnosticoEscalamientoInput {
  seccion: SeccionInputMotor;
  todosLosEspacios: EspacioConexo[];
  espaciosDisponiblesEnFranja: EspacioConexo[];
  softwareRequerido?: string[] | null;
}

/**
 * Issue 2.12: Clasifica y diagnostica la causa raíz por la cual una sección no pudo ser asignada
 * automáticamente a un bloque de espacios.
 *
 * Analiza sistemáticamente:
 * 1. Definición de horarios (si no tiene franjas horarias).
 * 2. Capacidad física global del campus para el tipo de espacio solicitado.
 * 3. Disponibilidad temporal (si todos los espacios están ocupados en ese horario).
 * 4. Matriz de software para laboratorios (si ningún espacio/bloque disponible tiene el software).
 * 5. Fragmentación de contigüidad (si hay capacidad total sumada pero no en espacios contiguos).
 * 6. Capacidad insuficiente en la franja disponible.
 */
export function clasificarMotivoEscalamiento(
  input: DiagnosticoEscalamientoInput,
): DetalleEscalamiento {
  const { seccion, todosLosEspacios, espaciosDisponiblesEnFranja, softwareRequerido } = input;

  // 1. Validar horarios
  if (!seccion.horarios || seccion.horarios.length === 0) {
    return {
      tipo: MotivoEscalamientoTipo.SIN_HORARIOS_DEFINIDOS,
      descripcion: `La sección ${seccion.codigoSeccion} no cuenta con franjas horarias registradas para el periodo ${seccion.periodo}.`,
    };
  }

  // Filtrar todos los espacios del tipo requerido
  const espaciosTipoTotal = todosLosEspacios.filter((e) => e.tipo === seccion.tipoEspacioRequerido);

  if (espaciosTipoTotal.length === 0) {
    return {
      tipo: MotivoEscalamientoTipo.SIN_ESPACIOS_DISPONIBLES,
      descripcion: `No existen espacios registrados en el campus del tipo ${seccion.tipoEspacioRequerido}.`,
    };
  }

  // Capacidad máxima teórica global del campus para ese tipo
  const capacidadGlobalMaxima = espaciosTipoTotal.reduce(
    (sum, esp) => sum + calcularCapacidadReal(esp),
    0,
  );

  if (capacidadGlobalMaxima < seccion.alumnosMatriculados) {
    return {
      tipo: MotivoEscalamientoTipo.CAPACIDAD_INSUFICIENTE,
      descripcion: `Aforo requerido (${seccion.alumnosMatriculados} alumnos) supera la capacidad física total existente del campus (${capacidadGlobalMaxima} vacantes) para ${seccion.tipoEspacioRequerido}.`,
      detallesTecnicos: {
        alumnosMatriculados: seccion.alumnosMatriculados,
        capacidadGlobalMaxima,
      },
    };
  }

  // 2. Disponibilidad en la franja horaria
  const disponiblesTipo = espaciosDisponiblesEnFranja.filter(
    (e) => e.tipo === seccion.tipoEspacioRequerido,
  );

  if (disponiblesTipo.length === 0) {
    return {
      tipo: MotivoEscalamientoTipo.HORARIO_BLOQUEADO,
      descripcion: `Todos los espacios de tipo ${seccion.tipoEspacioRequerido} se encuentran ocupados en los horarios requeridos por la sección ${seccion.codigoSeccion}.`,
      detallesTecnicos: {
        horarios: seccion.horarios,
        tipoEspacioRequerido: seccion.tipoEspacioRequerido,
      },
    };
  }

  // 3. Evaluar software requerido si es laboratorio
  if (
    seccion.tipoEspacioRequerido === TipoEspacio.LABORATORIO &&
    softwareRequerido &&
    softwareRequerido.length > 0
  ) {
    // Verificar si algún laboratorio disponible cuenta con el software
    const labsConSoftware = disponiblesTipo.filter((lab) => {
      const res = validarSoftwareLaboratorio(lab.softwareInstalado, softwareRequerido);
      return res.cumple;
    });

    if (labsConSoftware.length === 0) {
      return {
        tipo: MotivoEscalamientoTipo.SOFTWARE_FALTANTE,
        descripcion: `Ningún laboratorio disponible en la franja horaria cuenta con el stack de software requerido: [${softwareRequerido.join(', ')}].`,
        detallesTecnicos: {
          softwareRequerido,
          laboratoriosDisponiblesEvaluados: disponiblesTipo.map((l) => l.identificador),
        },
      };
    }
  }

  // 4. Evaluar capacidad de los disponibles
  const capacidadDisponibleTotal = disponiblesTipo.reduce(
    (sum, esp) => sum + calcularCapacidadReal(esp),
    0,
  );

  if (capacidadDisponibleTotal < seccion.alumnosMatriculados) {
    return {
      tipo: MotivoEscalamientoTipo.CAPACIDAD_INSUFICIENTE,
      descripcion: `Capacidad disponible acumulada (${capacidadDisponibleTotal} vacantes) es insuficiente para los ${seccion.alumnosMatriculados} alumnos matriculados en la franja horaria.`,
      detallesTecnicos: {
        alumnosMatriculados: seccion.alumnosMatriculados,
        capacidadDisponibleTotal,
      },
    };
  }

  // 5. Si la suma total de disponibles alcanza pero no hubo bloque conexo
  return {
    tipo: MotivoEscalamientoTipo.CONTIGUEDAD_NO_ALCANZADA,
    descripcion: `Existen espacios disponibles con capacidad sumada suficiente (${capacidadDisponibleTotal} vacantes), pero no forman un bloque contiguo adyacente en el mismo piso/pabellón que cubra los ${seccion.alumnosMatriculados} alumnos.`,
    detallesTecnicos: {
      alumnosMatriculados: seccion.alumnosMatriculados,
      capacidadDisponibleTotal,
      espaciosDisponibles: disponiblesTipo.map((e) => e.identificador),
    },
  };
}

/**
 * Genera el string conciso de motivo de escalamiento para almacenamiento en la BD.
 */
export function formatearMotivoEscalamiento(detalle: DetalleEscalamiento): string {
  return `[${detalle.tipo}] ${detalle.descripcion}`;
}

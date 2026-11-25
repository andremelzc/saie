import { logger } from '../lib/logger';
import { PrismaClient } from '@prisma/client';
import { HttpError } from '../lib/http';
import {
  importarCursosYSecciones,
  importarDocentes,
  importarHorarios,
  importarMatriculas,
} from '../importers';
import {
  AsignacionEncadenadaDTO,
  ResultadoImportacionDTO,
  TipoImportacion,
} from '../types/importacion';
import { ejecutarAsignacionADemanda } from './asignacionDemanda.service';
import { registrarImportacion } from './importacionRegistro.service';
import { validarImportacion } from './validacionImportacion.service';
import { obtenerPeriodoVigente } from './periodo.service';

interface ResultadoImportador {
  procesados: Record<string, number>;
  errores: string[];
  clavesIniciales?: {
    codigo: string;
    nombre: string;
    correo: string;
    rol: string;
    claveInicial: string;
  }[];
}

async function correrImportador(
  tipo: TipoImportacion,
  filas: unknown[],
  prisma: PrismaClient,
): Promise<ResultadoImportador> {
  switch (tipo) {
    case 'cursos-secciones': {
      const { errores, ...procesados } = await importarCursosYSecciones(filas, prisma);
      return { procesados, errores };
    }
    case 'horarios': {
      const { errores, ...procesados } = await importarHorarios(filas, prisma);
      return { procesados, errores };
    }
    case 'matriculas': {
      const { errores, clavesIniciales, ...procesados } = await importarMatriculas(filas, prisma);
      return { procesados, errores, clavesIniciales };
    }
    case 'docentes': {
      const { errores, clavesIniciales, ...procesados } = await importarDocentes(filas, prisma);
      return { procesados, errores, clavesIniciales };
    }
  }
}

/**
 * Issue 1.6: dispara la corrida batch del periodo vigente solo cuando el periodo ya tiene
 * secciones, horarios y matrículas cargados. Como los tres flujos de carga son independientes
 * (Issue 1.9), el lote se considera completo por los datos que hay en la base, no por el orden
 * en que se subieron los archivos. La corrida es idempotente (Issue 2.11), así que repetirla tras
 * cada importación no duplica asignaciones.
 */
export async function dispararAsignacionSiPeriodoCompleto(
  prisma: PrismaClient,
): Promise<AsignacionEncadenadaDTO> {
  const periodo = await obtenerPeriodoVigente(prisma);
  if (!periodo) {
    return { disparada: false, motivo: 'No hay un periodo vigente con secciones', resumen: null };
  }

  const [secciones, horarios, matriculas] = await Promise.all([
    prisma.seccion.count({ where: { periodo } }),
    prisma.horario.count({ where: { seccion: { periodo } } }),
    prisma.matricula.count({ where: { seccion: { periodo } } }),
  ]);

  const faltantes = [
    secciones === 0 ? 'secciones' : null,
    horarios === 0 ? 'horarios' : null,
    matriculas === 0 ? 'matrículas' : null,
  ].filter((nombre): nombre is string => nombre !== null);

  if (faltantes.length > 0) {
    return {
      disparada: false,
      motivo: `El periodo ${periodo} aún no tiene cargados: ${faltantes.join(', ')}`,
      resumen: null,
    };
  }

  try {
    const resumen = await ejecutarAsignacionADemanda(undefined, prisma);
    return { disparada: true, motivo: null, resumen };
  } catch (error: unknown) {
    // La importación ya quedó guardada: un fallo del motor no debe ocultar ese resultado.
    if (error instanceof HttpError) {
      return { disparada: false, motivo: error.message, resumen: null };
    }
    logger.error(
      { tipo: error instanceof Error ? error.name : '' },
      'Error al encadenar la asignación',
    );
    return {
      disparada: false,
      motivo: 'La asignación falló; puedes reintentarla desde POST /api/v1/asignaciones/batch',
      resumen: null,
    };
  }
}

/**
 * Issue 1.6: ejecuta un flujo de importación y, si terminó sin filas rechazadas, encadena la
 * corrida de asignación (salvo docentes, que no afectan la asignación).
 *
 * Issue 4.54: el resultado queda registrado con la cuenta que cargó el archivo (`cuentaId`). Si el
 * registro falla no se oculta el resultado de la importación, que ya quedó guardada: solo se avisa
 * en el log.
 */
export async function ejecutarImportacion(
  tipo: TipoImportacion,
  filas: unknown[],
  prisma: PrismaClient,
  cuentaId: string | null = null,
): Promise<ResultadoImportacionDTO> {
  // Issue 1.16 (riesgo R34 de la auditoría): todo o nada. Se valida el archivo completo antes de
  // escribir; si hay al menos un error, no se guarda ninguna fila.
  const validacion = await validarImportacion(tipo, filas, prisma);
  const { procesados, errores, clavesIniciales }: ResultadoImportador =
    validacion.errores.length > 0
      ? { procesados: {}, errores: validacion.errores }
      : await correrImportador(tipo, filas, prisma);
  const exitosa = errores.length === 0;
  // La validación previa no cubre los fallos al escribir (por ejemplo, un correo ya usado por otro
  // alumno): si el importador falla a medias, las filas anteriores sí quedaron guardadas y se avisa.
  const parcial =
    !exitosa && validacion.errores.length === 0 && Object.values(procesados).some((n) => n > 0);

  try {
    await registrarImportacion(prisma, { tipo, cuentaId, filasRecibidas: filas.length, errores });
  } catch (error: unknown) {
    logger.error(
      { tipo, causa: error instanceof Error ? error.name : 'desconocido' },
      'No se pudo registrar la importación',
    );
  }

  const asignacion =
    exitosa && tipo !== 'docentes' ? await dispararAsignacionSiPeriodoCompleto(prisma) : null;

  return {
    tipo,
    filasRecibidas: filas.length,
    procesados,
    errores,
    exitosa,
    guardadas: exitosa,
    ...(parcial ? { parcial: true } : {}),
    ...(validacion.advertencias.length > 0 ? { advertencias: validacion.advertencias } : {}),
    asignacion,
    ...(clavesIniciales && clavesIniciales.length > 0 ? { clavesIniciales } : {}),
  };
}

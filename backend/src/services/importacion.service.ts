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
import { obtenerPeriodoVigente } from './periodo.service';

interface ResultadoImportador {
  procesados: Record<string, number>;
  errores: string[];
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
      const { errores, ...procesados } = await importarMatriculas(filas, prisma);
      return { procesados, errores };
    }
    case 'docentes': {
      const { errores, ...procesados } = await importarDocentes(filas, prisma);
      return { procesados, errores };
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
    console.error('Error al encadenar la asignación:', error instanceof Error ? error.name : '');
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
 */
export async function ejecutarImportacion(
  tipo: TipoImportacion,
  filas: unknown[],
  prisma: PrismaClient,
): Promise<ResultadoImportacionDTO> {
  const { procesados, errores } = await correrImportador(tipo, filas, prisma);
  const exitosa = errores.length === 0;

  const asignacion =
    exitosa && tipo !== 'docentes' ? await dispararAsignacionSiPeriodoCompleto(prisma) : null;

  return { tipo, filasRecibidas: filas.length, procesados, errores, exitosa, asignacion };
}

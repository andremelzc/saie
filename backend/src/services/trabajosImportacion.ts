import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { HttpError } from '../lib/http';
import { logger } from '../lib/logger';
import { ResultadoImportacionDTO, TipoImportacion } from '../types/importacion';
import { ejecutarImportacion } from './importacion.service';

/**
 * Issue 1.19 (riesgo R39 de la auditoría): una importación grande (miles de matrículas) tarda más
 * que el tiempo de espera de la pantalla. Se procesa en segundo plano: la pantalla recibe un
 * identificador y consulta el avance («procesando 2300 de 4470»). Mientras haya una importación
 * del mismo tipo en curso no se acepta otra: antes, reintentar tras un error de tiempo agotado
 * dejaba dos cargas simultáneas sobre los mismos datos.
 *
 * El registro vive en memoria: una sola instancia del backend (ver el riesgo R33/#440 para varias).
 */

export type EstadoTrabajoImportacion = 'EN_CURSO' | 'TERMINADO' | 'FALLIDO';

export interface TrabajoImportacionDTO {
  id: string;
  tipo: TipoImportacion;
  estado: EstadoTrabajoImportacion;
  procesadas: number;
  total: number;
  /** Solo cuando `estado` es `TERMINADO`. */
  resultado?: ResultadoImportacionDTO;
  /** Solo cuando `estado` es `FALLIDO`: mensaje para la persona, sin detalles internos. */
  error?: string;
}

interface TrabajoInterno extends TrabajoImportacionDTO {
  terminadoEn?: number;
  /** Quién lo inició: solo esa cuenta puede consultar el avance. */
  cuentaId: string | null;
}

const RETENCION_MS = 60 * 60 * 1000;
const trabajos = new Map<string, TrabajoInterno>();

function limpiarAntiguos(ahora: number): void {
  for (const [id, t] of trabajos) {
    if (t.terminadoEn !== undefined && ahora - t.terminadoEn > RETENCION_MS) trabajos.delete(id);
  }
}

function aDTO(t: TrabajoInterno): TrabajoImportacionDTO {
  const { terminadoEn: _t, cuentaId: _c, ...dto } = t;
  return dto;
}

/** Vacía el registro (solo para pruebas). */
export function reiniciarTrabajosImportacion(): void {
  trabajos.clear();
}

/** `true` si hay una importación de ese tipo procesándose. */
export function importacionEnCurso(tipo: TipoImportacion): boolean {
  return [...trabajos.values()].some((t) => t.tipo === tipo && t.estado === 'EN_CURSO');
}

/**
 * Inicia la importación sin esperarla. Devuelve el trabajo y una promesa que se resuelve cuando
 * termina (la ruta síncrona la espera; la asíncrona la ignora y la pantalla consulta el avance).
 * 409 si ya hay una importación del mismo tipo en curso.
 */
export function iniciarTrabajoImportacion(
  tipo: TipoImportacion,
  filas: unknown[],
  prisma: PrismaClient,
  cuentaId: string | null,
): { trabajo: TrabajoImportacionDTO; terminado: Promise<TrabajoImportacionDTO> } {
  const ahora = Date.now();
  limpiarAntiguos(ahora);

  if (importacionEnCurso(tipo)) {
    throw new HttpError(
      409,
      'Ya hay una importación de este tipo en curso. Espera a que termine antes de subir otro archivo.',
    );
  }

  const trabajo: TrabajoInterno = {
    id: randomUUID(),
    tipo,
    estado: 'EN_CURSO',
    procesadas: 0,
    total: filas.length,
    cuentaId,
  };
  trabajos.set(trabajo.id, trabajo);

  const terminado = ejecutarImportacion(tipo, filas, prisma, cuentaId, (procesadas, total) => {
    trabajo.procesadas = procesadas;
    trabajo.total = total;
  })
    .then((resultado) => {
      trabajo.estado = 'TERMINADO';
      trabajo.procesadas = trabajo.total;
      trabajo.resultado = resultado;
    })
    .catch((error: unknown) => {
      logger.error(
        { tipo, causa: error instanceof Error ? error.name : 'desconocido' },
        'La importación en segundo plano falló',
      );
      trabajo.estado = 'FALLIDO';
      trabajo.error = 'La importación falló. Revisa el archivo e inténtalo de nuevo.';
    })
    .then(() => {
      trabajo.terminadoEn = Date.now();
      return aDTO(trabajo);
    });

  return { trabajo: aDTO(trabajo), terminado };
}

/** Estado de un trabajo; 404 si no existe o lo inició otra cuenta. */
export function obtenerTrabajoImportacion(
  id: string,
  cuentaId: string | null,
): TrabajoImportacionDTO {
  const trabajo = trabajos.get(id);
  if (!trabajo || trabajo.cuentaId !== cuentaId) {
    throw new HttpError(404, 'La importación no existe o ya expiró');
  }
  return aDTO(trabajo);
}

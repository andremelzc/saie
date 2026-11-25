import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { extraerFilas } from '../lib/archivoImportacion';
import { HttpError, responderError } from '../lib/http';
import {
  iniciarTrabajoImportacion,
  obtenerTrabajoImportacion,
} from '../services/trabajosImportacion';
import { calcularVistaPrevia } from '../services/vistaPreviaImportacion.service';
import { TIPOS_IMPORTACION, TipoImportacion } from '../types/importacion';

function esTipoImportacion(valor: string): valor is TipoImportacion {
  return (TIPOS_IMPORTACION as readonly string[]).includes(valor);
}

/**
 * Issue 1.6 — POST /api/v1/import/:tipo: carga un archivo de datos maestros.
 *
 * Cuerpo: CSV (`Content-Type: text/csv`) o JSON (arreglo de filas o `{ "datos": [...] }`).
 * Responde con el reporte de filas rechazadas y, si la carga fue exitosa y el periodo ya tiene
 * secciones, horarios y matrículas, con el resumen de la asignación que se disparó.
 */
export async function importarDatos(req: Request, res: Response): Promise<void> {
  try {
    const tipo = tipoDeLaRuta(req);
    const filas = extraerFilas(tipo, req.body);
    // Issue 1.19: misma regla que la ruta en segundo plano (una importación por tipo a la vez).
    const { terminado } = iniciarTrabajoImportacion(tipo, filas, prisma, req.auth?.sub ?? null);
    const trabajo = await terminado;
    if (trabajo.estado === 'FALLIDO' || !trabajo.resultado) {
      throw new HttpError(500, trabajo.error ?? 'La importación falló');
    }
    res.status(200).json({ success: true, data: trabajo.resultado });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

function tipoDeLaRuta(req: Request): TipoImportacion {
  const tipo = String(req.params.tipo);
  if (!esTipoImportacion(tipo)) {
    throw new HttpError(
      404,
      `Tipo de importación desconocido. Usa: ${TIPOS_IMPORTACION.join(', ')}`,
    );
  }
  return tipo;
}

/**
 * Issue 1.19 — POST /api/v1/import/:tipo/trabajos: inicia la importación en segundo plano y
 * responde 202 con el identificador para consultar el avance. 409 si ya hay una del mismo tipo.
 */
export async function iniciarImportacion(req: Request, res: Response): Promise<void> {
  try {
    const tipo = tipoDeLaRuta(req);
    const filas = extraerFilas(tipo, req.body);
    const { trabajo } = iniciarTrabajoImportacion(tipo, filas, prisma, req.auth?.sub ?? null);
    res.status(202).json({ success: true, data: trabajo });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/**
 * Issue 1.17 — POST /api/v1/import/:tipo/vista-previa: lo que la importación agregaría, quitaría o
 * inactivaría con este archivo, sin escribir nada. Coordinación lo revisa antes de confirmar.
 */
export async function previsualizarImportacion(req: Request, res: Response): Promise<void> {
  try {
    const tipo = tipoDeLaRuta(req);
    const filas = extraerFilas(tipo, req.body);
    const data = await calcularVistaPrevia(tipo, filas, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

/** Issue 1.19 — GET /api/v1/import/trabajos/:id: avance («2300 de 4470») y, al terminar, el resultado. */
export async function consultarTrabajoImportacion(req: Request, res: Response): Promise<void> {
  try {
    const data = obtenerTrabajoImportacion(String(req.params.id), req.auth?.sub ?? null);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

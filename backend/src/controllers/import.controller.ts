import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { extraerFilas } from '../lib/archivoImportacion';
import { HttpError, responderError } from '../lib/http';
import { ejecutarImportacion } from '../services/importacion.service';
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
    const tipo = String(req.params.tipo);
    if (!esTipoImportacion(tipo)) {
      throw new HttpError(
        404,
        `Tipo de importación desconocido. Usa: ${TIPOS_IMPORTACION.join(', ')}`,
      );
    }

    const filas = extraerFilas(tipo, req.body);
    const data = await ejecutarImportacion(tipo, filas, prisma);
    res.status(200).json({ success: true, data });
  } catch (error: unknown) {
    responderError(res, error);
  }
}

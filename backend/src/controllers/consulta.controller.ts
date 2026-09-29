import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { obtenerAsignacionPorAlumno, obtenerAsignacionPorCurso } from '../services/consulta.service';

const CodigoAlumnoParamSchema = z.object({
  codigoAlumno: z.string().min(1, 'El código de alumno es requerido'),
});

const CodigoCursoParamSchema = z.object({
  codigoCurso: z.string().min(1, 'El código de curso es requerido'),
});

/**
 * Controller para Issue 3.2 — Endpoint HTTP: consulta por código de alumno
 * GET /api/v1/consulta/alumno/:codigoAlumno
 */
export async function consultarPorCodigoAlumno(req: Request, res: Response): Promise<void> {
  const validacion = CodigoAlumnoParamSchema.safeParse(req.params);

  if (!validacion.success) {
    res.status(400).json({
      success: false,
      message: 'Parámetros inválidos',
      errors: validacion.error.issues.map((i) => i.message),
    });
    return;
  }

  const { codigoAlumno } = validacion.data;

  try {
    const resultado = await obtenerAsignacionPorAlumno(codigoAlumno, prisma);

    if (!resultado) {
      res.status(404).json({
        success: false,
        message: `No se encontró ningún estudiante con el código ${codigoAlumno}`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: resultado,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    res.status(500).json({
      success: false,
      message,
    });
  }
}

/**
 * Controller para Issue 3.4 — Endpoint HTTP: consulta por código de curso
 * GET /api/v1/consulta/curso/:codigoCurso
 */
export async function consultarPorCodigoCurso(req: Request, res: Response): Promise<void> {
  const validacion = CodigoCursoParamSchema.safeParse(req.params);

  if (!validacion.success) {
    res.status(400).json({
      success: false,
      message: 'Parámetros inválidos',
      errors: validacion.error.issues.map((i) => i.message),
    });
    return;
  }

  const { codigoCurso } = validacion.data;

  try {
    const resultado = await obtenerAsignacionPorCurso(codigoCurso, prisma);

    if (!resultado) {
      res.status(404).json({
        success: false,
        message: `No se encontró ningún curso con el código ${codigoCurso}`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: resultado,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error interno del servidor';
    res.status(500).json({
      success: false,
      message,
    });
  }
}

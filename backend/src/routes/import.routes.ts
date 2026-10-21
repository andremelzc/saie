import express, { ErrorRequestHandler, Router } from 'express';
import { RolCuenta } from '@prisma/client';
import { importarDatos } from '../controllers/import.controller';
import { authGuard, roleGuard } from '../middlewares/auth.middleware';

const router = Router();

// Los archivos de matrículas superan el límite de 100 kb de los parsers globales.
const LIMITE_CUERPO = '10mb';

// Solo Coordinación Académica carga datos maestros. La autenticación va antes de leer el cuerpo
// para no procesar archivos grandes de quien no tiene permiso.
router.use(authGuard, roleGuard(RolCuenta.COORDINACION_ACADEMICA));
router.use(express.json({ limit: LIMITE_CUERPO }));
router.use(express.text({ type: ['text/csv', 'text/plain'], limit: LIMITE_CUERPO }));

// POST /api/v1/import/:tipo — cursos-secciones | horarios | matriculas | docentes (Issue 1.6)
router.post('/:tipo', importarDatos);

// Errores de lectura del cuerpo (JSON mal formado, archivo demasiado grande).
const errorDeCuerpo: ErrorRequestHandler = (err, _req, res, next) => {
  const status = typeof err?.status === 'number' ? err.status : null;
  if (status === 400 || status === 413) {
    res.status(status).json({
      success: false,
      message:
        status === 413
          ? `El archivo supera el máximo de ${LIMITE_CUERPO}`
          : 'El cuerpo de la solicitud no es un JSON válido',
    });
    return;
  }
  next(err);
};
router.use(errorDeCuerpo);

export default router;

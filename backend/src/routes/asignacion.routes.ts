import { Router } from 'express';
import { RolCuenta } from '@prisma/client';
import { ejecutarBatch, ejecutarSeccion } from '../controllers/asignacion.controller';
import { authGuard, roleGuard } from '../middlewares/auth.middleware';

const router = Router();

// Solo Coordinación Académica puede disparar el motor (Issue 2.15).
router.use(authGuard, roleGuard(RolCuenta.COORDINACION_ACADEMICA));

router.post('/batch', ejecutarBatch);
router.post('/seccion/:id', ejecutarSeccion);

export default router;

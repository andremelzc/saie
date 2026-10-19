import { Router } from 'express';
import { RolCuenta } from '@prisma/client';
import {
  ejecutarBatch,
  ejecutarProgramada,
  ejecutarSeccion,
} from '../controllers/asignacion.controller';
import { authGuard, roleGuard } from '../middlewares/auth.middleware';
import { tokenServicioGuard } from '../middlewares/servicio.middleware';

const router = Router();

// Issue 2.18: la corrida desatendida se autentica con token de servicio, no con JWT. Se registra
// antes del guard de Coordinación para que este no se le aplique.
router.post('/programada', tokenServicioGuard('ASIGNACION_PROGRAMADA_TOKEN'), ejecutarProgramada);

// Solo Coordinación Académica puede disparar el motor (Issue 2.15).
router.use(authGuard, roleGuard(RolCuenta.COORDINACION_ACADEMICA));

router.post('/batch', ejecutarBatch);
router.post('/seccion/:id', ejecutarSeccion);

export default router;

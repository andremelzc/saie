import { Router } from 'express';
import { RolCuenta } from '@prisma/client';
import {
  registrarPcsMalogradasLaboratorio,
  registrarSoftwareLaboratorio,
} from '../controllers/admin.controller';
import { authGuard, roleGuard } from '../middlewares/auth.middleware';

const router = Router();

// Todo el panel exige JWT válido de Coordinación Académica o Jefatura (Issue 4.8).
// Los endpoints de laboratorio además filtran por EspacioResponsable para Jefatura.
router.use(authGuard, roleGuard(RolCuenta.COORDINACION_ACADEMICA, RolCuenta.JEFATURA_LABORATORIOS));

// POST /api/v1/admin/laboratorios/:id/software (Issue 4.1)
router.post('/laboratorios/:id/software', registrarSoftwareLaboratorio);

// POST /api/v1/admin/laboratorios/:id/pcs-malogradas (Issue 4.2)
router.post('/laboratorios/:id/pcs-malogradas', registrarPcsMalogradasLaboratorio);

export default router;

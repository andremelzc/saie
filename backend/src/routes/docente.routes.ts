import { Router } from 'express';
import { RolCuenta } from '@prisma/client';
import {
  crearIncidencia,
  explorarEspaciosDocente,
  obtenerHorario,
} from '../controllers/docente.controller';
import { authGuard, roleGuard } from '../middlewares/auth.middleware';

const router = Router();

// Solo el docente autenticado (Issue 7.1); cada consulta usa el id de cuenta del token.
router.use(authGuard, roleGuard(RolCuenta.DOCENTE));

router.get('/horario', obtenerHorario); // Issue 7.2
router.get('/espacios/explorador', explorarEspaciosDocente); // Issue 7.3
router.post('/incidencias', crearIncidencia); // Issue 7.5

export default router;

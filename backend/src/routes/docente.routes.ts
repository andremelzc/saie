import { Router } from 'express';
import { RolCuenta } from '@prisma/client';
import {
  crearIncidencia,
  explorarEspaciosDocente,
  obtenerEstadoLaboratorio,
  obtenerHorario,
} from '../controllers/docente.controller';
import {
  crearSolicitudSoftware,
  listarMisSolicitudesSoftware,
} from '../controllers/solicitudSoftware.controller';
import { authGuard, roleGuard } from '../middlewares/auth.middleware';

const router = Router();

// Solo el docente autenticado (Issue 7.1); cada consulta usa el id de cuenta del token.
router.use(authGuard, roleGuard(RolCuenta.DOCENTE));

router.get('/horario', obtenerHorario); // Issue 7.2
router.get('/espacios/explorador', explorarEspaciosDocente); // Issue 7.3
router.get('/laboratorio-estado/:espacioId', obtenerEstadoLaboratorio); // Issue 7.4
router.post('/incidencias', crearIncidencia); // Issue 7.5

// Solicitudes de software del docente (Issue 4.29): crea y lista solo las propias.
router.post('/solicitudes-software', crearSolicitudSoftware);
router.get('/solicitudes-software', listarMisSolicitudesSoftware);

export default router;

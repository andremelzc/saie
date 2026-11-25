import { Router } from 'express';
import { RolCuenta } from '@prisma/client';
import {
  crearIncidencia,
  explorarEspaciosDocente,
  listarIncidenciasDocente,
  obtenerEstadoLaboratorio,
  obtenerHorario,
} from '../controllers/docente.controller';
import {
  crearSolicitudSoftware,
  listarMisSolicitudesSoftware,
} from '../controllers/solicitudSoftware.controller';
import {
  leerCuerpoImagen,
  subirImagenIncidencia,
  verImagenIncidenciaDocente,
} from '../controllers/imagenIncidencia.controller';
import {
  crearSolicitudLaboratorio,
  listarMisSolicitudesLaboratorio,
} from '../controllers/fusionLaboratorio.controller';
import { authGuard, roleGuard } from '../middlewares/auth.middleware';

const router = Router();

// Solo el docente autenticado (Issue 7.1); cada consulta usa el id de cuenta del token.
router.use(authGuard, roleGuard(RolCuenta.DOCENTE));

router.get('/horario', obtenerHorario); // Issue 7.2
router.get('/espacios/explorador', explorarEspaciosDocente); // Issue 7.3
router.get('/laboratorio-estado/:espacioId', obtenerEstadoLaboratorio); // Issue 7.4
router.post('/incidencias', crearIncidencia); // Issue 7.5
router.get('/incidencias', listarIncidenciasDocente); // Issue 7.14
// Foto de la incidencia (Issue 7.19): el cuerpo es la imagen (JPEG, PNG o WebP, hasta 2 MB).
router.post('/incidencias/:id/imagen', leerCuerpoImagen, subirImagenIncidencia);
router.get('/incidencias/:id/imagen', verImagenIncidenciaDocente);

// Solicitudes de software del docente (Issue 4.29): crea y lista solo las propias.
router.post('/solicitudes-software', crearSolicitudSoftware);
router.get('/solicitudes-software', listarMisSolicitudesSoftware);

// «Dictar todo en laboratorio» (Issue 7.17): el docente lo pide para su sección de teoría.
router.post('/solicitudes-laboratorio', crearSolicitudLaboratorio);
router.get('/solicitudes-laboratorio', listarMisSolicitudesLaboratorio);

export default router;

import { Router } from 'express';
import { RolCuenta } from '@prisma/client';
import {
  altaAlumno,
  altaDocente,
  altaEspacio,
  consultarMapaOcupacion,
  editarEspacio,
  listarAlertas,
  listarEscaladas,
  listarEspaciosAdmin,
  listarIncidenciasReportadas,
  obtenerEspacio,
  registrarPcsMalogradasLaboratorio,
  registrarSoftwareLaboratorio,
  resolverAlertaPendiente,
  resolverIncidencia,
  restablecerClaveUsuario,
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

// GET /api/v1/admin/alertas (Issue 4.6)
router.get('/alertas', listarAlertas);

// PATCH /api/v1/admin/alertas/:id/resolver (Issue 4.7)
router.patch('/alertas/:id/resolver', resolverAlertaPendiente);

// GET /api/v1/admin/mapa-ocupacion (Issue 4.12)
router.get('/mapa-ocupacion', consultarMapaOcupacion);

// GET /api/v1/admin/secciones-escaladas (Issue 4.22)
router.get('/secciones-escaladas', listarEscaladas);

// GET /api/v1/admin/incidencias y PATCH /api/v1/admin/incidencias/:id/resolver (Issue 7.6)
router.get('/incidencias', listarIncidenciasReportadas);
router.patch('/incidencias/:id/resolver', resolverIncidencia);

const soloCoordinacion = roleGuard(RolCuenta.COORDINACION_ACADEMICA);

// Gestión de espacios con campos acotados por rol (Issue 4.15): el alta es solo de
// Coordinación; la edición la restringe el servicio según el rol y el tipo de espacio.
router.get('/espacios', listarEspaciosAdmin);
router.get('/espacios/:id', obtenerEspacio);
router.post('/espacios', soloCoordinacion, altaEspacio);
router.patch('/espacios/:id', editarEspacio);

// Alta individual de usuarios: solo Coordinación Académica (Issues 4.17 y 4.18)
router.post('/alumnos', soloCoordinacion, altaAlumno);
router.post('/docentes', soloCoordinacion, altaDocente);

// Restablecer la clave de un alumno o docente (Issue 4.26): solo Coordinación Académica.
router.post('/usuarios/restablecer-clave', soloCoordinacion, restablecerClaveUsuario);

export default router;

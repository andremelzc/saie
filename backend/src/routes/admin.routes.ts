import { Router } from 'express';
import { RolCuenta } from '@prisma/client';
import {
  altaAlumno,
  altaDocente,
  altaEspacio,
  consultarMapaOcupacion,
  consultarReporteAsignaciones,
  editarEspacio,
  editarSeccion,
  listarAlertas,
  listarEscaladas,
  listarEspaciosAdmin,
  listarHistorial,
  listarIncidenciasReportadas,
  listarRegistrosAuditoria,
  listarDocentes,
  listarSeccionesAdmin,
  obtenerEspacio,
  obtenerSeccion,
  registrarPcsMalogradasLaboratorio,
  registrarSoftwareLaboratorio,
  resolverAlertaPendiente,
  resolverIncidencia,
  restablecerClaveUsuario,
} from '../controllers/admin.controller';
import { authGuard, roleGuard } from '../middlewares/auth.middleware';
import {
  altaSoftware,
  cambiarEstadoCatalogo,
  editarSoftwareCatalogo,
  listarCatalogoSoftware,
  obtenerSoftware,
} from '../controllers/software.controller';
import {
  aprobarSolicitudSoftware,
  listarSolicitudesSoftware,
  rechazarSolicitudSoftware,
} from '../controllers/solicitudSoftware.controller';

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

// Catálogo de software (Issue 4.28). Lectura para Coordinación y Jefatura; alta, edición y
// baja lógica solo para Coordinación.
router.get('/software', listarCatalogoSoftware);
router.get('/software/:id', obtenerSoftware);
router.post('/software', soloCoordinacion, altaSoftware);
router.patch('/software/:id', soloCoordinacion, editarSoftwareCatalogo);
router.patch('/software/:id/estado', soloCoordinacion, cambiarEstadoCatalogo);

// Solicitudes de software (Issue 4.29): Coordinación las revisa, aprueba o rechaza.
router.get('/solicitudes-software', listarSolicitudesSoftware);
router.patch('/solicitudes-software/:id/aprobar', soloCoordinacion, aprobarSolicitudSoftware);
router.patch('/solicitudes-software/:id/rechazar', soloCoordinacion, rechazarSolicitudSoftware);

// Gestión de espacios con campos acotados por rol (Issue 4.15): el alta es solo de
// Coordinación; la edición la restringe el servicio según el rol y el tipo de espacio.
router.get('/espacios', listarEspaciosAdmin);
router.get('/espacios/:id', obtenerEspacio);
router.post('/espacios', soloCoordinacion, altaEspacio);
router.patch('/espacios/:id', editarEspacio);

// Gestión individual de secciones (Issue 4.31): ver el catálogo del periodo y editar, sin
// Coordinate, el tipo de aula, el docente y el software requerido.
router.get('/secciones', listarSeccionesAdmin);
router.get('/secciones/:id', obtenerSeccion);
router.patch('/secciones/:id', soloCoordinacion, editarSeccion);

// Docentes disponibles para asignar a una sección (Issue 4.31).
router.get('/docentes', listarDocentes);

// Auditoría e historial de asignaciones (Issue 4.32): lectura para los dos roles del panel.
router.get('/auditoria', listarRegistrosAuditoria);
router.get('/asignaciones/historial', listarHistorial);

// Informe de salones para presentar (Issue 4.33): secciones con su aula asignada.
router.get('/reporte/asignaciones', consultarReporteAsignaciones);

// Alta individual de usuarios: solo Coordinación Académica (Issues 4.17 y 4.18)
router.post('/alumnos', soloCoordinacion, altaAlumno);
router.post('/docentes', soloCoordinacion, altaDocente);

// Restablecer la clave de un alumno o docente (Issue 4.26): solo Coordinación Académica.
router.post('/usuarios/restablecer-clave', soloCoordinacion, restablecerClaveUsuario);

export default router;

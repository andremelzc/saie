import type { RolCuenta } from '../types/auth';

/** Rutas de la aplicación relacionadas con sesión y áreas privadas. */
export const RUTAS = {
  consulta: '/consulta',
  loginAlumno: '/login/alumno',
  loginDocente: '/login/docente',
  loginAdmin: '/login/admin',
  /** Cambio de la clave inicial, común a los cuatro roles (Issues 4.21 y 4.45). */
  cambiarClave: '/cambiar-clave',
  inicioAlumno: '/estudiante',
  horarioAlumno: '/estudiante/horario',
  mapaAlumno: '/estudiante/mapa',
  rutaAlumno: '/estudiante/ruta',
  perfilAlumno: '/estudiante/perfil',
  telegramAlumno: '/estudiante/telegram',
  ayudaAlumno: '/estudiante/ayuda',
  configuracionAlumno: '/estudiante/configuracion',
  inicioDocente: '/docente',
  horarioDocente: '/docente/horario',
  espaciosDocente: '/docente/espacios',
  incidenciasDocente: '/docente/incidencias',
  inicioAdmin: '/admin',
  alertasAdmin: '/admin/alertas',
  cargaAdmin: '/admin/carga',
  espaciosAdmin: '/admin/espacios',
  seccionesAdmin: '/admin/secciones',
  auditoriaAdmin: '/admin/auditoria',
  reporteSalonesAdmin: '/admin/reporte',
  cambioLaboratorio: '/admin/laboratorio',
  proximamenteAdmin: '/admin/proximamente',
  mapaAdmin: '/admin/mapa',
  laboratoriosAdmin: '/admin/laboratorios',
  altaAlumnoAdmin: '/admin/alumnos/nuevo',
  altaDocenteAdmin: '/admin/docentes/nuevo',
  clavesAdmin: '/admin/claves',
  softwareAdmin: '/admin/software',
  solicitudesSoftwareAdmin: '/admin/solicitudes-software',
  incidenciasAdmin: '/admin/incidencias',
} as const;

export const ROLES_ADMIN: RolCuenta[] = ['COORDINACION_ACADEMICA', 'JEFATURA_LABORATORIOS'];

/** Pantalla de login que corresponde a cada rol. */
export function rutaLoginDeRol(rol?: RolCuenta | null): string {
  if (rol === 'DOCENTE') return RUTAS.loginDocente;
  if (rol === 'COORDINACION_ACADEMICA' || rol === 'JEFATURA_LABORATORIOS') {
    return RUTAS.loginAdmin;
  }
  return RUTAS.loginAlumno;
}

/** Área privada de inicio de cada rol. */
export function rutaInicioDeRol(rol: RolCuenta): string {
  if (rol === 'DOCENTE') return RUTAS.inicioDocente;
  if (rol === 'COORDINACION_ACADEMICA' || rol === 'JEFATURA_LABORATORIOS') {
    return RUTAS.inicioAdmin;
  }
  return RUTAS.inicioAlumno;
}

/**
 * Destino tras iniciar sesión: el área del rol, o la pantalla de cambio de clave mientras la
 * cuenta deba cambiar la inicial (Issue 4.45).
 */
export function rutaDestinoTrasLogin(sesion: {
  rol: RolCuenta;
  debeCambiarClave?: boolean;
}): string {
  if (sesion.debeCambiarClave) return RUTAS.cambiarClave;
  return rutaInicioDeRol(sesion.rol);
}

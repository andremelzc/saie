import type { RolCuenta } from '../types/auth';

/** Rutas de la aplicación relacionadas con sesión y áreas privadas. */
export const RUTAS = {
  consulta: '/consulta',
  loginAlumno: '/login/alumno',
  loginDocente: '/login/docente',
  loginAdmin: '/login/admin',
  inicioAlumno: '/estudiante',
  horarioAlumno: '/estudiante/horario',
  inicioDocente: '/docente',
  inicioAdmin: '/admin',
  alertasAdmin: '/admin/alertas',
  cargaAdmin: '/admin/carga',
  espaciosAdmin: '/admin/espacios',
  cambioLaboratorio: '/admin/laboratorio',
  perfilAlumno: '/estudiante/perfil',
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

/** Destino tras iniciar sesión: el área del rol (las claves las administra la Facultad). */
export function rutaDestinoTrasLogin(sesion: { rol: RolCuenta }): string {
  return rutaInicioDeRol(sesion.rol);
}

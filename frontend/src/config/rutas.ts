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
  cambiarClave: '/cambiar-clave',
  perfilAlumno: '/estudiante/perfil',
} as const;

export const ROLES_ADMIN: RolCuenta[] = ['COORDINACION_ACADEMICA', 'JEFATURA_LABORATORIOS'];

export const TODOS_LOS_ROLES: RolCuenta[] = ['ALUMNO', 'DOCENTE', ...ROLES_ADMIN];

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

/** Destino tras iniciar sesión: cambio de clave inicial si corresponde, o el área del rol. */
export function rutaDestinoTrasLogin(sesion: {
  rol: RolCuenta;
  debeCambiarClave: boolean;
}): string {
  // Solo en desarrollo y solo si lo activas en tu .env.development.local (no se sube a git).
  const omitirCambioClave =
    import.meta.env.DEV && import.meta.env.VITE_OMITIR_CAMBIO_CLAVE === 'true';

  if (sesion.debeCambiarClave && !omitirCambioClave) return RUTAS.cambiarClave;
  return rutaInicioDeRol(sesion.rol);
}
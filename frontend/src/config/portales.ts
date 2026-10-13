/**
 * Portales del sistema y su pantalla de login.
 *
 * ÚNICO lugar donde se define a dónde lleva cada tarjeta de la Home.
 * Si tus rutas de login se llaman distinto en App.tsx, cambia solo `loginPath` aquí.
 */
export type PortalId = 'estudiante' | 'docente' | 'admin';

export interface Portal {
  id: PortalId;
  titulo: string;
  descripcion: string;
  /** Pantalla de login a la que navega la tarjeta (debe existir en App.tsx). */
  loginPath: string;
  /** Etiqueta del badge de la tarjeta. */
  etiqueta: string;
  /** Funciones destacadas (máx. 3) que se listan en la tarjeta. */
  funciones: string[];
}

export const PORTALES: Portal[] = [
  {
    id: 'estudiante',
    titulo: 'Portal del Estudiante',
    descripcion: 'Consulta dónde tienes clase y cómo llegar a tu aula o laboratorio.',
    loginPath: '/login/alumno',
    etiqueta: 'Estudiante',
    funciones: ['Horario diario y semanal', 'Ruta hacia tu aula', 'Perfil y ayuda'],
  },
  {
    id: 'docente',
    titulo: 'Portal Docente',
    descripcion: 'Revisa tus asignaciones, el estado de los laboratorios y reporta incidencias.',
    loginPath: '/login/docente',
    etiqueta: 'Docente',
    funciones: ['Próxima clase y horario', 'Explorador de espacios', 'Reporte de incidencias'],
  },
  {
    id: 'admin',
    titulo: 'Portal Administrativo',
    descripcion: 'Supervisa la ocupación de la infraestructura y atiende alertas e incidencias.',
    loginPath: '/login/admin',
    etiqueta: 'Administrativo',
    funciones: ['Mapa de ocupación por pisos', 'Centro de alertas', 'Gestión de espacios'],
  },
];

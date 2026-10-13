export type RolCuenta = 'COORDINACION_ACADEMICA' | 'JEFATURA_LABORATORIOS' | 'DOCENTE' | 'ALUMNO';

export interface LoginResponseDTO {
  token: string;
  rol: RolCuenta;
  debeCambiarClave: boolean;
  expiresIn: string;
}

export interface LoginCredentials {
  usuario?: string;
  codigo?: string;
  clave: string;
}

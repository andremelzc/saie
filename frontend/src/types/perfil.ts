/** Contrato del perfil del alumno (backend/src/types/portal.ts y alumno.service.ts, Issue 3.12). */

export const TIPOS_SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export interface DatosAlumnoDTO {
  codigo: string;
  nombre: string;
  correo: string;
  dni: string | null;
  /** Formato AAAA-MM-DD. */
  fechaNacimiento: string | null;
  telefono: string | null;
  direccion: string | null;
}

export interface FichaMedicaDTO {
  tipoSangre: string | null;
  alergias: string | null;
  condicionEspecial: string | null;
  contactoEmergencia: string | null;
}

export interface PerfilAlumnoDTO {
  alumno: DatosAlumnoDTO;
  /** `null` si el alumno todavía no registró su ficha médica. */
  fichaMedica: FichaMedicaDTO | null;
}

/** Cuerpo de PATCH /v1/estudiante/perfil: solo se envía lo que se modificó. */
export interface CambiosPerfil {
  datosPersonales?: Pick<DatosAlumnoDTO, 'dni' | 'fechaNacimiento' | 'telefono' | 'direccion'>;
  fichaMedica?: FichaMedicaDTO;
}

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
  /**
   * El alumno declaró que tiene una condición que le impide subir a pisos superiores o usar
   * escaleras. Describe un requisito de acceso al espacio, no un diagnóstico.
   */
  condicionAccesible: boolean;
}

export interface PerfilAlumnoDTO {
  alumno: DatosAlumnoDTO;
  /** `null` si el alumno todavía no registró su ficha médica. */
  fichaMedica: FichaMedicaDTO | null;
}

/** Issue 3.28: estado de la vinculación del alumno con el bot de Telegram. */
export interface EstadoTelegramDTO {
  /** `true` si el alumno tiene una vinculación activa con el bot. */
  vinculado: boolean;
  /** ISO 8601 o `null`. */
  fechaVinculacion: string | null;
  /** ISO 8601 o `null`. */
  fechaBaja: string | null;
  /** Usuario del bot para `https://t.me/<usuario>`; `null` si no está configurado. */
  botUsername: string | null;
}

/** Cuerpo de PATCH /v1/estudiante/perfil: solo se envía lo que se modificó. */
export interface CambiosPerfil {
  datosPersonales?: Pick<DatosAlumnoDTO, 'dni' | 'fechaNacimiento' | 'telefono' | 'direccion'>;
  fichaMedica?: FichaMedicaDTO;
}

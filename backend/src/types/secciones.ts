import { ComparacionVersion, DiaSemana, EstadoAsignacion, TipoEspacio } from '@prisma/client';

/**
 * Gestión individual de secciones (Issue 4.31).
 *
 * Hasta ahora las secciones solo se manageban por carga masiva: no había forma de verlas una
 * por una ni de cambiarles el software requerido, el tipo de aula o el docente. Estos contratos
 * exponen lo que ya está en la base y permiten editarlo sin reimportar el CSV.
 */

/** Campos que Coordinación Académica puede editar de una sección. */
export type CampoSeccion = 'tipoEspacioRequerido' | 'docenteId' | 'softwareRequerido';

export const CAMPOS_SECCION: CampoSeccion[] = [
  'tipoEspacioRequerido',
  'docenteId',
  'softwareRequerido',
];

export interface SoftwareRequeridoSeccionDTO {
  /** Id del software en el catálogo. */
  id: string;
  nombre: string;
  version: string;
  comparacionVersion: ComparacionVersion;
}

export interface EspacioDeSeccionDTO {
  id: string;
  identificador: string;
  pabellon: string;
  piso: number;
  tipo: TipoEspacio;
}

/** La asignación vigente de la sección (o la escalada si no se le pudo asignar aula). */
export interface AsignacionDeSeccionDTO {
  id: string;
  estado: EstadoAsignacion;
  fechaAsignacion: string;
  corridaId: string | null;
  motivoEscalamiento: string | null;
  espacios: EspacioDeSeccionDTO[];
}

export interface SeccionAdminDTO {
  id: string;
  codigoCurso: string;
  nombreCurso: string;
  codigoSeccion: string;
  periodo: string;
  tipoEspacioRequerido: TipoEspacio;
  docente: { id: string; codigoDocente: string; nombre: string } | null;
  alumnosMatriculados: number;
  horarios: { diaSemana: DiaSemana; horaInicio: string; horaFin: string }[];
  softwareRequerido: SoftwareRequeridoSeccionDTO[];
  asignacion: AsignacionDeSeccionDTO | null;
  /** Qué campos puede editar quien está mirando la pantalla. */
  camposEditables: CampoSeccion[];
}

export interface FiltrosSecciones {
  periodo?: string;
  /** Búsqueda libre por código de curso, nombre de curso o código de sección. */
  q?: string;
  tipo?: TipoEspacio;
  pagina: number;
  limite: number;
}

export interface ListadoSeccionesDTO {
  items: SeccionAdminDTO[];
  total: number;
  pagina: number;
  limite: number;
}

/** Software que se le exige a una sección, con la regla de comparación de versión. */
export interface SoftwareRequeridoInputSeccion {
  softwareId: string;
  comparacionVersion: ComparacionVersion;
}

export interface ResultadoEdicionSeccionDTO {
  seccion: SeccionAdminDTO;
  /** Alertas generadas por el cambio (por ejemplo: el laboratorio ya no tiene el software). */
  alertas: { id: string; tipo: string; motivo: string }[];
}

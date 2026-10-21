import type { TonoBadge } from '../components/ui/BadgeEstado';
import type {
  ComparacionVersion,
  EstadoAlerta,
  EstadoAsignacion,
  ReglaVerificacion,
  ResultadoVerificacionDTO,
  TipoAlerta,
  TipoEventoAuditoria,
  TipoEspacio,
} from '../types/admin';
import type { RolCuenta } from '../types/auth';
import type { DiaSemana } from '../types/consulta';
import type { EstadoAsignacionDTO } from '../types/horario';

/**
 * Vocabulario único de la interfaz. Los valores internos del backend (enums, códigos) nunca se
 * muestran tal cual: cada pantalla los traduce aquí, para que un mismo estado se llame igual y
 * tenga el mismo color en todo el producto.
 */

export interface EstadoVisual {
  etiqueta: string;
  tono: TonoBadge;
}

export const ETIQUETA_ROL: Record<RolCuenta, string> = {
  ALUMNO: 'Estudiante',
  DOCENTE: 'Docente',
  COORDINACION_ACADEMICA: 'Coordinación Académica',
  JEFATURA_LABORATORIOS: 'Jefatura de Laboratorios',
};

export const ETIQUETA_TIPO_ESPACIO: Record<TipoEspacio, string> = {
  AULA_TEORICA: 'Aula teórica',
  LABORATORIO: 'Laboratorio',
};

/** Plural para los filtros («Aulas teóricas», «Laboratorios»). */
export const ETIQUETA_TIPO_ESPACIO_PLURAL: Record<TipoEspacio, string> = {
  AULA_TEORICA: 'Aulas teóricas',
  LABORATORIO: 'Laboratorios',
};

export const ETIQUETA_TIPO_ALERTA: Record<TipoAlerta, string> = {
  SOFTWARE: 'Software',
  CAPACIDAD: 'Capacidad',
};

export const ESTADO_ALERTA: Record<EstadoAlerta, EstadoVisual> = {
  PENDIENTE: { etiqueta: 'Pendiente', tono: 'peligro' },
  RESUELTA: { etiqueta: 'Resuelta', tono: 'exito' },
};

/**
 * Estado de una asignación tal como lo ve quien coordina. «Escalada» es jerga del motor: para
 * la persona significa que la sección espera revisión.
 */
export const ESTADO_ASIGNACION: Record<EstadoAsignacion, EstadoVisual> = {
  VIGENTE: { etiqueta: 'Vigente', tono: 'exito' },
  ESCALADA: { etiqueta: 'En revisión', tono: 'advertencia' },
  HISTORICA: { etiqueta: 'Reemplazada', tono: 'neutro' },
};

/** Situación de una sección en el panel: lo que le importa a quien coordina es si tiene aula. */
export type EstadoSeccion = 'CON_AULA' | 'EN_REVISION' | 'SIN_ASIGNAR';

export const ESTADO_SECCION: Record<EstadoSeccion, EstadoVisual> = {
  CON_AULA: { etiqueta: 'Con aula', tono: 'exito' },
  EN_REVISION: { etiqueta: 'En revisión', tono: 'advertencia' },
  SIN_ASIGNAR: { etiqueta: 'Sin asignar', tono: 'neutro' },
};

/** Estado de la asignación de una clase, en las vistas del alumno y en la consulta pública. */
export const ESTADO_CLASE_ASIGNADA: Record<EstadoAsignacionDTO, EstadoVisual> = {
  VIGENTE: { etiqueta: 'Espacio confirmado', tono: 'exito' },
  ESCALADA: { etiqueta: 'En revisión', tono: 'advertencia' },
  PENDIENTE: { etiqueta: 'Sin aula asignada', tono: 'neutro' },
};

export const EVENTO_AUDITORIA: Record<TipoEventoAuditoria, EstadoVisual> = {
  ASIGNACION: { etiqueta: 'Asignación', tono: 'exito' },
  ESCALAMIENTO: { etiqueta: 'Enviada a revisión', tono: 'advertencia' },
  ALERTA: { etiqueta: 'Alerta', tono: 'peligro' },
  VERIFICACION: { etiqueta: 'Verificación', tono: 'info' },
};

export const ETIQUETA_COMPARACION_VERSION: Record<ComparacionVersion, string> = {
  CUALQUIERA: 'Cualquier versión',
  MINIMA: 'Versión mínima o superior',
  EXACTA: 'Versión exacta',
};

/** Nombre legible de cada regla dura del verificador (Issue 2.17). */
export const ETIQUETA_REGLA_VERIFICACION: Record<ReglaVerificacion, string> = {
  DOBLE_RESERVA: 'Sin doble reserva',
  CAPACIDAD_SUFICIENTE: 'Capacidad suficiente',
  TIPO_HOMOGENEO: 'Tipo de espacio correcto',
  BLOQUE_CONTIGUO: 'Bloque contiguo',
  SOFTWARE_COMPLETO: 'Software completo',
  ESCALADA_CON_MOTIVO: 'Secciones en revisión con motivo',
  UNA_VIGENTE_POR_SECCION: 'Una asignación vigente por sección',
};

const DIA_CORTO: Record<DiaSemana, string> = {
  LUNES: 'Lun',
  MARTES: 'Mar',
  MIERCOLES: 'Mié',
  JUEVES: 'Jue',
  VIERNES: 'Vie',
  SABADO: 'Sáb',
  DOMINGO: 'Dom',
};

const DIA_LARGO: Record<DiaSemana, string> = {
  LUNES: 'Lunes',
  MARTES: 'Martes',
  MIERCOLES: 'Miércoles',
  JUEVES: 'Jueves',
  VIERNES: 'Viernes',
  SABADO: 'Sábado',
  DOMINGO: 'Domingo',
};

/** «Lunes» o «Lun» a partir del enum; si llega un valor desconocido se devuelve tal cual. */
export function etiquetaDia(dia: string, corto = false): string {
  const tabla = corto ? DIA_CORTO : DIA_LARGO;
  return tabla[dia as DiaSemana] ?? dia;
}

/** «Lun 08:00 – 10:00»: un bloque de horario en lenguaje llano. */
export function formatearBloqueHorario(
  bloque: { diaSemana: string; horaInicio: string; horaFin: string },
  corto = true,
): string {
  return `${etiquetaDia(bloque.diaSemana, corto)} ${bloque.horaInicio.slice(0, 5)} – ${bloque.horaFin.slice(0, 5)}`;
}

/** «1 sección», «3 secciones»: plural sencillo para los conteos de la interfaz. */
export function plural(cantidad: number, singular: string, pluralTexto = `${singular}s`): string {
  return `${cantidad} ${cantidad === 1 ? singular : pluralTexto}`;
}

/**
 * Resumen en una línea del verificador: «Verificación correcta · 229 asignaciones · 0 problemas».
 * Es lo único que la pantalla necesita mostrar; el detalle por regla se abre bajo demanda.
 */
export function textoResumenVerificacion(verificacion: ResultadoVerificacionDTO | null): string {
  if (!verificacion) return 'Sin asignaciones que verificar';
  const revisadas = plural(verificacion.totalRevisadas, 'asignación', 'asignaciones');
  if (verificacion.conforme) return `Verificación correcta · ${revisadas} · 0 problemas`;
  return `Verificación con problemas · ${revisadas} · ${plural(verificacion.totalViolaciones, 'problema')}`;
}

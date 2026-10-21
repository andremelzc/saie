import { TEXTO_NO_DISPONIBLE } from '../config/textos';
import type { RolCuenta } from '../types/auth';

/**
 * Diccionarios únicos de los códigos del backend: cada código se traduce aquí a un texto para
 * personas y a un tono visual. Ninguna pantalla debe mostrar un código crudo ni mantener su
 * propia copia del mapa. Un código desconocido nunca rompe la pantalla: se muestra un texto
 * neutro y se avisa una sola vez en la consola.
 */

export type TonoEstado = 'exito' | 'peligro' | 'advertencia' | 'neutro' | 'info';

export interface EntradaEstado {
  etiqueta: string;
  tono: TonoEstado;
}

const avisados = new Set<string>();

/** Registra en consola, una sola vez por código, que falta una traducción. */
function avisarCodigoDesconocido(diccionario: string, codigo: string): void {
  const clave = `${diccionario}:${codigo}`;
  if (avisados.has(clave)) return;
  avisados.add(clave);
  console.warn(`[SAIE] El código «${codigo}» no tiene traducción en «${diccionario}».`);
}

/** Busca un código en un diccionario; si no existe devuelve `porDefecto` y lo registra. */
export function buscarEnDiccionario<T>(
  nombre: string,
  diccionario: Record<string, T>,
  codigo: string | null | undefined,
  porDefecto: T,
): T {
  if (codigo != null && Object.prototype.hasOwnProperty.call(diccionario, codigo)) {
    return diccionario[codigo];
  }
  if (codigo) avisarCodigoDesconocido(nombre, codigo);
  return porDefecto;
}

const DESCONOCIDO: EntradaEstado = { etiqueta: TEXTO_NO_DISPONIBLE, tono: 'neutro' };

/** Estado de una asignación de aula. Los textos son los acordados con Coordinación. */
export const ESTADO_ASIGNACION: Record<string, EntradaEstado> = {
  VIGENTE: { etiqueta: 'Aula confirmada', tono: 'exito' },
  ESCALADA: { etiqueta: 'En revisión', tono: 'advertencia' },
  PENDIENTE: { etiqueta: 'Sin aula asignada', tono: 'neutro' },
  HISTORICA: { etiqueta: 'Anterior', tono: 'neutro' },
};

export function describirEstadoAsignacion(estado: string | null | undefined): EntradaEstado {
  return buscarEnDiccionario('estado de asignación', ESTADO_ASIGNACION, estado, DESCONOCIDO);
}

/** Tipo de evento del registro de auditoría. */
export const EVENTO_AUDITORIA: Record<string, EntradaEstado> = {
  ASIGNACION: { etiqueta: 'Aula asignada', tono: 'exito' },
  ESCALAMIENTO: { etiqueta: 'Enviada a revisión', tono: 'advertencia' },
  ALERTA: { etiqueta: 'Alerta generada', tono: 'peligro' },
  VERIFICACION: { etiqueta: 'Comprobación', tono: 'info' },
};

export function describirEventoAuditoria(tipo: string | null | undefined): EntradaEstado {
  return buscarEnDiccionario('evento de auditoría', EVENTO_AUDITORIA, tipo, DESCONOCIDO);
}

/** Tipo de espacio. */
export const TIPO_ESPACIO: Record<string, string> = {
  AULA_TEORICA: 'Aula teórica',
  LABORATORIO: 'Laboratorio',
};

export function etiquetaTipoEspacio(tipo: string | null | undefined): string {
  return buscarEnDiccionario('tipo de espacio', TIPO_ESPACIO, tipo, TEXTO_NO_DISPONIBLE);
}

/** Tipo de alerta. */
export const TIPO_ALERTA: Record<string, string> = {
  SOFTWARE: 'Software',
  CAPACIDAD: 'Capacidad',
};

export function etiquetaTipoAlerta(tipo: string | null | undefined): string {
  return buscarEnDiccionario('tipo de alerta', TIPO_ALERTA, tipo, TEXTO_NO_DISPONIBLE);
}

/** Nombre del rol de la sesión. */
export const ROL: Record<RolCuenta, string> = {
  COORDINACION_ACADEMICA: 'Coordinación Académica',
  JEFATURA_LABORATORIOS: 'Jefatura de Laboratorios',
  ALUMNO: 'Estudiante',
  DOCENTE: 'Docente',
};

/** Campos de un espacio, con el artículo para frases como «puedes editar el código». */
export const CAMPO_ESPACIO: Record<string, string> = {
  identificador: 'el código',
  pabellon: 'el pabellón',
  piso: 'el piso',
  aforoNominal: 'la capacidad',
  contiguos: 'los espacios contiguos',
  habilitado: 'el estado',
  descripcionUso: 'el uso previsto',
  softwareIds: 'el software instalado',
  pcsMalogradas: 'las PCs malogradas',
};

/** Traduce un campo técnico; si no lo conoce devuelve una frase genérica, nunca la clave. */
export function etiquetaCampoEspacio(campo: string): string {
  return buscarEnDiccionario('campo de espacio', CAMPO_ESPACIO, campo, 'otros datos');
}

/** Regla del verificador posterior a la asignación automática. */
export const REGLA_VERIFICACION: Record<string, string> = {
  DOBLE_RESERVA: 'Sin doble reserva',
  CAPACIDAD_SUFICIENTE: 'Capacidad suficiente',
  TIPO_HOMOGENEO: 'Tipo de espacio correcto',
  BLOQUE_CONTIGUO: 'Bloque contiguo',
  SOFTWARE_COMPLETO: 'Software completo',
  ESCALADA_CON_MOTIVO: 'Escaladas con motivo',
  UNA_VIGENTE_POR_SECCION: 'Una asignación vigente por sección',
};

export function etiquetaReglaVerificacion(regla: string | null | undefined): string {
  return buscarEnDiccionario(
    'regla de verificación',
    REGLA_VERIFICACION,
    regla,
    TEXTO_NO_DISPONIBLE,
  );
}

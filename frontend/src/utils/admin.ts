import { RUTAS } from '../config/rutas';
import type { RolCuenta } from '../types/auth';
import { ROL } from './diccionarios';
import { ICONOS } from '../components/ui/iconos';

/** Todas las fechas se muestran en hora de Lima, estén donde estén la persona y el servidor. */
export const ZONA_HORARIA = 'America/Lima';

export function formatearFechaAlerta(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: ZONA_HORARIA,
  });
}

/** Fecha compacta para «Última carga: 12 oct, 10:32». */
export function formatearFechaCorta(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleString('es-PE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: ZONA_HORARIA,
  });
}

/**
 * «hace 5 min», «hace 3 h»; pasadas 24 horas (o si la fecha es futura) la fecha corta. Sirve para
 * lo que importa por su frescura, como la última carga o la detección de una alerta.
 */
export function formatearFechaRelativa(iso: string, ahora: Date = new Date()): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  const minutos = Math.round((ahora.getTime() - fecha.getTime()) / 60000);
  if (minutos < 0) return formatearFechaCorta(iso);
  if (minutos < 1) return 'ahora mismo';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  return formatearFechaCorta(iso);
}

export interface MotivoEscalamientoInfo {
  codigo: string | null;
  etiqueta: string;
  descripcion: string;
  accion: { etiqueta: string; to: string } | null;
}

const MOTIVOS_ESCALAMIENTO: Record<
  string,
  Omit<MotivoEscalamientoInfo, 'codigo' | 'descripcion'>
> = {
  SIN_HORARIOS_DEFINIDOS: {
    etiqueta: 'Sin horarios definidos',
    accion: { etiqueta: 'Cargar horario', to: `${RUTAS.cargaAdmin}#carga-horarios` },
  },
  SIN_ESPACIOS_DISPONIBLES: {
    etiqueta: 'Sin espacios del tipo requerido',
    accion: { etiqueta: 'Revisar espacios', to: RUTAS.espaciosAdmin },
  },
  CAPACIDAD_INSUFICIENTE: {
    etiqueta: 'Capacidad insuficiente',
    accion: { etiqueta: 'Revisar espacios', to: RUTAS.espaciosAdmin },
  },
  HORARIO_BLOQUEADO: {
    etiqueta: 'Horario ocupado',
    accion: { etiqueta: 'Revisar ocupación', to: RUTAS.espaciosAdmin },
  },
  SOFTWARE_FALTANTE: {
    etiqueta: 'Software faltante',
    accion: { etiqueta: 'Revisar laboratorios', to: RUTAS.espaciosAdmin },
  },
  CONTIGUEDAD_NO_ALCANZADA: {
    etiqueta: 'Sin bloque contiguo',
    accion: { etiqueta: 'Revisar espacios', to: RUTAS.espaciosAdmin },
  },
};

const MOTIVO_DESCONOCIDO = {
  etiqueta: 'Requiere revisión',
  accion: null,
} satisfies Omit<MotivoEscalamientoInfo, 'codigo' | 'descripcion'>;

/**
 * El backend guarda el motivo como `[CODIGO] descripción`. La UI muestra una etiqueta legible,
 * la descripción y una acción sugerida; el código queda solo como referencia de soporte.
 */
export function describirMotivoEscalamiento(
  motivo: string | null | undefined,
): MotivoEscalamientoInfo {
  const texto = motivo?.trim() ?? '';
  const coincidencia = texto.match(/^\[([A-Z0-9_]+)\]\s*(.*)$/s);
  const codigo = coincidencia?.[1] ?? null;
  const descripcion = (coincidencia?.[2] ?? texto).trim();
  const definicion = (codigo && MOTIVOS_ESCALAMIENTO[codigo]) || MOTIVO_DESCONOCIDO;

  return {
    codigo,
    etiqueta: definicion.etiqueta,
    descripcion: descripcion || 'Sin motivo registrado.',
    accion: definicion.accion,
  };
}

const T_INICIO = 'M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10';
const T_ALERTA = ICONOS.alerta;
const T_CARGA = ICONOS.subir;
const T_ESPACIOS = ICONOS.edificio;
const T_LAB = ICONOS.monitor;
const T_SECCIONES = ICONOS.libro;
const T_AUDITORIA = ICONOS.portapapeles;
const T_REPORTE = ICONOS.documento;

interface Pestana {
  to: string;
  etiqueta: string;
  trazo: string;
  /**
   * La pestaña solo aparece desde el ancho de escritorio. A 320 px la barra inferior del
   * panel no cabe con las siete secciones, y una barra con scroll horizontal es peor que
   * una barra de cuatro destinos: las demas se llegan desde los accesos del inicio.
   */
  soloEscritorio?: boolean;
}

export function pestanasDeRol(rol?: RolCuenta): Pestana[] {
  if (rol === 'JEFATURA_LABORATORIOS') {
    return [
      { to: RUTAS.inicioAdmin, etiqueta: 'Inicio', trazo: T_INICIO },
      { to: RUTAS.alertasAdmin, etiqueta: 'Alertas', trazo: T_ALERTA },
      { to: RUTAS.cambioLaboratorio, etiqueta: 'Laboratorio', trazo: T_LAB },
    ];
  }
  return [
    { to: RUTAS.inicioAdmin, etiqueta: 'Inicio', trazo: T_INICIO },
    { to: RUTAS.espaciosAdmin, etiqueta: 'Espacios', trazo: T_ESPACIOS },
    {
      to: RUTAS.seccionesAdmin,
      etiqueta: 'Secciones',
      trazo: T_SECCIONES,
      soloEscritorio: true,
    },
    { to: RUTAS.alertasAdmin, etiqueta: 'Alertas', trazo: T_ALERTA },
    { to: RUTAS.cargaAdmin, etiqueta: 'Carga', trazo: T_CARGA },
    {
      to: RUTAS.auditoriaAdmin,
      etiqueta: 'Auditoría',
      trazo: T_AUDITORIA,
      soloEscritorio: true,
    },
    {
      to: RUTAS.reporteSalonesAdmin,
      etiqueta: 'Informe',
      trazo: T_REPORTE,
      soloEscritorio: true,
    },
  ];
}

/**
 * Nombre legible del rol de la sesión (los cuatro roles, ver `utils/diccionarios.ts`). Sin sesión
 * se rotula como «Administrativo», que es lo que ya mostraba el panel.
 */
export function etiquetaRol(rol?: RolCuenta): string {
  return rol ? ROL[rol] : 'Administrativo';
}

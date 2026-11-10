import { RUTAS } from '../config/rutas';
import type { RolCuenta } from '../types/auth';
import { ROL } from './diccionarios';
import { ICONOS } from '../components/ui/iconos';

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

const T_INICIO = ICONOS.inicio;
const T_ALERTA = ICONOS.alerta;
const T_CARGA = ICONOS.subir;
const T_ESPACIOS = ICONOS.edificio;
const T_LAB = ICONOS.monitor;
const T_SECCIONES = ICONOS.libro;
const T_AUDITORIA = ICONOS.portapapeles;
const T_REPORTE = ICONOS.documento;
const T_MAPA = ICONOS.mapa;

/**
 * Pestañas del panel. La barra va abajo por debajo de `lg` y arriba desde `lg`; en ambos casos
 * mide el ancho disponible y manda a «Más» solo las que no caben (`BarraPestanas`), sin
 * depender de un ancho en píxeles. Las listas y tablas usan tarjetas por debajo de `lg`.
 */
export interface Pestana {
  to: string;
  etiqueta: string;
  trazo: string;
  /**
   * Pestaña secundaria: cuando la barra no cabe, es la primera que pasa al menú «Más» (de la
   * última a la primera); después siguen las principales, de la última a la primera.
   */
  secundaria?: boolean;
}

export function pestanasDeRol(rol?: RolCuenta): Pestana[] {
  if (rol === 'JEFATURA_LABORATORIOS') {
    return [
      { to: RUTAS.inicioAdmin, etiqueta: 'Inicio', trazo: T_INICIO },
      { to: RUTAS.alertasAdmin, etiqueta: 'Alertas', trazo: T_ALERTA },
      // Issue 7.11: bandeja de incidencias que reportan los docentes.
      { to: RUTAS.incidenciasAdmin, etiqueta: 'Incidencias', trazo: T_AUDITORIA },
      { to: RUTAS.laboratoriosAdmin, etiqueta: 'Laboratorios', trazo: T_LAB },
      // El reporte de cambios también sale de cada tarjeta de «Laboratorios».
      { to: RUTAS.cambioLaboratorio, etiqueta: 'Cambio', trazo: T_CARGA, secundaria: true },
    ];
  }
  return [
    { to: RUTAS.inicioAdmin, etiqueta: 'Inicio', trazo: T_INICIO },
    { to: RUTAS.espaciosAdmin, etiqueta: 'Espacios', trazo: T_ESPACIOS },
    {
      to: RUTAS.seccionesAdmin,
      etiqueta: 'Secciones',
      trazo: T_SECCIONES,
      secundaria: true,
    },
    { to: RUTAS.alertasAdmin, etiqueta: 'Alertas', trazo: T_ALERTA },
    { to: RUTAS.cargaAdmin, etiqueta: 'Carga', trazo: T_CARGA },
    {
      to: RUTAS.auditoriaAdmin,
      etiqueta: 'Historial',
      trazo: T_AUDITORIA,
      secundaria: true,
    },
    { to: RUTAS.mapaAdmin, etiqueta: 'Mapa', trazo: T_MAPA, secundaria: true },
    {
      to: RUTAS.reporteSalonesAdmin,
      etiqueta: 'Informe',
      trazo: T_REPORTE,
      secundaria: true,
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

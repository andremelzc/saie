import { RUTAS } from '../config/rutas';
import type { RolCuenta } from '../types/auth';

export function formatearFechaAlerta(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const T_INICIO = 'M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10';
const T_ALERTA =
  'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z';
const T_CARGA = 'M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0-12l-4 4m4-4l4 4';
const T_ESPACIOS = 'M3 21h18M5 21V7l7-4 7 4v14M9 9h1m4 0h1M9 13h1m4 0h1M9 17h1m4 0h1';
const T_LAB =
  'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z';

interface Pestana {
  to: string;
  etiqueta: string;
  trazo: string;
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
    { to: RUTAS.alertasAdmin, etiqueta: 'Alertas', trazo: T_ALERTA },
    { to: RUTAS.cargaAdmin, etiqueta: 'Carga', trazo: T_CARGA },
  ];
}

export function etiquetaRol(rol?: RolCuenta): string {
  if (rol === 'JEFATURA_LABORATORIOS') return 'Jefatura de Laboratorios';
  if (rol === 'COORDINACION_ACADEMICA') return 'Coordinación Académica';
  return 'Administrativo';
}

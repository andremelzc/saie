import type { DiaSemana, EspacioAsignadoDTO, TipoEspacio } from '../types/consulta';
import type { EstadoAsignacionDTO, HorarioSemanalDTO, SesionDTO } from '../types/horario';

/** Días con clases (Lunes a Sábado, Guía de diseño 2.3). */
export const DIAS_LECTIVOS: DiaSemana[] = [
  'LUNES',
  'MARTES',
  'MIERCOLES',
  'JUEVES',
  'VIERNES',
  'SABADO',
];

export const ETIQUETA_DIA: Record<DiaSemana, string> = {
  LUNES: 'Lunes',
  MARTES: 'Martes',
  MIERCOLES: 'Miércoles',
  JUEVES: 'Jueves',
  VIERNES: 'Viernes',
  SABADO: 'Sábado',
  DOMINGO: 'Domingo',
};

export const ABREVIATURA_DIA: Record<DiaSemana, string> = {
  LUNES: 'Lun',
  MARTES: 'Mar',
  MIERCOLES: 'Mié',
  JUEVES: 'Jue',
  VIERNES: 'Vie',
  SABADO: 'Sáb',
  DOMINGO: 'Dom',
};

/** Franja visible de la grilla semanal: de 08:00 a 22:00. */
export const HORA_INICIO_GRILLA = 8;
export const HORA_FIN_GRILLA = 22;
export const ALTO_HORA_PX = 64;
export const HORAS_GRILLA: number[] = Array.from(
  { length: HORA_FIN_GRILLA - HORA_INICIO_GRILLA },
  (_, i) => HORA_INICIO_GRILLA + i,
);

const MINUTOS_INICIO_GRILLA = HORA_INICIO_GRILLA * 60;
const MINUTOS_FIN_GRILLA = HORA_FIN_GRILLA * 60;

const DIA_POR_INDICE_JS: DiaSemana[] = [
  'DOMINGO',
  'LUNES',
  'MARTES',
  'MIERCOLES',
  'JUEVES',
  'VIERNES',
  'SABADO',
];

/** Convierte "HH:mm" (o "HH:mm:ss") en minutos desde las 00:00. */
export function aMinutos(hora: string): number {
  const [horas = '0', minutos = '0'] = hora.split(':');
  return Number(horas) * 60 + Number(minutos);
}

export function formatearHora(hora: string): string {
  return hora.slice(0, 5);
}

export function formatearRango(horaInicio: string, horaFin: string): string {
  return `${formatearHora(horaInicio)} – ${formatearHora(horaFin)}`;
}

export function fechaActual(): Date {
  return new Date();
}

export function diaDeFecha(fecha: Date): DiaSemana {
  return DIA_POR_INDICE_JS[fecha.getDay()];
}

/** Día que se muestra al abrir la vista diaria: hoy, o el lunes si hoy es domingo. */
export function diaLectivoInicial(fecha: Date): DiaSemana {
  const dia = diaDeFecha(fecha);
  return dia === 'DOMINGO' ? 'LUNES' : dia;
}

export function minutosDeFecha(fecha: Date): number {
  return fecha.getHours() * 60 + fecha.getMinutes();
}

export function ordenarSesiones(sesiones: SesionDTO[]): SesionDTO[] {
  return [...sesiones].sort(
    (a, b) =>
      aMinutos(a.horaInicio) - aMinutos(b.horaInicio) || a.codigoCurso.localeCompare(b.codigoCurso),
  );
}

export function sesionesDeDia(horario: HorarioSemanalDTO, dia: DiaSemana): SesionDTO[] {
  return ordenarSesiones(horario.dias[dia] ?? []);
}

export function todasLasSesiones(horario: HorarioSemanalDTO): SesionDTO[] {
  return Object.values(horario.dias).flatMap((sesiones) => sesiones ?? []);
}

export type EstadoClase = 'EN_CURSO' | 'PROXIMA' | 'FINALIZADA';

export function estadoDeClase(
  sesion: Pick<SesionDTO, 'horaInicio' | 'horaFin'>,
  ahoraEnMinutos: number,
): EstadoClase {
  if (ahoraEnMinutos >= aMinutos(sesion.horaFin)) return 'FINALIZADA';
  if (ahoraEnMinutos >= aMinutos(sesion.horaInicio)) return 'EN_CURSO';
  return 'PROXIMA';
}

/** Posición vertical de un bloque dentro de la grilla, en porcentaje de su alto total. */
export function posicionBloque(
  horaInicio: string,
  horaFin: string,
): { top: number; height: number } {
  const total = MINUTOS_FIN_GRILLA - MINUTOS_INICIO_GRILLA;
  const inicio = Math.max(aMinutos(horaInicio), MINUTOS_INICIO_GRILLA);
  const fin = Math.min(aMinutos(horaFin), MINUTOS_FIN_GRILLA);
  return {
    top: ((inicio - MINUTOS_INICIO_GRILLA) / total) * 100,
    height: (Math.max(fin - inicio, 0) / total) * 100,
  };
}

export function etiquetaTipoEspacio(tipo: TipoEspacio): string {
  return tipo === 'LABORATORIO' ? 'Laboratorio' : 'Aula teórica';
}

export function etiquetaTipoCorta(tipo: TipoEspacio): string {
  return tipo === 'LABORATORIO' ? 'Lab.' : 'Teoría';
}

/** Ubicación compacta para los bloques de la grilla, p. ej. "Lab. L-204". */
export function resumenUbicacion(espacios: EspacioAsignadoDTO[]): string {
  if (espacios.length === 0) return 'Por asignar';
  return espacios.map((e) => `${etiquetaTipoCorta(e.tipo)} ${e.identificador}`).join(', ');
}

/**
 * Estado de asignación que se debe destacar con un badge: cualquier estado distinto de
 * VIGENTE, o "pendiente" cuando el espacio aún no llegó aunque el estado diga VIGENTE.
 */
export function estadoAMostrar(
  estado: EstadoAsignacionDTO,
  cantidadEspacios: number,
): EstadoAsignacionDTO | null {
  if (estado !== 'VIGENTE') return estado;
  return cantidadEspacios === 0 ? 'PENDIENTE' : null;
}

export interface ColorCurso {
  fondo: string;
  borde: string;
}

/**
 * Colores por curso (neutros, sin tonos de estado: la Guía reserva verde, rojo, naranja y
 * amarillo para ocupación y alertas). El texto siempre es #222222 sobre estos fondos.
 */
export const PALETA_CURSOS: ColorCurso[] = [
  { fondo: '#E3F2FD', borde: '#1565C0' },
  { fondo: '#EDE7F6', borde: '#5E35B1' },
  { fondo: '#E0F2F1', borde: '#00695C' },
  { fondo: '#EFEBE9', borde: '#6D4C41' },
  { fondo: '#F3E5F5', borde: '#8E24AA' },
  { fondo: '#E8EAF6', borde: '#3949AB' },
  { fondo: '#ECEFF1', borde: '#455A64' },
  { fondo: '#FCE4EC', borde: '#AD1457' },
];

/** Asigna un color estable a cada código de curso (orden alfabético). */
export function asignarColoresCursos(codigos: string[]): Record<string, ColorCurso> {
  const unicos = [...new Set(codigos)].sort((a, b) => a.localeCompare(b));
  return Object.fromEntries(
    unicos.map((codigo, i) => [codigo, PALETA_CURSOS[i % PALETA_CURSOS.length]]),
  );
}

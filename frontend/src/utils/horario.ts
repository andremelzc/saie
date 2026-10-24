import type {
  DiaSemana,
  EspacioAsignadoDTO,
  HorarioConsultaDTO,
  TipoEspacio,
} from '../types/consulta';
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

/** Color de un curso: depende solo de su código, así que no cambia entre pantallas (Issue 3.40). */
export function colorDeCurso(codigo: string): ColorCurso {
  // Hash djb2 del código: estable, sin estado compartido y sin depender de qué otros cursos
  // aparezcan en la pantalla.
  let hash = 5381;
  for (let i = 0; i < codigo.length; i++) {
    hash = ((hash << 5) + hash + codigo.charCodeAt(i)) >>> 0;
  }
  return PALETA_CURSOS[hash % PALETA_CURSOS.length];
}

/** Color de cada código de curso (ver `colorDeCurso`): el mismo en Inicio, Horario y Mis cursos. */
export function asignarColoresCursos(codigos: string[]): Record<string, ColorCurso> {
  return Object.fromEntries([...new Set(codigos)].map((codigo) => [codigo, colorDeCurso(codigo)]));
}

/** «Buenos días», «Buenas tardes» o «Buenas noches» según la hora. */
export function saludoSegunHora(fecha: Date): string {
  const hora = fecha.getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/** Minutos → «35 min», «1 h» o «1 h 20 min». */
export function formatearMinutos(minutos: number): string {
  const total = Math.max(0, Math.round(minutos));
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** «Empieza en 35 min» o «Termina en 20 min», según el estado de la clase. */
export function cuentaRegresiva(
  sesion: Pick<SesionDTO, 'horaInicio' | 'horaFin'>,
  ahoraEnMinutos: number,
): string {
  const estado = estadoDeClase(sesion, ahoraEnMinutos);
  if (estado === 'EN_CURSO') {
    return `Termina en ${formatearMinutos(aMinutos(sesion.horaFin) - ahoraEnMinutos)}`;
  }
  if (estado === 'PROXIMA') {
    return `Empieza en ${formatearMinutos(aMinutos(sesion.horaInicio) - ahoraEnMinutos)}`;
  }
  return 'Ya terminó';
}

/** ¿El bloque de horario se cruza con la franja dada (mismo día y horas que se solapan)? */
export function haySolape(
  bloque: { diaSemana: DiaSemana; horaInicio: string; horaFin: string },
  franja: { diaSemana: DiaSemana; horaInicio: string; horaFin: string },
): boolean {
  return (
    bloque.diaSemana === franja.diaSemana &&
    aMinutos(bloque.horaInicio) < aMinutos(franja.horaFin) &&
    aMinutos(bloque.horaFin) > aMinutos(franja.horaInicio)
  );
}

/**
 * Cursos que tienen clase en la franja dada. Sirve para marcar «tu aula» en el mapa solo cuando
 * de verdad tienes clase ahí en ese momento (un domingo no debe marcar ninguna).
 */
export function cursosEnFranja<T extends { horarios: HorarioConsultaDTO[] }>(
  cursos: T[],
  franja: { diaSemana: DiaSemana; horaInicio: string; horaFin: string },
): T[] {
  return cursos.filter((curso) => curso.horarios.some((h) => haySolape(h, franja)));
}

/** Primer día lectivo posterior a `hoy` (dando la vuelta a la semana) que tenga clases. */
export function proximoDiaConClases(
  horario: HorarioSemanalDTO,
  hoy: DiaSemana,
): { dia: DiaSemana; sesiones: SesionDTO[] } | null {
  const orden: DiaSemana[] = [...DIAS_LECTIVOS, 'DOMINGO'];
  const inicio = orden.indexOf(hoy);
  for (let paso = 1; paso <= 7; paso += 1) {
    const dia = orden[(inicio + paso) % orden.length];
    if (dia === 'DOMINGO') continue;
    const sesiones = sesionesDeDia(horario, dia);
    if (sesiones.length > 0) return { dia, sesiones };
  }
  return null;
}

export interface ResumenSemana {
  clases: number;
  cursos: number;
  diasConClase: number;
  /** Total de minutos de clase a la semana. */
  minutos: number;
}
export function resumenSemana(horario: HorarioSemanalDTO): ResumenSemana {
  const sesiones = todasLasSesiones(horario);
  return {
    clases: sesiones.length,
    cursos: new Set(sesiones.map((s) => s.codigoCurso)).size,
    diasConClase: DIAS_LECTIVOS.filter((d) => (horario.dias[d] ?? []).length > 0).length,
    minutos: sesiones.reduce(
      (total, s) => total + (aMinutos(s.horaFin) - aMinutos(s.horaInicio)),
      0,
    ),
  };
}

/** Avance de una clase de 0 a 1 (0 si no empezó, 1 si ya terminó). */
export function progresoClase(
  sesion: Pick<SesionDTO, 'horaInicio' | 'horaFin'>,
  ahoraEnMinutos: number,
): number {
  const inicio = aMinutos(sesion.horaInicio);
  const duracion = aMinutos(sesion.horaFin) - inicio;
  if (duracion <= 0) return 0;
  return Math.min(1, Math.max(0, (ahoraEnMinutos - inicio) / duracion));
}

/** Un curso con las secciones que lo componen (p. ej. la teórica y su laboratorio). */
export interface GrupoCurso<T> {
  codigoCurso: string;
  nombreCurso: string;
  secciones: T[];
}

/**
 * Agrupa por curso: el bloque real es el curso (identificado por su código) y las secciones son
 * sus partes. Sin esta agrupación, un curso con teoría y laboratorio aparecería duplicado y se
 * contaría como dos cursos distintos. Los grupos se ordenan por código de curso y las secciones
 * por código de sección.
 */
export function agruparPorCurso<
  T extends { codigoCurso: string; nombreCurso: string; codigoSeccion: string },
>(items: T[]): GrupoCurso<T>[] {
  const grupos = new Map<string, GrupoCurso<T>>();

  for (const item of items) {
    const existente = grupos.get(item.codigoCurso);
    if (existente) {
      existente.secciones.push(item);
    } else {
      grupos.set(item.codigoCurso, {
        codigoCurso: item.codigoCurso,
        nombreCurso: item.nombreCurso,
        secciones: [item],
      });
    }
  }

  return [...grupos.values()]
    .map((grupo) => ({
      ...grupo,
      secciones: [...grupo.secciones].sort((a, b) =>
        a.codigoSeccion.localeCompare(b.codigoSeccion, 'es', { numeric: true }),
      ),
    }))
    .sort((a, b) => a.codigoCurso.localeCompare(b.codigoCurso));
}

import { DiaSemana, EstadoAsignacion, Prisma } from '@prisma/client';
import { EspacioAsignadoDTO } from '../types/consulta';
import { SesionDTO } from '../types/portal';

/** Orden de los días en una grilla semanal (Lunes a Domingo). */
export const ORDEN_DIAS: DiaSemana[] = [
  DiaSemana.LUNES,
  DiaSemana.MARTES,
  DiaSemana.MIERCOLES,
  DiaSemana.JUEVES,
  DiaSemana.VIERNES,
  DiaSemana.SABADO,
  DiaSemana.DOMINGO,
];

const ZONA_HORARIA = 'America/Lima';

const DIA_POR_NOMBRE: Record<string, DiaSemana> = {
  monday: DiaSemana.LUNES,
  tuesday: DiaSemana.MARTES,
  wednesday: DiaSemana.MIERCOLES,
  thursday: DiaSemana.JUEVES,
  friday: DiaSemana.VIERNES,
  saturday: DiaSemana.SABADO,
  sunday: DiaSemana.DOMINGO,
};

/**
 * Include de Prisma compartido por las vistas de horario (alumno y docente): la sección con
 * su curso, docente, horarios y su asignación más reciente (vigente o escalada) con espacios.
 */
export const INCLUIR_SECCION_CON_ASIGNACION = {
  curso: true,
  docente: true,
  horarios: true,
  asignaciones: {
    where: { estado: { in: [EstadoAsignacion.VIGENTE, EstadoAsignacion.ESCALADA] } },
    orderBy: { fechaAsignacion: 'desc' },
    take: 1,
    include: { espacios: { include: { espacio: true } } },
  },
} satisfies Prisma.SeccionInclude;

export type SeccionConAsignacion = Prisma.SeccionGetPayload<{
  include: typeof INCLUIR_SECCION_CON_ASIGNACION;
}>;

/** Convierte "miércoles", "Miercoles" o "MIERCOLES" en un DiaSemana; `null` si no es válido. */
export function normalizarDia(valor: string): DiaSemana | null {
  const limpio = valor.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  return ORDEN_DIAS.find((d) => d === limpio) ?? null;
}

export function minutosDesdeHora(hora: string): number {
  const [h, m] = hora.split(':').map((p) => parseInt(p, 10));
  return (h || 0) * 60 + (m || 0);
}

export function formatearHora(minutos: number): string {
  const h = Math.floor(minutos / 60) % 24;
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Día de la semana y minutos desde medianoche de un instante, en hora de Lima. */
export function diaYMinutosEnLima(fecha: Date): { dia: DiaSemana; minutos: number } {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA_HORARIA,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(fecha);

  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '';
  return {
    dia: DIA_POR_NOMBRE[valor('weekday').toLowerCase()],
    minutos: parseInt(valor('hour'), 10) * 60 + parseInt(valor('minute'), 10),
  };
}

export function mapearEspacios(seccion: SeccionConAsignacion): EspacioAsignadoDTO[] {
  const asignacion = seccion.asignaciones[0];
  if (!asignacion) return [];
  return asignacion.espacios.map((ae) => ({
    id: ae.espacio.id,
    identificador: ae.espacio.identificador,
    tipo: ae.espacio.tipo,
    pabellon: ae.espacio.pabellon,
    piso: ae.espacio.piso,
  }));
}

export function estadoDeSeccion(
  seccion: SeccionConAsignacion,
): 'VIGENTE' | 'ESCALADA' | 'PENDIENTE' {
  const asignacion = seccion.asignaciones[0];
  return asignacion ? (asignacion.estado as 'VIGENTE' | 'ESCALADA') : 'PENDIENTE';
}

/** Una sesión por cada bloque de horario de las secciones dadas. */
export function construirSesiones(secciones: SeccionConAsignacion[]): SesionDTO[] {
  return secciones.flatMap((seccion) => {
    const espacios = mapearEspacios(seccion);
    const estadoAsignacion = estadoDeSeccion(seccion);
    return seccion.horarios.map((h) => ({
      seccionId: seccion.id,
      codigoCurso: seccion.curso.codigo,
      nombreCurso: seccion.curso.nombre,
      codigoSeccion: seccion.codigoSeccion,
      docenteNombre: seccion.docente ? seccion.docente.nombre : null,
      diaSemana: h.diaSemana,
      horaInicio: h.horaInicio,
      horaFin: h.horaFin,
      espacios,
      estadoAsignacion,
    }));
  });
}

/**
 * Agrupa las sesiones por día (ordenadas por hora). Con `dia` devuelve solo ese día (vista
 * por día); sin él devuelve la semana completa, con los días sin clases como lista vacía.
 */
export function agruparPorDia(
  sesiones: SesionDTO[],
  dia?: DiaSemana,
): Partial<Record<DiaSemana, SesionDTO[]>> {
  const dias = dia ? [dia] : ORDEN_DIAS.filter((d) => d !== DiaSemana.DOMINGO);
  const resultado: Partial<Record<DiaSemana, SesionDTO[]>> = {};

  for (const d of dias) {
    resultado[d] = sesiones
      .filter((s) => s.diaSemana === d)
      .sort(
        (a, b) =>
          minutosDesdeHora(a.horaInicio) - minutosDesdeHora(b.horaInicio) ||
          a.codigoCurso.localeCompare(b.codigoCurso),
      );
  }

  // Domingo solo aparece en la semana completa si realmente hay clases.
  if (!dia && sesiones.some((s) => s.diaSemana === DiaSemana.DOMINGO)) {
    resultado[DiaSemana.DOMINGO] = sesiones.filter((s) => s.diaSemana === DiaSemana.DOMINGO);
  }

  return resultado;
}

const MINUTOS_SEMANA = 7 * 24 * 60;

/**
 * Siguiente sesión de una sección a partir de `ahora`: la que está en curso o la próxima que
 * empiece (si ya pasaron todas las de la semana, la primera de la semana siguiente).
 */
export function proximaSesion<
  T extends { diaSemana: DiaSemana; horaInicio: string; horaFin: string },
>(horarios: T[], ahora: Date): T | null {
  if (horarios.length === 0) return null;

  const { dia, minutos } = diaYMinutosEnLima(ahora);
  const minutoActualSemana = ORDEN_DIAS.indexOf(dia) * 1440 + minutos;

  let mejor: T | null = null;
  let mejorEspera = Infinity;

  for (const h of horarios) {
    const base = ORDEN_DIAS.indexOf(h.diaSemana) * 1440;
    const inicio = base + minutosDesdeHora(h.horaInicio);
    const fin = base + minutosDesdeHora(h.horaFin);

    let espera: number;
    if (minutoActualSemana >= inicio && minutoActualSemana < fin) {
      espera = 0; // en curso
    } else {
      espera = (inicio - minutoActualSemana + MINUTOS_SEMANA) % MINUTOS_SEMANA;
    }

    if (espera < mejorEspera) {
      mejorEspera = espera;
      mejor = h;
    }
  }

  return mejor;
}

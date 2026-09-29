import { DiaSemana, EstadoAsignacion, TipoEspacio } from '@prisma/client';

export interface HorarioSlot {
  diaSemana: DiaSemana;
  horaInicio: string; // Formato "HH:mm" o "HH:mm:ss"
  horaFin: string; // Formato "HH:mm" o "HH:mm:ss"
}

export interface AsignacionOcupacionInput {
  id: string;
  estado: EstadoAsignacion;
  espacioIds: string[];
  horarios: HorarioSlot[];
}

export interface EspacioBase {
  id: string;
  identificador: string;
  tipo: TipoEspacio;
  pabellon?: string;
  piso?: number;
  aforoNominal?: number;
  pcsMalogradas?: number | null;
  softwareInstalado?: string[];
}

/**
 * Convierte una hora en formato "HH:mm" o "HH:mm:ss" a minutos desde medianoche (0 a 1439).
 */
export function parsearHoraAMinutos(horaStr: string): number {
  const partes = horaStr.split(':').map((p) => parseInt(p, 10));
  const horas = partes[0] || 0;
  const minutos = partes[1] || 0;
  return horas * 60 + minutos;
}

/**
 * Determina si dos franjas horarias se solapan.
 * - Requiere coincidencia de día de la semana.
 * - Se solapan si y solo si max(inicio1, inicio2) < min(fin1, fin2).
 * - Un rango que termina justo cuando otro empieza NO se solapa (ej. 10:00 y 10:00).
 */
export function haySolapamientoHorario(slot1: HorarioSlot, slot2: HorarioSlot): boolean {
  if (slot1.diaSemana !== slot2.diaSemana) {
    return false;
  }

  const inicio1 = parsearHoraAMinutos(slot1.horaInicio);
  const fin1 = parsearHoraAMinutos(slot1.horaFin);
  const inicio2 = parsearHoraAMinutos(slot2.horaInicio);
  const fin2 = parsearHoraAMinutos(slot2.horaFin);

  return Math.max(inicio1, inicio2) < Math.min(fin1, fin2);
}

/**
 * Issue 2.4: Calcula la disponibilidad de espacios por horario al vuelo.
 *
 * - Solo evalúa asignaciones con estado VIGENTE (ignora HISTORICA y ESCALADA).
 * - Detecta solapes parciales o totales de horario en el mismo día.
 * - Filtra únicamente espacios que coincidan con el TipoEspacio solicitado.
 * - Un espacio ocupado en la franja nunca aparece como disponible.
 */
export function calcularEspaciosDisponibles<T extends EspacioBase>(
  horarioRequerido: HorarioSlot,
  tipoEspacioRequerido: TipoEspacio,
  todosLosEspacios: T[],
  asignaciones: AsignacionOcupacionInput[],
): T[] {
  // 1. Filtrar espacios por el tipo requerido
  const espaciosCandidatos = todosLosEspacios.filter((esp) => esp.tipo === tipoEspacioRequerido);

  // 2. Determinar IDs de espacios ocupados en esa franja
  const idsEspaciosOcupados = new Set<string>();

  for (const asignacion of asignaciones) {
    // Solo asignaciones VIGENTES reservan espacio físicamente
    if (asignacion.estado !== EstadoAsignacion.VIGENTE) {
      continue;
    }

    const solapa = asignacion.horarios.some((slot) =>
      haySolapamientoHorario(slot, horarioRequerido),
    );

    if (solapa) {
      for (const espId of asignacion.espacioIds) {
        idsEspaciosOcupados.add(espId);
      }
    }
  }

  // 3. Retornar solo los espacios no ocupados
  return espaciosCandidatos.filter((esp) => !idsEspaciosOcupados.has(esp.id));
}

/**
 * Consulta en base de datos los espacios disponibles para una franja y tipo determinado.
 */
export async function consultarEspaciosDisponibles(
  horarioRequerido: HorarioSlot,
  tipoEspacioRequerido: TipoEspacio,
  prisma: {
    espacio: {
      findMany: (args: any) => Promise<any[]>;
    };
    asignacion: {
      findMany: (args: any) => Promise<any[]>;
    };
  },
): Promise<any[]> {
  const [todosLosEspacios, asignacionesVigentes] = await Promise.all([
    prisma.espacio.findMany({
      where: { tipo: tipoEspacioRequerido },
    }),
    prisma.asignacion.findMany({
      where: { estado: EstadoAsignacion.VIGENTE },
      include: {
        asignacionesEspacio: true,
        seccion: {
          include: {
            horarios: true,
          },
        },
      },
    }),
  ]);

  const asignacionesMapeadas: AsignacionOcupacionInput[] = asignacionesVigentes.map(
    (asig: any) => ({
      id: asig.id,
      estado: asig.estado,
      espacioIds: (asig.asignacionesEspacio || []).map((ae: any) => ae.espacioId),
      horarios: (asig.seccion?.horarios || []).map((h: any) => ({
        diaSemana: h.diaSemana,
        horaInicio: h.horaInicio,
        horaFin: h.horaFin,
      })),
    }),
  );

  return calcularEspaciosDisponibles(
    horarioRequerido,
    tipoEspacioRequerido,
    todosLosEspacios,
    asignacionesMapeadas,
  );
}

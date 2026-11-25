import { PrismaClient } from '@prisma/client';
import { HttpError } from '../lib/http';
import { ResumenAsignacionDTO } from '../types/asignacionDemanda';
import { ejecutarReorganizacionConPrioridad } from './asignacionDemanda.service';
import { simularReorganizacion, SimulacionReorganizacion } from './motor.service';
import { obtenerPeriodoVigente } from './periodo.service';

/**
 * Issue 2.26 (riesgo R9): «Reorganizar con prioridad» solo tiene sentido al inicio del ciclo, cuando
 * los cambios de aula son normales. Con las clases en curso, la salida para una escalada es la
 * asignación manual (2.23).
 *
 * Cuántas semanas dura esa ventana es una decisión del equipo que sigue abierta (Anexo C, 6.15):
 * por eso se configura con `REORGANIZACION_SEMANAS` (2 por defecto) y cuenta desde la fecha de
 * inicio del periodo vigente que Coordinación registra en Periodos (4.64).
 */

export const SEMANAS_POR_DEFECTO = 2;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

export interface EstadoReorganizacionDTO {
  disponible: boolean;
  /** Por qué no está disponible; `null` si lo está. */
  motivo: string | null;
  periodo: string | null;
  semanas: number;
  /** Primer y último día de la ventana (AAAA-MM-DD); `null` si el periodo no tiene fecha de inicio. */
  desde: string | null;
  hasta: string | null;
}

export interface VistaPreviaReorganizacionDTO extends EstadoReorganizacionDTO {
  /** Solo si está disponible. */
  simulacion: SimulacionReorganizacion | null;
}

/** Semanas de la ventana: `REORGANIZACION_SEMANAS` si es un entero ≥ 0, si no el valor por defecto. */
export function semanasDeReorganizacion(valor = process.env.REORGANIZACION_SEMANAS): number {
  const n = Number(valor);
  return valor !== undefined && valor.trim() !== '' && Number.isInteger(n) && n >= 0
    ? n
    : SEMANAS_POR_DEFECTO;
}

const aDia = (fecha: Date) => fecha.toISOString().slice(0, 10);

/** ¿Se puede reorganizar hoy? Desde la fecha de inicio del periodo vigente hasta N semanas después. */
export async function estadoReorganizacion(
  prisma: PrismaClient,
  ahora: Date = new Date(),
): Promise<EstadoReorganizacionDTO> {
  const semanas = semanasDeReorganizacion();
  const base = { periodo: null, semanas, desde: null, hasta: null };
  const periodo = await obtenerPeriodoVigente(prisma);
  if (!periodo) {
    return { ...base, disponible: false, motivo: 'No hay un periodo vigente.' };
  }
  const registro = await prisma.periodo.findUnique({ where: { codigo: periodo } });
  if (!registro?.fechaInicio) {
    return {
      ...base,
      periodo,
      disponible: false,
      motivo: 'El periodo vigente no tiene fecha de inicio: regístrala en Periodos.',
    };
  }

  const desde = registro.fechaInicio;
  // Último día incluido: inicio + semanas × 7 días, hasta el final de ese día.
  const hasta = new Date(desde.getTime() + semanas * 7 * MS_POR_DIA);
  const finDeHasta = new Date(hasta.getTime() + MS_POR_DIA - 1);
  const ventana = { periodo, semanas, desde: aDia(desde), hasta: aDia(hasta) };

  if (ahora < desde) {
    return {
      ...ventana,
      disponible: false,
      motivo: `Estará disponible desde el inicio del ciclo (${aDia(desde)}).`,
    };
  }
  if (ahora > finDeHasta) {
    return {
      ...ventana,
      disponible: false,
      motivo: `Solo se permite al inicio del ciclo (hasta el ${aDia(hasta)}). Ahora usa la asignación manual de cada sección.`,
    };
  }
  return { ...ventana, disponible: true, motivo: null };
}

/** Estado de la ventana y, si está abierta, cuántas secciones cambiarían de aula. */
export async function vistaPreviaReorganizacion(
  prisma: PrismaClient,
  ahora: Date = new Date(),
): Promise<VistaPreviaReorganizacionDTO> {
  const estado = await estadoReorganizacion(prisma, ahora);
  const simulacion =
    estado.disponible && estado.periodo
      ? await simularReorganizacion(estado.periodo, prisma)
      : null;
  return { ...estado, simulacion };
}

/** Ejecuta la reorganización si la ventana está abierta; si no, 409 con el motivo. */
export async function reorganizarConPrioridad(
  prisma: PrismaClient,
  ahora: Date = new Date(),
): Promise<ResumenAsignacionDTO> {
  const estado = await estadoReorganizacion(prisma, ahora);
  if (!estado.disponible || !estado.periodo) {
    throw new HttpError(409, estado.motivo ?? 'La reorganización no está disponible.');
  }
  return ejecutarReorganizacionConPrioridad(estado.periodo, prisma);
}

import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { logger } from '../lib/logger';
import { aFechaFin, FechaFinCondicionSchema, hoyEnLima } from '../lib/fechaFinCondicion';
import {
  aEstadoAccesibilidadDTO,
  aFechaISO,
  declararSolicitud,
  EstadoAccesibilidadDTO,
} from './accesibilidad.service';
import { obtenerDocenteDeCuenta } from './docente.service';

/**
 * Issue 3.61 (riesgos R15 y R16 de la auditoría).
 *
 * - R15: el docente también declara que no puede subir a pisos superiores, con la misma
 *   aprobación de Coordinación que el alumno (Issue 3.60). Al aprobarla, el motor prioriza el
 *   piso 1 en sus secciones.
 * - R16: la condición puede tener una fecha de fin (una pierna enyesada por un mes). Al vencer se
 *   quita la marca y la corrida programada reasigna las secciones afectadas.
 */

export const DeclararAccesibilidadDocenteSchema = z
  .object({
    declarado: z.boolean({ error: 'declarado debe ser verdadero o falso' }),
    fechaFin: FechaFinCondicionSchema.optional(),
  })
  .strict();

export type DeclararAccesibilidadDocenteInput = z.infer<typeof DeclararAccesibilidadDocenteSchema>;

export interface AccesibilidadDocenteDTO {
  /** La condición está aprobada y rige (el motor ya la considera). */
  aprobada: boolean;
  /** Último día de la condición aprobada; `null` si no vence. */
  vigenteHasta: string | null;
  /** La solicitud más reciente (pendiente, aprobada o rechazada), si la hay. */
  solicitud: EstadoAccesibilidadDTO | null;
}

async function estadoDocente(
  docente: { id: string; condicionAccesible: boolean; condicionAccesibleHasta: Date | null },
  prisma: Pick<PrismaClient, 'solicitudAccesibilidad'>,
): Promise<AccesibilidadDocenteDTO> {
  const solicitud = await prisma.solicitudAccesibilidad.findFirst({
    where: { docenteId: docente.id },
    orderBy: { fechaSolicitud: 'desc' },
  });
  return {
    aprobada: docente.condicionAccesible,
    vigenteHasta: aFechaISO(docente.condicionAccesibleHasta),
    solicitud: solicitud ? aEstadoAccesibilidadDTO(solicitud) : null,
  };
}

/** GET /api/v1/docente/accesibilidad — el estado de la declaración del docente autenticado. */
export async function obtenerAccesibilidadDocente(
  cuentaId: string,
  prisma: PrismaClient,
): Promise<AccesibilidadDocenteDTO> {
  const docente = await obtenerDocenteDeCuenta(cuentaId, prisma);
  return estadoDocente(docente, prisma);
}

/**
 * PUT /api/v1/docente/accesibilidad — declarar crea una solicitud pendiente que Coordinación
 * aprueba (o actualiza su fecha de fin); retirarla borra la pendiente y, si ya estaba aprobada,
 * quita la marca: dejar de declararla no necesita verificación.
 */
export async function declararAccesibilidadDocente(
  cuentaId: string,
  entrada: DeclararAccesibilidadDocenteInput,
  prisma: PrismaClient,
): Promise<AccesibilidadDocenteDTO> {
  const docente = await obtenerDocenteDeCuenta(cuentaId, prisma);
  await prisma.$transaction(async (tx) => {
    const cambio = await declararSolicitud(
      { docenteId: docente.id },
      entrada.declarado,
      docente.condicionAccesible,
      tx,
      aFechaFin(entrada.fechaFin),
    );
    if (cambio === 'RETIRADA_APROBADA') {
      await tx.docente.update({
        where: { id: docente.id },
        data: { condicionAccesible: false, condicionAccesibleHasta: null },
      });
    }
  });
  const actualizado = await obtenerDocenteDeCuenta(cuentaId, prisma);
  return estadoDocente(actualizado, prisma);
}

export interface ResumenVencimiento {
  alumnos: number;
  docentes: number;
}

/**
 * Issue 3.61 (R16): quita la condición de quienes tenían una fecha de fin anterior a hoy (hora
 * de Lima). Para un alumno se quita de su ficha y de sus matrículas; para un docente, del docente.
 * La corrida programada, que se ejecuta justo después, reasigna las secciones afectadas: el motor
 * ya no las considera de movilidad reducida.
 */
export async function vencerCondicionesAccesibles(
  prisma: PrismaClient,
  ahora: Date = new Date(),
): Promise<ResumenVencimiento> {
  const vencida = { condicionAccesible: true, condicionAccesibleHasta: { lt: hoyEnLima(ahora) } };
  const retirar = { condicionAccesible: false, condicionAccesibleHasta: null };

  const fichas = await prisma.fichaMedica.findMany({ where: vencida, select: { alumnoId: true } });
  const alumnoIds = fichas.map((f) => f.alumnoId);
  const [, , docentes] = await prisma.$transaction([
    prisma.fichaMedica.updateMany({ where: { alumnoId: { in: alumnoIds } }, data: retirar }),
    prisma.matricula.updateMany({
      where: { alumnoId: { in: alumnoIds } },
      data: { movilidadReducida: false },
    }),
    prisma.docente.updateMany({ where: vencida, data: retirar }),
  ]);

  const resumen = { alumnos: alumnoIds.length, docentes: docentes.count };
  if (resumen.alumnos + resumen.docentes > 0) {
    logger.info(resumen, 'Condiciones de accesibilidad vencidas: se quitó la marca');
  }
  return resumen;
}

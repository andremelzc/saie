import {
  EstadoAsignacion,
  EstadoPeriodo,
  Prisma,
  PrismaClient,
  TipoEventoAuditoria,
} from '@prisma/client';
import { z } from 'zod';
import { HttpError } from '../lib/http';
import { periodoSchema } from '../lib/periodo';
import { TokenPayload } from '../types/auth';
import { registrarAccionDePersona } from './auditoriaAcciones.service';

/**
 * Issue 4.64 (riesgos R25, R49–R52 de la auditoría): gestión de periodos desde Coordinación.
 *
 * El periodo vigente es el que tiene estado VIGENTE en la tabla `periodos` (a lo sumo uno). Ya no
 * sale de una variable de entorno ni del texto «más reciente»: cargar datos nunca lo cambia, solo
 * «Activar periodo». `PERIODO_VIGENTE` dejó de usarse.
 */

type DbLectura = Pick<PrismaClient, 'periodo'>;

export interface PeriodoDTO {
  codigo: string;
  /** `AAAA-MM-DD` o `null` si aún no se registró. */
  fechaInicio: string | null;
  fechaFin: string | null;
  estado: EstadoPeriodo;
}

export interface ListadoPeriodosDTO {
  vigente: string | null;
  /** Códigos de los periodos registrados, del más reciente al más antiguo. */
  periodos: string[];
  registrados: PeriodoDTO[];
}

/** Periodo vigente: el que Coordinación activó. `null` si no hay ninguno. */
export async function obtenerPeriodoVigente(prisma: DbLectura): Promise<string | null> {
  const vigente = await prisma.periodo.findFirst({
    where: { estado: EstadoPeriodo.VIGENTE },
    select: { codigo: true },
  });
  return vigente ? vigente.codigo : null;
}

function aDTO(p: {
  codigo: string;
  fechaInicio: Date | null;
  fechaFin: Date | null;
  estado: EstadoPeriodo;
}): PeriodoDTO {
  return {
    codigo: p.codigo,
    fechaInicio: p.fechaInicio ? p.fechaInicio.toISOString().slice(0, 10) : null,
    fechaFin: p.fechaFin ? p.fechaFin.toISOString().slice(0, 10) : null,
    estado: p.estado,
  };
}

/** Issue 4.42 / 4.64 — Periodos registrados (del más reciente al más antiguo) y el vigente. */
export async function listarPeriodos(prisma: DbLectura): Promise<ListadoPeriodosDTO> {
  const filas = await prisma.periodo.findMany({ orderBy: { codigo: 'desc' } });
  const registrados = filas.map(aDTO);
  return {
    vigente: registrados.find((p) => p.estado === EstadoPeriodo.VIGENTE)?.codigo ?? null,
    periodos: registrados.map((p) => p.codigo),
    registrados,
  };
}

/**
 * Issue 4.64 (R50): toda escritura sobre un periodo comprueba que esté registrado y no cerrado.
 * Un periodo en preparación o vigente se puede escribir; uno cerrado es solo consulta.
 */
export async function asegurarPeriodoEscribible(prisma: DbLectura, codigo: string): Promise<void> {
  const periodo = await prisma.periodo.findUnique({
    where: { codigo },
    select: { estado: true },
  });
  if (!periodo) {
    throw new HttpError(
      422,
      `El periodo ${codigo} no está registrado. Regístralo primero en la pantalla Periodos`,
    );
  }
  if (periodo.estado === EstadoPeriodo.CERRADO) {
    throw new HttpError(409, `El periodo ${codigo} está cerrado y solo admite consulta`);
  }
}

const FechaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato AAAA-MM-DD')
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), 'La fecha no es válida');

export const NuevoPeriodoSchema = z
  .object({
    codigo: periodoSchema,
    fechaInicio: FechaSchema.optional(),
    fechaFin: FechaSchema.optional(),
  })
  .refine((v) => !v.fechaInicio || !v.fechaFin || v.fechaFin >= v.fechaInicio, {
    message: 'La fecha de fin no puede ser anterior a la de inicio',
    path: ['fechaFin'],
  });

export type NuevoPeriodoInput = z.infer<typeof NuevoPeriodoSchema>;

/** Registra un periodo nuevo, siempre «en preparación». */
export async function registrarPeriodo(
  entrada: NuevoPeriodoInput,
  auth: TokenPayload,
  prisma: PrismaClient,
): Promise<PeriodoDTO> {
  const existente = await prisma.periodo.findUnique({ where: { codigo: entrada.codigo } });
  if (existente) {
    throw new HttpError(409, `El periodo ${entrada.codigo} ya está registrado`);
  }

  return prisma.$transaction(async (tx) => {
    const creado = await tx.periodo.create({
      data: {
        codigo: entrada.codigo,
        estado: EstadoPeriodo.EN_PREPARACION,
        ...(entrada.fechaInicio && { fechaInicio: new Date(`${entrada.fechaInicio}T00:00:00Z`) }),
        ...(entrada.fechaFin && { fechaFin: new Date(`${entrada.fechaFin}T00:00:00Z`) }),
      },
    });
    await auditar(tx, auth, `Periodo ${creado.codigo} registrado`, null, creado.estado);
    return aDTO(creado);
  });
}

async function auditar(
  tx: Prisma.TransactionClient,
  auth: TokenPayload,
  descripcion: string,
  anterior: EstadoPeriodo | null,
  nuevo: EstadoPeriodo,
): Promise<void> {
  await registrarAccionDePersona(tx, {
    tipoEvento: TipoEventoAuditoria.CAMBIO_PERIODO,
    cuentaId: auth.sub,
    descripcion,
    cambios: [{ campo: 'estado', anterior, nuevo }],
  });
}

/** Las asignaciones de un periodo que termina pasan a históricas: ya no ocupan espacios. */
async function archivarAsignaciones(tx: Prisma.TransactionClient, codigo: string): Promise<number> {
  const { count } = await tx.asignacion.updateMany({
    where: {
      seccion: { periodo: codigo },
      estado: { in: [EstadoAsignacion.VIGENTE, EstadoAsignacion.ESCALADA] },
    },
    data: { estado: EstadoAsignacion.HISTORICA },
  });
  return count;
}

async function buscarPeriodo(prisma: DbLectura, codigo: string) {
  const periodo = await prisma.periodo.findUnique({ where: { codigo } });
  if (!periodo) throw new HttpError(404, `El periodo ${codigo} no está registrado`);
  return periodo;
}

/**
 * Activa un periodo: el vigente anterior queda cerrado y sus asignaciones pasan a históricas, todo
 * en el mismo paso. Un periodo cerrado no se puede reactivar.
 */
export async function activarPeriodo(
  codigo: string,
  auth: TokenPayload,
  prisma: PrismaClient,
): Promise<PeriodoDTO> {
  const objetivo = await buscarPeriodo(prisma, codigo);
  if (objetivo.estado === EstadoPeriodo.VIGENTE) {
    throw new HttpError(409, `El periodo ${codigo} ya es el vigente`);
  }
  if (objetivo.estado === EstadoPeriodo.CERRADO) {
    throw new HttpError(409, `El periodo ${codigo} está cerrado y no se puede reactivar`);
  }

  return prisma.$transaction(async (tx) => {
    const anterior = await tx.periodo.findFirst({ where: { estado: EstadoPeriodo.VIGENTE } });
    if (anterior) {
      await tx.periodo.update({
        where: { id: anterior.id },
        data: { estado: EstadoPeriodo.CERRADO },
      });
      await archivarAsignaciones(tx, anterior.codigo);
      await auditar(
        tx,
        auth,
        `Periodo ${anterior.codigo} cerrado al activar ${codigo}`,
        EstadoPeriodo.VIGENTE,
        EstadoPeriodo.CERRADO,
      );
    }
    const activado = await tx.periodo.update({
      where: { id: objetivo.id },
      data: { estado: EstadoPeriodo.VIGENTE },
    });
    await auditar(
      tx,
      auth,
      `Periodo ${codigo} activado`,
      EstadoPeriodo.EN_PREPARACION,
      EstadoPeriodo.VIGENTE,
    );
    return aDTO(activado);
  });
}

/** Cierra un periodo (en preparación o vigente). Cerrado es solo consulta. */
export async function cerrarPeriodo(
  codigo: string,
  auth: TokenPayload,
  prisma: PrismaClient,
): Promise<PeriodoDTO> {
  const objetivo = await buscarPeriodo(prisma, codigo);
  if (objetivo.estado === EstadoPeriodo.CERRADO) {
    throw new HttpError(409, `El periodo ${codigo} ya está cerrado`);
  }

  return prisma.$transaction(async (tx) => {
    const cerrado = await tx.periodo.update({
      where: { id: objetivo.id },
      data: { estado: EstadoPeriodo.CERRADO },
    });
    await archivarAsignaciones(tx, codigo);
    await auditar(tx, auth, `Periodo ${codigo} cerrado`, objetivo.estado, EstadoPeriodo.CERRADO);
    return aDTO(cerrado);
  });
}

/**
 * Catálogo de software (Spec 08 / Issue 4.28).
 *
 * Centraliza el alta, edición y baja lógica del catálogo, la resolución de nombres que usan los
 * importadores y el seed, y los mapeos hacia las entradas puras del motor.
 */

import { CategoriaSoftware, Prisma, PrismaClient, TipoLicencia } from '@prisma/client';
import { z } from 'zod';
import { HttpError } from '../lib/http';
import { normalizarNombreSoftware, parsearNombreVersion, formatearSoftware } from '../lib/software';
import { TokenPayload } from '../types/auth';
import {
  FiltrosSoftware,
  ListadoSoftwareDTO,
  SoftwareDTO,
  SoftwareInstaladoInput,
  SoftwareRequeridoInput,
} from '../types/software';

type Db = Prisma.TransactionClient;

// ==========================================
// CONTRATOS ZOD (Spec 08, §5)
// ==========================================

const nombre = z
  .string()
  .trim()
  .min(1, 'El nombre del software es requerido')
  .max(100, 'El nombre del software es muy largo');
const version = z.string().trim().max(30, 'La versión es muy larga').default('');
const descripcion = z.string().trim().max(500, 'La descripción es muy larga');
const fabricante = z.string().trim().max(100, 'El fabricante es muy largo');
const categoria = z.enum(CategoriaSoftware, { error: 'La categoría no es válida' });
const tipoLicencia = z.enum(TipoLicencia, { error: 'El tipo de licencia no es válido' });

export const SoftwareCrearSchema = z
  .object({
    nombre,
    version,
    categoria,
    descripcion: descripcion.optional(),
    fabricante: fabricante.optional(),
    tipoLicencia: tipoLicencia.default(TipoLicencia.LIBRE),
  })
  .strict();

export const SoftwareEditarSchema = z
  .object({
    // La versión no se edita: para otra versión se crea otra fila del catálogo.
    nombre: nombre.optional(),
    categoria: categoria.optional(),
    descripcion: descripcion.nullable().optional(),
    fabricante: fabricante.nullable().optional(),
    tipoLicencia: tipoLicencia.optional(),
  })
  .strict()
  .refine((e) => Object.values(e).some((v) => v !== undefined), {
    message: 'Indica al menos un campo a modificar',
  });

export const SoftwareEstadoSchema = z
  .object({
    activo: z.boolean({ error: 'activo debe ser verdadero o falso' }),
  })
  .strict();

export const SoftwareListadoQuerySchema = z
  .object({
    q: z.string().trim().min(1).optional(),
    categoria: categoria.optional(),
    activo: z
      .enum(['true', 'false'], { error: 'activo debe ser true o false' })
      .transform((v) => v === 'true')
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

export type SoftwareCrearInput = z.infer<typeof SoftwareCrearSchema>;
export type SoftwareEditarInput = z.infer<typeof SoftwareEditarSchema>;

// ==========================================
// MAPEOS
// ==========================================

const incluirUso = {
  _count: { select: { espacios: true, secciones: true } },
} satisfies Prisma.SoftwareInclude;

type SoftwareConUso = Prisma.SoftwareGetPayload<{ include: typeof incluirUso }>;

function aDTO(sw: SoftwareConUso): SoftwareDTO {
  return {
    id: sw.id,
    nombre: sw.nombre,
    version: sw.version,
    nombreNormalizado: sw.nombreNormalizado,
    categoria: sw.categoria,
    tipoLicencia: sw.tipoLicencia,
    descripcion: sw.descripcion,
    fabricante: sw.fabricante,
    activo: sw.activo,
    creadoPorId: sw.creadoPorId,
    fechaCreacion: sw.fechaCreacion,
    fechaActualizacion: sw.fechaActualizacion,
    uso: {
      laboratorios: sw._count.espacios,
      secciones: sw._count.secciones,
    },
  };
}

interface FilaSoftware {
  nombre: string;
  nombreNormalizado: string;
  version: string;
}

/** Convierte las filas `EspacioSoftware` de Prisma en la entrada pura del motor. */
export function mapearSoftwareInstalado(
  filas?: Array<{ software: FilaSoftware }> | null,
): SoftwareInstaladoInput[] {
  return (filas ?? []).map((fila) => ({
    nombre: fila.software.nombre,
    nombreNormalizado: fila.software.nombreNormalizado,
    version: fila.software.version,
  }));
}

/** Convierte las filas `SeccionSoftware` de Prisma en la entrada pura del motor. */
export function mapearSoftwareRequerido(
  filas?: Array<{
    comparacionVersion: SoftwareRequeridoInput['comparacionVersion'];
    software: FilaSoftware;
  }> | null,
): SoftwareRequeridoInput[] {
  return (filas ?? []).map((fila) => ({
    nombre: fila.software.nombre,
    nombreNormalizado: fila.software.nombreNormalizado,
    version: fila.software.version,
    comparacionVersion: fila.comparacionVersion,
  }));
}

function esConflictoUnico(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

// ==========================================
// CONSULTAS
// ==========================================

/** Issue 4.28 — GET /api/v1/admin/software: listado paginado con filtros. */
export async function listarSoftware(
  filtros: FiltrosSoftware,
  prisma: Pick<PrismaClient, 'software'>,
): Promise<ListadoSoftwareDTO> {
  const where: Prisma.SoftwareWhereInput = {
    ...(filtros.q && { nombre: { contains: filtros.q, mode: 'insensitive' } }),
    ...(filtros.categoria && { categoria: filtros.categoria }),
    ...(filtros.activo !== undefined && { activo: filtros.activo }),
  };

  const [total, filas] = await Promise.all([
    prisma.software.count({ where }),
    prisma.software.findMany({
      where,
      include: incluirUso,
      orderBy: [{ nombre: 'asc' }, { version: 'asc' }],
      skip: (filtros.page - 1) * filtros.limit,
      take: filtros.limit,
    }),
  ]);

  return {
    items: filas.map(aDTO),
    total,
    page: filtros.page,
    limit: filtros.limit,
  };
}

export async function obtenerSoftwarePorId(
  id: string,
  prisma: Pick<PrismaClient, 'software'>,
): Promise<SoftwareDTO> {
  const sw = await prisma.software.findUnique({ where: { id }, include: incluirUso });
  if (!sw) {
    throw new HttpError(404, `El software con ID '${id}' no existe`);
  }
  return aDTO(sw);
}

// ==========================================
// ALTAS Y CAMBIOS
// ==========================================

/** Issue 4.28 — POST /api/v1/admin/software. `409` si ya existe `(nombre, versión)`. */
export async function crearSoftware(
  entrada: SoftwareCrearInput,
  auth: TokenPayload,
  prisma: PrismaClient,
): Promise<SoftwareDTO> {
  try {
    const creado = await prisma.software.create({
      data: {
        nombre: entrada.nombre,
        nombreNormalizado: normalizarNombreSoftware(entrada.nombre),
        version: entrada.version,
        categoria: entrada.categoria,
        tipoLicencia: entrada.tipoLicencia,
        descripcion: entrada.descripcion ?? null,
        fabricante: entrada.fabricante ?? null,
        creadoPorId: auth.sub,
      },
      include: incluirUso,
    });
    return aDTO(creado);
  } catch (error: unknown) {
    if (esConflictoUnico(error)) {
      throw new HttpError(
        409,
        `El software '${formatearSoftware(entrada)}' ya existe en el catálogo`,
      );
    }
    throw error;
  }
}

/**
 * Issue 4.28 — PATCH /api/v1/admin/software/:id.
 * No permite cambiar la versión: para otra versión se crea otra fila.
 */
export async function editarSoftware(
  id: string,
  entrada: SoftwareEditarInput,
  prisma: PrismaClient,
): Promise<SoftwareDTO> {
  await obtenerSoftwarePorId(id, prisma);

  try {
    const actualizado = await prisma.software.update({
      where: { id },
      data: {
        ...(entrada.nombre !== undefined && {
          nombre: entrada.nombre,
          nombreNormalizado: normalizarNombreSoftware(entrada.nombre),
        }),
        ...(entrada.categoria !== undefined && { categoria: entrada.categoria }),
        ...(entrada.tipoLicencia !== undefined && { tipoLicencia: entrada.tipoLicencia }),
        ...(entrada.descripcion !== undefined && { descripcion: entrada.descripcion }),
        ...(entrada.fabricante !== undefined && { fabricante: entrada.fabricante }),
      },
      include: incluirUso,
    });
    return aDTO(actualizado);
  } catch (error: unknown) {
    if (esConflictoUnico(error)) {
      throw new HttpError(409, 'Ya existe un software con ese nombre y versión');
    }
    throw error;
  }
}

/**
 * Issue 4.28 — PATCH /api/v1/admin/software/:id/estado.
 * La baja es lógica: bloquea nuevas instalaciones y requerimientos, no borra relaciones.
 * La respuesta incluye cuántos laboratorios y secciones lo usan (Spec 08, §2.4).
 */
export async function cambiarEstadoSoftware(
  id: string,
  activo: boolean,
  prisma: PrismaClient,
): Promise<SoftwareDTO> {
  await obtenerSoftwarePorId(id, prisma);
  const actualizado = await prisma.software.update({
    where: { id },
    data: { activo },
    include: incluirUso,
  });
  return aDTO(actualizado);
}

// ==========================================
// RESOLUCIÓN CONTRA EL CATÁLOGO
// ==========================================

/**
 * Resuelve un nombre (y versión opcional) contra el catálogo. La usan los importadores y el
 * seed, que siguen recibiendo texto: si el software no existe devuelve `null` y quien llama
 * decide el error; nunca se guarda texto libre.
 */
export async function resolverSoftwarePorNombre(
  nombre: string,
  version: string | undefined,
  db: Pick<Db, 'software'> | Pick<PrismaClient, 'software'>,
): Promise<{ id: string; nombre: string; nombreNormalizado: string; version: string } | null> {
  const parseado = version === undefined ? parsearNombreVersion(nombre) : null;
  const nombreNormalizado = parseado
    ? parseado.nombreNormalizado
    : normalizarNombreSoftware(nombre);
  const versionFinal = parseado ? parseado.version : version;

  return db.software.findUnique({
    where: {
      nombreNormalizado_version: {
        nombreNormalizado,
        version: versionFinal ?? '',
      },
    },
    select: { id: true, nombre: true, nombreNormalizado: true, version: true },
  });
}

/**
 * Verifica que todos los ids existan y estén activos. Devuelve las filas en el orden recibido,
 * sin duplicados. `404` si falta alguno y `422` si está dado de baja (Spec 08, §2.4).
 */
export async function resolverSoftwareIds(
  ids: string[],
  db: Pick<Db, 'software'> | Pick<PrismaClient, 'software'>,
): Promise<Array<{ id: string; nombre: string; nombreNormalizado: string; version: string }>> {
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return [];

  const filas = await db.software.findMany({
    where: { id: { in: unicos } },
    select: { id: true, nombre: true, nombreNormalizado: true, version: true, activo: true },
    orderBy: { nombre: 'asc' },
  });

  const encontrados = new Set(filas.map((f) => f.id));
  const faltantes = unicos.filter((id) => !encontrados.has(id));
  if (faltantes.length > 0) {
    throw new HttpError(404, `No existe software con ID: ${faltantes.join(', ')}`);
  }

  const inactivos = filas.filter((f) => !f.activo);
  if (inactivos.length > 0) {
    throw new HttpError(
      422,
      `El software está dado de baja: ${inactivos.map(formatearSoftware).join(', ')}`,
    );
  }

  return filas.map(({ id, nombre, nombreNormalizado, version }) => ({
    id,
    nombre,
    nombreNormalizado,
    version,
  }));
}

/**
 * Alta masiva e idempotente de textos de software en el catálogo (seed y importadores).
 * Devuelve un mapa `texto original → id` para poder crear las relaciones.
 */
export async function sembrarCatalogoSoftware(
  prisma: Pick<PrismaClient, 'software'>,
  textos: string[],
): Promise<Map<string, string>> {
  const resueltos = new Map<string, string>();

  for (const texto of [...new Set(textos.map((t) => t.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  )) {
    const parseado = parsearNombreVersion(texto);
    const fila = await prisma.software.upsert({
      where: {
        nombreNormalizado_version: {
          nombreNormalizado: parseado.nombreNormalizado,
          version: parseado.version,
        },
      },
      update: {},
      create: {
        nombre: parseado.nombre,
        nombreNormalizado: parseado.nombreNormalizado,
        version: parseado.version,
        categoria: CategoriaSoftware.OTRO,
      },
      select: { id: true },
    });
    resueltos.set(texto, fila.id);
  }

  return resueltos;
}

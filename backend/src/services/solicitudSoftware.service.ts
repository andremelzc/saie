/**
 * Solicitudes de software (Spec 08, §2.3 / Issue 4.29).
 *
 * Un docente propone un software que todavía no está en el catálogo y Coordinación Académica lo
 * aprueba —creando o vinculando la fila de `Software`— o lo rechaza con motivo. Aprobar no
 * instala nada: la instalación en un laboratorio sigue siendo un paso aparte de Jefatura.
 */

import {
  CategoriaSoftware,
  ComparacionVersion,
  EstadoSolicitud,
  Prisma,
  PrismaClient,
  TipoEspacio,
  TipoLicencia,
} from '@prisma/client';
import { z } from 'zod';
import { HttpError } from '../lib/http';
import { formatearSoftware, normalizarNombreSoftware, parsearNombreVersion } from '../lib/software';
import { TokenPayload } from '../types/auth';
import {
  FiltrosSolicitudes,
  ListadoSolicitudesDTO,
  ResultadoAprobacionDTO,
  SolicitudSoftwareDTO,
} from '../types/solicitudSoftware';
import { obtenerDocenteDeCuenta } from './docente.service';
import { resolverSoftwarePorNombre } from './software.service';

type Db = Prisma.TransactionClient;

// ==========================================
// CONTRATOS ZOD (Spec 08, §2.3)
// ==========================================

const nombre = z
  .string()
  .trim()
  .min(1, 'El nombre del software es requerido')
  .max(100, 'El nombre del software es muy largo');
const version = z.string().trim().max(30, 'La versión es muy larga').default('');
const categoria = z.enum(CategoriaSoftware, { error: 'La categoría no es válida' });
const tipoLicencia = z.enum(TipoLicencia, { error: 'El tipo de licencia no es válido' });
const motivo = z
  .string()
  .trim()
  .min(1, 'El motivo es requerido')
  .max(500, 'El motivo es muy largo');

export const SolicitudCrearSchema = z
  .object({
    nombre,
    version,
    categoria: categoria.optional(),
    justificacion: z
      .string()
      .trim()
      .min(1, 'La justificación es requerida')
      .max(500, 'La justificación es muy larga'),
    seccionId: z.string().uuid('La sección no es válida').optional(),
  })
  .strict();

export const SolicitudAprobarSchema = z
  .object({
    // Coordinación puede ajustar el nombre, la categoría y la licencia antes de crear la fila.
    nombre: nombre.optional(),
    categoria: categoria.optional(),
    tipoLicencia: tipoLicencia.optional(),
    descripcion: z.string().trim().max(500, 'La descripción es muy larga').optional(),
    fabricante: z.string().trim().max(100, 'El fabricante es muy largo').optional(),
    agregarASeccion: z.boolean().default(false),
  })
  .strict();

export const SolicitudRechazarSchema = z.object({ motivoRechazo: motivo }).strict();

export const SolicitudListadoQuerySchema = z
  .object({
    estado: z.enum(EstadoSolicitud, { error: 'El estado no es válido' }).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  })
  .strict();

export type SolicitudCrearInput = z.infer<typeof SolicitudCrearSchema>;
export type SolicitudAprobarInput = z.infer<typeof SolicitudAprobarSchema>;
export type SolicitudRechazarInput = z.infer<typeof SolicitudRechazarSchema>;

// ==========================================
// MAPEOS
// ==========================================

const incluirSolicitud = {
  docente: { select: { id: true, nombre: true, codigoDocente: true } },
  seccion: { include: { curso: { select: { codigo: true, nombre: true } } } },
  software: { select: { id: true, nombre: true, version: true } },
} satisfies Prisma.SolicitudSoftwareInclude;

type SolicitudConRelaciones = Prisma.SolicitudSoftwareGetPayload<{
  include: typeof incluirSolicitud;
}>;

function aDTO(s: SolicitudConRelaciones): SolicitudSoftwareDTO {
  return {
    id: s.id,
    nombre: s.nombre,
    version: s.version,
    categoria: s.categoria,
    justificacion: s.justificacion,
    estado: s.estado,
    fechaSolicitud: s.fechaSolicitud,
    fechaResolucion: s.fechaResolucion,
    motivoRechazo: s.motivoRechazo,
    docente: s.docente,
    seccion: s.seccion
      ? {
          id: s.seccion.id,
          codigoSeccion: s.seccion.codigoSeccion,
          periodo: s.seccion.periodo,
          codigoCurso: s.seccion.curso.codigo,
          nombreCurso: s.seccion.curso.nombre,
        }
      : null,
    software: s.software,
  };
}

/**
 * Separa nombre y versión igual que el importador: `"MATLAB R2023b"` sin versión explicita deja
 * `nombre = "MATLAB"` y `version = "R2023b"`, de modo que la solicitud apunta a la misma identidad
 * `(nombreNormalizado, version)` que usa el catálogo.
 */
function separarNombreVersion(
  nombreTexto: string,
  versionTexto: string,
): { nombre: string; version: string } {
  if (versionTexto !== '') return { nombre: nombreTexto, version: versionTexto };

  const parseado = parsearNombreVersion(nombreTexto);
  return { nombre: parseado.nombre, version: parseado.version };
}

function solicitudNoPendiente(solicitud: { estado: EstadoSolicitud; id: string }): HttpError {
  const resolucion = solicitud.estado === EstadoSolicitud.APROBADA ? 'aprobada' : 'rechazada';
  return new HttpError(409, `La solicitud con ID '${solicitud.id}' ya fue ${resolucion}`);
}

// ==========================================
// DOCENTE (Issue 4.29)
// ==========================================

/** `POST /api/v1/docente/solicitudes-software`: crea la propuesta del docente autenticado. */
export async function crearSolicitud(
  cuentaId: string,
  entrada: SolicitudCrearInput,
  prisma: PrismaClient,
): Promise<SolicitudSoftwareDTO> {
  const docente = await obtenerDocenteDeCuenta(cuentaId, prisma);

  if (entrada.seccionId) {
    const seccion = await prisma.seccion.findUnique({
      where: { id: entrada.seccionId },
      select: { id: true },
    });
    if (!seccion) {
      throw new HttpError(404, `La sección con ID '${entrada.seccionId}' no existe`);
    }
  }

  const { nombre: nombreFinal, version: versionFinal } = separarNombreVersion(
    entrada.nombre,
    entrada.version,
  );

  // Si el software ya está en el catálogo no hay nada que aprobar: se le indica el id existente.
  const existente = await resolverSoftwarePorNombre(nombreFinal, versionFinal, prisma);
  if (existente) {
    throw new HttpError(
      409,
      `El software '${formatearSoftware({ nombre: nombreFinal, version: versionFinal })}' ya existe en el catálogo con ID '${existente.id}'`,
    );
  }

  const creada = await prisma.solicitudSoftware.create({
    data: {
      docenteId: docente.id,
      seccionId: entrada.seccionId ?? null,
      nombre: nombreFinal,
      version: versionFinal,
      categoria: entrada.categoria ?? null,
      justificacion: entrada.justificacion,
    },
    include: incluirSolicitud,
  });

  return aDTO(creada);
}

/** `GET /api/v1/docente/solicitudes-software`: solo las propias, de la más reciente a la más antigua. */
export async function listarSolicitudesDeDocente(
  cuentaId: string,
  prisma: PrismaClient,
): Promise<SolicitudSoftwareDTO[]> {
  const docente = await obtenerDocenteDeCuenta(cuentaId, prisma);

  const filas = await prisma.solicitudSoftware.findMany({
    where: { docenteId: docente.id },
    include: incluirSolicitud,
    orderBy: { fechaSolicitud: 'desc' },
    take: 100,
  });

  return filas.map(aDTO);
}

// ==========================================
// COORDINACIÓN ACADÉMICA (Issue 4.29)
// ==========================================

/** `GET /api/v1/admin/solicitudes-software[?estado=]`: listado paginado, pendientes primero. */
export async function listarSolicitudes(
  filtros: FiltrosSolicitudes,
  prisma: PrismaClient,
): Promise<ListadoSolicitudesDTO> {
  const where: Prisma.SolicitudSoftwareWhereInput = {
    ...(filtros.estado && { estado: filtros.estado }),
  };

  const [total, filas] = await Promise.all([
    prisma.solicitudSoftware.count({ where }),
    prisma.solicitudSoftware.findMany({
      where,
      include: incluirSolicitud,
      orderBy: [{ estado: 'asc' }, { fechaSolicitud: 'desc' }],
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

/**
 * `PATCH /api/v1/admin/solicitudes-software/:id/aprobar`: crea (o vincula) la fila del catálogo y,
 * si se pidió, deja el software como requerimiento de la sección. Nunca lo instala en un laboratorio.
 */
export async function aprobarSolicitud(
  id: string,
  auth: TokenPayload,
  entrada: SolicitudAprobarInput,
  prisma: PrismaClient,
): Promise<ResultadoAprobacionDTO> {
  return prisma.$transaction(async (tx: Db) => {
    const solicitud = await tx.solicitudSoftware.findUnique({
      where: { id },
      include: incluirSolicitud,
    });
    if (!solicitud) {
      throw new HttpError(404, `La solicitud con ID '${id}' no existe`);
    }
    if (solicitud.estado !== EstadoSolicitud.PENDIENTE) {
      throw solicitudNoPendiente(solicitud);
    }

    if (entrada.agregarASeccion) {
      if (!solicitud.seccion) {
        throw new HttpError(422, 'La solicitud no indica una sección a la que añadir el software');
      }
      if (solicitud.seccion.tipoEspacioRequerido !== TipoEspacio.LABORATORIO) {
        throw new HttpError(
          422,
          `La sección '${solicitud.seccion.codigoSeccion}' es un aula teórica: solo los laboratorios llevan requerimientos de software`,
        );
      }
    }

    const nombreFinal = entrada.nombre ?? solicitud.nombre;
    const nombreNormalizado = normalizarNombreSoftware(nombreFinal);

    // Otra cuenta pudo crear el software entre la solicitud y la aprobación: en ese caso se vincula.
    const existente = await tx.software.findUnique({
      where: {
        nombreNormalizado_version: { nombreNormalizado, version: solicitud.version },
      },
    });
    if (existente && !existente.activo) {
      throw new HttpError(
        422,
        `El software '${formatearSoftware(existente)}' está dado de baja en el catálogo: reactívalo antes de aprobar la solicitud`,
      );
    }

    const software =
      existente ??
      (await tx.software.create({
        data: {
          nombre: nombreFinal,
          nombreNormalizado,
          version: solicitud.version,
          categoria: entrada.categoria ?? solicitud.categoria ?? CategoriaSoftware.OTRO,
          tipoLicencia: entrada.tipoLicencia ?? TipoLicencia.LIBRE,
          descripcion: entrada.descripcion ?? null,
          fabricante: entrada.fabricante ?? null,
          creadoPorId: auth.sub,
        },
      }));

    let agregadaASeccion = false;
    if (entrada.agregarASeccion && solicitud.seccionId) {
      await tx.seccionSoftware.createMany({
        data: [
          {
            seccionId: solicitud.seccionId,
            softwareId: software.id,
            comparacionVersion:
              solicitud.version === '' ? ComparacionVersion.CUALQUIERA : ComparacionVersion.EXACTA,
          },
        ],
        skipDuplicates: true,
      });
      agregadaASeccion = true;
    }

    const resuelta = await tx.solicitudSoftware.update({
      where: { id },
      data: {
        estado: EstadoSolicitud.APROBADA,
        softwareId: software.id,
        resueltaPorId: auth.sub,
        fechaResolucion: new Date(),
        motivoRechazo: null,
      },
      include: incluirSolicitud,
    });

    return { solicitud: aDTO(resuelta), agregadaASeccion };
  });
}

/** `PATCH /api/v1/admin/solicitudes-software/:id/rechazar`: exige motivo. */
export async function rechazarSolicitud(
  id: string,
  auth: TokenPayload,
  entrada: SolicitudRechazarInput,
  prisma: PrismaClient,
): Promise<SolicitudSoftwareDTO> {
  return prisma.$transaction(async (tx: Db) => {
    const solicitud = await tx.solicitudSoftware.findUnique({ where: { id } });
    if (!solicitud) {
      throw new HttpError(404, `La solicitud con ID '${id}' no existe`);
    }
    if (solicitud.estado !== EstadoSolicitud.PENDIENTE) {
      throw solicitudNoPendiente(solicitud);
    }

    const resuelta = await tx.solicitudSoftware.update({
      where: { id },
      data: {
        estado: EstadoSolicitud.RECHAZADA,
        motivoRechazo: entrada.motivoRechazo,
        resueltaPorId: auth.sub,
        fechaResolucion: new Date(),
      },
      include: incluirSolicitud,
    });

    return aDTO(resuelta);
  });
}

import {
  EstadoAsignacion,
  Prisma,
  PrismaClient,
  RolCuenta,
  TipoAlerta,
  TipoEspacio,
} from '@prisma/client';
import { z } from 'zod';
import { HttpError } from '../lib/http';
import { formatearSoftware } from '../lib/software';
import { TokenPayload } from '../types/auth';
import {
  AsignacionDeSeccionDTO,
  CampoSeccion,
  CAMPOS_SECCION,
  FiltrosSecciones,
  ListadoSeccionesDTO,
  ResultadoEdicionSeccionDTO,
  SeccionAdminDTO,
  SoftwareRequeridoInputSeccion,
} from '../types/secciones';
import { registrarAlertaDesdeDeteccion } from './alerta.service';
import { evaluarIncompatibilidadSoftware } from './deteccionAlertas.service';
import { obtenerPeriodoVigente } from './periodo.service';
import { mapearSoftwareInstalado, resolverSoftwareIds } from './software.service';

type Db = Prisma.TransactionClient;

/**
 * Issue 4.31 — gestión individual de secciones.
 *
 * La carga masiva crea y actualiza secciones, pero no había forma de verlas una por una ni de
 * cambiarles el software requerido sin reimportar el CSV. Este servicio expone el listado y
 * permite a Coordinación editar el tipo de aula, el docente y el software requerido.
 */

/** Campos que puede editar cada rol. Solo Coordinación edita secciones. */
export function camposEditablesDeSeccion(rol: RolCuenta): CampoSeccion[] {
  return rol === RolCuenta.COORDINACION_ACADEMICA ? [...CAMPOS_SECCION] : [];
}

const INCLUIR_SECCION = {
  curso: true,
  docente: true,
  horarios: { orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }] },
  _count: { select: { matriculas: true } },
  softwareRequerido: { include: { software: true } },
  asignaciones: {
    where: { estado: { in: [EstadoAsignacion.VIGENTE, EstadoAsignacion.ESCALADA] } },
    orderBy: { fechaAsignacion: 'desc' },
    take: 1,
    include: { espacios: { include: { espacio: true } } },
  },
} satisfies Prisma.SeccionInclude;

type SeccionConDetalle = Prisma.SeccionGetPayload<{ include: typeof INCLUIR_SECCION }>;

function aAsignacionDTO(
  asignacion: SeccionConDetalle['asignaciones'][number],
): AsignacionDeSeccionDTO | null {
  if (!asignacion) return null;
  return {
    id: asignacion.id,
    estado: asignacion.estado,
    fechaAsignacion: asignacion.fechaAsignacion.toISOString(),
    corridaId: asignacion.corridaId,
    motivoEscalamiento: asignacion.motivoEscalamiento,
    espacios: asignacion.espacios.map((ae) => ({
      id: ae.espacio.id,
      identificador: ae.espacio.identificador,
      pabellon: ae.espacio.pabellon,
      piso: ae.espacio.piso,
      tipo: ae.espacio.tipo,
    })),
  };
}

function aSeccionDTO(seccion: SeccionConDetalle, rol: RolCuenta): SeccionAdminDTO {
  return {
    id: seccion.id,
    codigoCurso: seccion.curso.codigo,
    nombreCurso: seccion.curso.nombre,
    codigoSeccion: seccion.codigoSeccion,
    periodo: seccion.periodo,
    tipoEspacioRequerido: seccion.tipoEspacioRequerido,
    docente: seccion.docente
      ? {
          id: seccion.docente.id,
          codigoDocente: seccion.docente.codigoDocente,
          nombre: seccion.docente.nombre,
        }
      : null,
    alumnosMatriculados: seccion._count.matriculas,
    horarios: seccion.horarios.map((h) => ({
      diaSemana: h.diaSemana,
      horaInicio: h.horaInicio,
      horaFin: h.horaFin,
    })),
    softwareRequerido: seccion.softwareRequerido
      .map((fila) => ({
        id: fila.softwareId,
        nombre: fila.software.nombre,
        version: fila.software.version,
        comparacionVersion: fila.comparacionVersion,
      }))
      .sort((a, b) => formatearSoftware(a).localeCompare(formatearSoftware(b))),
    asignacion: aAsignacionDTO(seccion.asignaciones[0]),
    camposEditables: camposEditablesDeSeccion(rol),
  };
}

// ==========================================
// CONTRATOS ZOD
// ==========================================

export const FiltrosSeccionesSchema = z
  .object({
    periodo: z
      .string()
      .trim()
      .regex(/^\d{4}-\d+$/, 'El periodo debe tener formato AAAA-N (ej. 2026-1)')
      .optional(),
    q: z.string().trim().min(1).max(80).optional(),
    tipo: z.enum(TipoEspacio, { error: 'El tipo de espacio no es válido' }).optional(),
    pagina: z.coerce.number().int().min(1).default(1),
    limite: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict();

const softwareRequerido = z.object({
  softwareId: z.string().uuid('Cada software debe ser un id válido'),
  comparacionVersion: z
    .enum(['CUALQUIERA', 'EXACTA', 'MINIMA'], { error: 'La comparación de versión no es válida' })
    .default('CUALQUIERA'),
});

export const ActualizarSeccionSchema = z
  .object({
    tipoEspacioRequerido: z
      .enum(TipoEspacio, { error: 'El tipo de espacio no es válido' })
      .optional(),
    docenteId: z.string().uuid('El docente debe ser un id válido').nullable().optional(),
    softwareRequerido: z
      .array(softwareRequerido)
      .max(50, 'Demasiados programas en la lista')
      .optional(),
  })
  .strict()
  .refine((e) => Object.values(e).some((v) => v !== undefined), {
    message: 'Indica al menos un campo a modificar',
  });

export type ActualizarSeccionInput = z.infer<typeof ActualizarSeccionSchema>;

// ==========================================
// CONSULTAS
// ==========================================

function dondeDeFiltros(filtros: FiltrosSecciones): Prisma.SeccionWhereInput {
  const q = filtros.q?.trim();
  return {
    ...(filtros.periodo && { periodo: filtros.periodo }),
    ...(filtros.tipo && { tipoEspacioRequerido: filtros.tipo }),
    ...(q && {
      OR: [
        { curso: { codigo: { contains: q, mode: 'insensitive' } } },
        { curso: { nombre: { contains: q, mode: 'insensitive' } } },
        { codigoSeccion: { contains: q, mode: 'insensitive' } },
      ],
    }),
  };
}

/** Issue 4.31 — GET /api/v1/admin/secciones[?periodo=&q=&tipo=&pagina=] */
export async function listarSecciones(
  filtros: FiltrosSecciones,
  auth: TokenPayload,
  prisma: Pick<PrismaClient, 'seccion'>,
): Promise<ListadoSeccionesDTO> {
  const periodo = filtros.periodo ?? (await obtenerPeriodoVigente(prisma));
  const where = dondeDeFiltros({ ...filtros, ...(periodo && !filtros.periodo ? { periodo } : {}) });

  const [total, filas] = await Promise.all([
    prisma.seccion.count({ where }),
    prisma.seccion.findMany({
      where,
      include: INCLUIR_SECCION,
      orderBy: [{ periodo: 'desc' }, { curso: { codigo: 'asc' } }, { codigoSeccion: 'asc' }],
      skip: (filtros.pagina - 1) * filtros.limite,
      take: filtros.limite,
    }),
  ]);

  return {
    items: filas.map((s) => aSeccionDTO(s, auth.rol)),
    total,
    pagina: filtros.pagina,
    limite: filtros.limite,
  };
}

/** Issue 4.31 — GET /api/v1/admin/secciones/:id */
export async function obtenerSeccionAdmin(
  seccionId: string,
  auth: TokenPayload,
  prisma: Pick<PrismaClient, 'seccion'>,
): Promise<SeccionAdminDTO> {
  const seccion = await prisma.seccion.findUnique({
    where: { id: seccionId },
    include: INCLUIR_SECCION,
  });
  if (!seccion) {
    throw new HttpError(404, `La sección con ID '${seccionId}' no existe`);
  }
  return aSeccionDTO(seccion, auth.rol);
}

// ==========================================
// DOCENTES PARA EL EDITOR DE SECCIONES
// ==========================================

export interface DocenteParaAsignarDTO {
  id: string;
  codigoDocente: string;
  nombre: string;
  departamento: string;
}

/**
 * Listado mínimo de docentes para el selector del editor de secciones (Issue 4.31).
 * No expone correos ni claves: solo lo que hace falta para elegir a quién se asigna el curso.
 */
export async function listarDocentesParaAsignar(
  prisma: Pick<PrismaClient, 'docente'>,
  limite = 50,
): Promise<DocenteParaAsignarDTO[]> {
  const docentes = await prisma.docente.findMany({
    select: { id: true, codigoDocente: true, nombre: true, departamento: true },
    orderBy: [{ nombre: 'asc' }],
    take: Math.min(Math.max(limite, 1), 200),
  });
  return docentes;
}

// ==========================================
// EDICIÓN
// ==========================================

/**
 * Issue 4.31 — PATCH /api/v1/admin/secciones/:id (solo Coordinación Académica).
 *
 * Edita el tipo de aula, el docente y el software requerido. Si la sección ya tiene aula
 * asignada y el software nuevo no está instalado en ella, se genera la alerta de software
 * correspondiente: el cambio no se queda solo en la sección, se refleja en el panel.
 */
export async function actualizarSeccion(
  seccionId: string,
  entrada: ActualizarSeccionInput,
  auth: TokenPayload,
  prisma: PrismaClient,
): Promise<ResultadoEdicionSeccionDTO> {
  if (auth.rol !== RolCuenta.COORDINACION_ACADEMICA) {
    throw new HttpError(403, 'Solo Coordinación Académica puede editar una sección');
  }

  const actual = await prisma.seccion.findUnique({
    where: { id: seccionId },
    include: INCLUIR_SECCION,
  });
  if (!actual) {
    throw new HttpError(404, `La sección con ID '${seccionId}' no existe`);
  }

  const alertas: { id: string; tipo: string; motivo: string }[] = [];

  await prisma.$transaction(async (tx) => {
    if (entrada.docenteId !== undefined) {
      if (entrada.docenteId !== null) {
        const docente = await tx.docente.findUnique({ where: { id: entrada.docenteId } });
        if (!docente) {
          throw new HttpError(404, 'El docente indicado no existe');
        }
      }
      await tx.seccion.update({ where: { id: actual.id }, data: { docenteId: entrada.docenteId } });
    }

    if (entrada.tipoEspacioRequerido !== undefined) {
      await tx.seccion.update({
        where: { id: actual.id },
        data: { tipoEspacioRequerido: entrada.tipoEspacioRequerido },
      });
    }

    if (entrada.softwareRequerido !== undefined) {
      // Se resuelve contra el catálogo: un id inexistente responde 404 y uno dado de baja, 422.
      const software = await resolverSoftwareIds(
        entrada.softwareRequerido.map((s) => s.softwareId),
        tx,
      );
      const versiones = new Map(
        entrada.softwareRequerido.map((s) => [s.softwareId, s.comparacionVersion]),
      );

      await tx.seccionSoftware.deleteMany({ where: { seccionId: actual.id } });
      if (software.length > 0) {
        await tx.seccionSoftware.createMany({
          data: software.map((s) => ({
            seccionId: actual.id,
            softwareId: s.id,
            comparacionVersion: versiones.get(s.id) ?? ('CUALQUIERA' as const),
          })),
        });
      }
    }
  });

  // El laboratorio ya asignado puede no tener el software nuevo: se comprueba y se avisa.
  const actualizada = await prisma.seccion.findUnique({
    where: { id: actual.id },
    include: INCLUIR_SECCION,
  });
  if (!actualizada) {
    throw new HttpError(404, `La sección con ID '${seccionId}' no existe`);
  }

  if (entrada.softwareRequerido !== undefined) {
    const asignacion = actualizada.asignaciones[0];
    if (asignacion && asignacion.estado === EstadoAsignacion.VIGENTE) {
      for (const ae of asignacion.espacios) {
        const espacio = await prisma.espacio.findUnique({
          where: { id: ae.espacioId },
          include: { softwareInstaladoCatalogo: { include: { software: true } } },
        });
        if (!espacio) continue;

        const afectadas = await evaluarIncompatibilidadSoftware(
          espacio.id,
          mapearSoftwareInstalado(espacio.softwareInstaladoCatalogo),
          prisma,
        );
        const alerta = await registrarAlertaDesdeDeteccion(
          TipoAlerta.SOFTWARE,
          espacio.id,
          espacio.identificador,
          afectadas,
          prisma,
        );
        if (alerta) alertas.push({ id: alerta.id, tipo: alerta.tipo, motivo: alerta.motivo });
      }
    }
  }

  return { seccion: aSeccionDTO(actualizada, auth.rol), alertas };
}

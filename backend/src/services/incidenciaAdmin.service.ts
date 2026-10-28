import { EstadoIncidencia, Prisma, PrismaClient, RolCuenta } from '@prisma/client';
import { z } from 'zod';
import { HttpError } from '../lib/http';
import { TokenPayload } from '../types/auth';
import { FiltrosIncidencias, IncidenciaAdminDTO } from '../types/incidencias';
import { verificarAccesoEspacio } from './acceso.service';

const INCLUIR_INCIDENCIA = {
  espacio: true,
  docente: true,
  asignacion: { include: { seccion: { include: { curso: true } } } },
} satisfies Prisma.IncidenciaInclude;

type IncidenciaConDetalle = Prisma.IncidenciaGetPayload<{ include: typeof INCLUIR_INCIDENCIA }>;

function aIncidenciaDTO(i: IncidenciaConDetalle): IncidenciaAdminDTO {
  return {
    id: i.id,
    identificadorSeguimiento: i.identificadorSeguimiento,
    tipo: i.tipo,
    prioridad: i.prioridad,
    estado: i.estado,
    descripcion: i.descripcion,
    evidencia: i.evidencia,
    fechaReporte: i.fechaReporte,
    comentarioCierre: i.comentarioCierre,
    fechaCierre: i.fechaCierre,
    espacio: {
      id: i.espacio.id,
      identificador: i.espacio.identificador,
      pabellon: i.espacio.pabellon,
      piso: i.espacio.piso,
    },
    docente: { codigo: i.docente.codigoDocente, nombre: i.docente.nombre },
    asignacion: {
      id: i.asignacionId,
      codigoCurso: i.asignacion.seccion.curso.codigo,
      nombreCurso: i.asignacion.seccion.curso.nombre,
      codigoSeccion: i.asignacion.seccion.codigoSeccion,
    },
  };
}

/**
 * Issue 7.6: incidencias reportadas por docentes. Coordinación ve todas; Jefatura solo las de
 * los laboratorios que tiene a su cargo (EspacioResponsable). Por defecto, las pendientes.
 * Orden: mayor prioridad primero y, a igual prioridad, las más antiguas primero.
 */
export async function listarIncidencias(
  filtros: FiltrosIncidencias,
  auth: TokenPayload,
  db: Pick<PrismaClient, 'incidencia'>,
): Promise<IncidenciaAdminDTO[]> {
  const soloResponsable =
    auth.rol === RolCuenta.JEFATURA_LABORATORIOS
      ? { espacio: { responsables: { some: { cuentaId: auth.sub } } } }
      : {};

  const pagina = filtros.pagina ?? 1;
  const limite = filtros.limite ?? 50;

  const incidencias = await db.incidencia.findMany({
    where: {
      estado: filtros.estado ?? EstadoIncidencia.PENDIENTE,
      ...(filtros.prioridad && { prioridad: filtros.prioridad }),
      ...(filtros.espacioId && { espacioId: filtros.espacioId }),
      ...soloResponsable,
    },
    include: INCLUIR_INCIDENCIA,
    orderBy: { fechaReporte: 'asc' },
    skip: (pagina - 1) * limite,
    take: limite,
  });

  const peso = { ALTA: 0, MEDIA: 1, BAJA: 2 } as const;
  return incidencias.map(aIncidenciaDTO).sort((a, b) => peso[a.prioridad] - peso[b.prioridad]);
}

export const CerrarIncidenciaSchema = z
  .object({
    estado: z.enum([EstadoIncidencia.RESUELTA, EstadoIncidencia.DESCARTADA], {
      error: 'El estado debe ser RESUELTA o DESCARTADA',
    }),
    comentario: z
      .string()
      .trim()
      .min(3, 'El comentario de cierre debe tener al menos 3 caracteres')
      .max(1000, 'El comentario de cierre no puede superar los 1000 caracteres'),
  })
  .strict();

export type CerrarIncidenciaInput = z.infer<typeof CerrarIncidenciaSchema>;

/**
 * Issue 7.6: Jefatura resuelve o descarta una incidencia pendiente, con comentario de cierre.
 * Jefatura solo puede cerrar las de sus laboratorios (403); una ya cerrada responde 409.
 */
export async function cerrarIncidencia(
  incidenciaId: string,
  entrada: CerrarIncidenciaInput,
  auth: TokenPayload,
  prisma: Pick<PrismaClient, '$transaction'>,
): Promise<IncidenciaAdminDTO> {
  return prisma.$transaction(async (tx) => {
    const incidencia = await tx.incidencia.findUnique({ where: { id: incidenciaId } });
    if (!incidencia) {
      throw new HttpError(404, `La incidencia con ID '${incidenciaId}' no existe`);
    }

    await verificarAccesoEspacio(auth, incidencia.espacioId, tx);

    if (incidencia.estado !== EstadoIncidencia.PENDIENTE) {
      throw new HttpError(409, 'La incidencia ya fue cerrada');
    }

    const cerrada = await tx.incidencia.update({
      where: { id: incidencia.id },
      data: {
        estado: entrada.estado,
        comentarioCierre: entrada.comentario,
        fechaCierre: new Date(),
      },
      include: INCLUIR_INCIDENCIA,
    });

    return aIncidenciaDTO(cerrada);
  });
}

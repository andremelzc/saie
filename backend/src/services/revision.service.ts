import { EstadoAsignacion, PrismaClient } from '@prisma/client';
import { SeccionesEscaladasDTO } from '../types/revision';
import { obtenerPeriodoVigente } from './periodo.service';

/**
 * Issue 4.22: secciones cuya asignación vigente más reciente quedó ESCALADA (el motor no
 * encontró espacio) y requieren revisión manual. Por defecto solo el periodo vigente; las
 * escaladas más antiguas primero, para atender primero lo que lleva más tiempo esperando.
 *
 * Una sección que luego se reasignó tiene una asignación nueva y la ESCALADA anterior pasa a
 * HISTORICA, por lo que deja de aparecer aquí.
 */
export async function listarSeccionesEscaladas(
  periodoSolicitado: string | undefined,
  prisma: Pick<PrismaClient, 'asignacion' | 'seccion'>,
): Promise<SeccionesEscaladasDTO> {
  const periodo = periodoSolicitado ?? (await obtenerPeriodoVigente(prisma));
  if (!periodo) {
    return { periodo: null, total: 0, secciones: [] };
  }

  const asignaciones = await prisma.asignacion.findMany({
    where: { estado: EstadoAsignacion.ESCALADA, seccion: { periodo } },
    include: {
      seccion: {
        include: {
          curso: true,
          docente: true,
          horarios: true,
          _count: { select: { matriculas: true } },
        },
      },
    },
    orderBy: { fechaAsignacion: 'asc' },
  });

  const secciones = asignaciones.map((a) => ({
    asignacionId: a.id,
    fechaEscalamiento: a.fechaAsignacion,
    motivoEscalamiento: a.motivoEscalamiento,
    seccion: {
      id: a.seccion.id,
      codigoCurso: a.seccion.curso.codigo,
      nombreCurso: a.seccion.curso.nombre,
      codigoSeccion: a.seccion.codigoSeccion,
      periodo: a.seccion.periodo,
      docenteNombre: a.seccion.docente?.nombre ?? null,
      tipoEspacioRequerido: a.seccion.tipoEspacioRequerido,
      stackSoftwareRequerido: a.seccion.stackSoftwareRequerido,
      alumnosMatriculados: a.seccion._count.matriculas,
      horarios: a.seccion.horarios.map((h) => ({
        diaSemana: h.diaSemana,
        horaInicio: h.horaInicio,
        horaFin: h.horaFin,
      })),
    },
  }));

  return { periodo, total: secciones.length, secciones };
}

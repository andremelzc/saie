import { EstadoAsignacion, Prisma, PrismaClient, TipoEventoAuditoria } from '@prisma/client';
import { HttpError } from '../lib/http';
import { formatearSoftware } from '../lib/software';
import {
  CuentaAuditoriaDTO,
  EspacioAuditoriaDTO,
  FiltrosAuditoria,
  FiltrosHistorial,
  HistorialAsignacionDTO,
  ListadoAuditoriaDTO,
  ListadoHistorialDTO,
  RegistroAuditoriaDTO,
  ReporteAsignacionesDTO,
  ReporteSeccionDTO,
} from '../types/auditoria';
import { obtenerPeriodoVigente } from './periodo.service';

/**
 * Issue 4.32 — auditoría e historial de asignaciones.
 *
 * Los datos ya existían: `RegistroAuditoria` deja constancia de cada evento del motor y
 * `Asignacion` conserva el estado `HISTORICA` de las asignaciones que dejaron de estar
 * vigentes. Este servicio los expone para que Coordinación pueda responder "¿qué pasó con esta
 * sección?" y el informe de salones pueda_armarse.
 */

const INCLUIR_REGISTRO = {
  asignacion: {
    include: { seccion: { include: { curso: true } } },
  },
} satisfies Prisma.RegistroAuditoriaInclude;

/** Issue 4.32 — GET /api/v1/admin/auditoria[?tipo=&desde=&hasta=&pagina=] */
export async function listarAuditoria(
  filtros: FiltrosAuditoria,
  prisma: Pick<PrismaClient, 'registroAuditoria' | 'espacio' | 'cuenta'>,
): Promise<ListadoAuditoriaDTO> {
  const where = {
    ...(filtros.tipo && { tipoEvento: filtros.tipo }),
    ...(filtros.desde || filtros.hasta
      ? {
          fechaHora: {
            ...(filtros.desde && { gte: filtros.desde }),
            ...(filtros.hasta && { lte: filtros.hasta }),
          },
        }
      : {}),
  };

  const [total, filas] = await Promise.all([
    prisma.registroAuditoria.count({ where }),
    prisma.registroAuditoria.findMany({
      where,
      include: INCLUIR_REGISTRO,
      orderBy: { fechaHora: 'desc' },
      skip: (filtros.pagina - 1) * filtros.limite,
      take: filtros.limite,
    }),
  ]);

  const [espacios, cuentas] = await Promise.all([
    resolverEspacios(
      filas.flatMap((r) => r.espaciosIds),
      prisma,
    ),
    resolverCuentas(
      filas.map((r) => r.cuentaId).filter((id): id is string => id !== null),
      prisma,
    ),
  ]);

  const items: RegistroAuditoriaDTO[] = filas.map((r) => ({
    id: r.id,
    tipoEvento: r.tipoEvento,
    detalle: r.detalle,
    fechaHora: r.fechaHora.toISOString(),
    asignacionId: r.asignacionId,
    alertaId: r.alertaId,
    corridaId: r.corridaId,
    origen: r.origen,
    puntaje: r.puntaje,
    espaciosIds: r.espaciosIds,
    espacios: r.espaciosIds.flatMap((id) => espacios.get(id) ?? []),
    cuenta: r.cuentaId ? (cuentas.get(r.cuentaId) ?? null) : null,
    seccion: r.asignacion
      ? {
          id: r.asignacion.seccion.id,
          codigoCurso: r.asignacion.seccion.curso.codigo,
          codigoSeccion: r.asignacion.seccion.codigoSeccion,
          nombreCurso: r.asignacion.seccion.curso.nombre,
        }
      : null,
  }));

  return { items, total, pagina: filtros.pagina, limite: filtros.limite };
}

/** Espacios por id, en una sola consulta (sin consulta si ningún registro trae espacios). */
async function resolverEspacios(
  ids: string[],
  prisma: Pick<PrismaClient, 'espacio'>,
): Promise<Map<string, EspacioAuditoriaDTO>> {
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return new Map();
  const filas = await prisma.espacio.findMany({
    where: { id: { in: unicos } },
    select: { id: true, identificador: true, pabellon: true, piso: true },
  });
  return new Map(filas.map((e) => [e.id, e]));
}

/** Nombre de cada cuenta: el de su alumno o docente y, si no tiene ficha, su usuario. */
async function resolverCuentas(
  ids: string[],
  prisma: Pick<PrismaClient, 'cuenta'>,
): Promise<Map<string, CuentaAuditoriaDTO>> {
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return new Map();
  const filas = await prisma.cuenta.findMany({
    where: { id: { in: unicos } },
    select: {
      id: true,
      usuarioLogin: true,
      alumno: { select: { nombre: true } },
      docente: { select: { nombre: true } },
    },
  });
  return new Map(
    filas.map((c) => [
      c.id,
      { id: c.id, nombre: c.docente?.nombre ?? c.alumno?.nombre ?? c.usuarioLogin },
    ]),
  );
}

const INCLUIR_ASIGNACION = {
  espacios: { include: { espacio: true } },
  seccion: { include: { curso: true } },
  // El asiento de la decisión del motor: de ahí salen el origen y el puntaje (Issue 4.48).
  auditorias: {
    where: {
      tipoEvento: { in: [TipoEventoAuditoria.ASIGNACION, TipoEventoAuditoria.ESCALAMIENTO] },
    },
    orderBy: { fechaHora: 'desc' },
    take: 1,
  },
} satisfies Prisma.AsignacionInclude;

/**
 * Issue 4.32 — GET /api/v1/admin/asignaciones/historial[?seccionId=&periodo=&estado=]
 *
 * Incluye las asignaciones `HISTORICA`: son el rastro de lo que el motor decidió en las
 * corridas anteriores y hoy no se mostraban en ninguna parte.
 */
export async function listarHistorialAsignaciones(
  filtros: FiltrosHistorial,
  prisma: Pick<PrismaClient, 'asignacion'>,
): Promise<ListadoHistorialDTO> {
  const where = {
    ...(filtros.seccionId && { seccionId: filtros.seccionId }),
    ...(filtros.periodo && { seccion: { periodo: filtros.periodo } }),
    ...(filtros.estado && { estado: filtros.estado }),
  };

  const [total, filas] = await Promise.all([
    prisma.asignacion.count({ where }),
    prisma.asignacion.findMany({
      where,
      include: INCLUIR_ASIGNACION,
      orderBy: { fechaAsignacion: 'desc' },
      skip: (filtros.pagina - 1) * filtros.limite,
      take: filtros.limite,
    }),
  ]);

  const items: HistorialAsignacionDTO[] = filas.map((a) => ({
    id: a.id,
    seccionId: a.seccionId,
    codigoCurso: a.seccion.curso.codigo,
    nombreCurso: a.seccion.curso.nombre,
    codigoSeccion: a.seccion.codigoSeccion,
    periodo: a.seccion.periodo,
    estado: a.estado,
    fechaAsignacion: a.fechaAsignacion.toISOString(),
    corridaId: a.corridaId,
    origen: a.auditorias[0]?.origen ?? null,
    puntaje: a.auditorias[0]?.puntaje ?? null,
    motivoEscalamiento: a.motivoEscalamiento,
    espacios: a.espacios.map((ae) => ({
      id: ae.espacio.id,
      identificador: ae.espacio.identificador,
      pabellon: ae.espacio.pabellon,
      piso: ae.espacio.piso,
    })),
  }));

  return { items, total, pagina: filtros.pagina, limite: filtros.limite };
}

/**
 * Issue 4.33 — GET /api/v1/admin/reporte/asignaciones[?periodo=]
 *
 * Informe de salones: una fila por sección del periodo con el aula que tiene asignada. Las
 * secciones que el motor no pudo asignar aparecen con `sinAula = true`: es justo lo que hay
 * que revisar antes de presentar el cuadro.
 */
export async function generarReporteAsignaciones(
  periodoSolicitado: string | undefined,
  prisma: Pick<PrismaClient, 'seccion' | 'espacio'>,
): Promise<ReporteAsignacionesDTO> {
  const periodo = periodoSolicitado ?? (await obtenerPeriodoVigente(prisma));
  if (!periodo) {
    throw new HttpError(404, 'No hay ningún periodo con secciones cargadas');
  }

  const secciones = await prisma.seccion.findMany({
    where: { periodo },
    include: {
      curso: true,
      docente: true,
      _count: { select: { matriculas: true } },
      softwareRequerido: { include: { software: true } },
      horarios: { orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }] },
      asignaciones: {
        where: { estado: { in: [EstadoAsignacion.VIGENTE, EstadoAsignacion.ESCALADA] } },
        orderBy: { fechaAsignacion: 'desc' },
        take: 1,
        include: { espacios: { include: { espacio: true } } },
      },
    },
    orderBy: [{ curso: { codigo: 'asc' } }, { codigoSeccion: 'asc' }],
  });

  const filas: ReporteSeccionDTO[] = secciones.map((s) => {
    const asignacion = s.asignaciones[0];
    const aula = asignacion?.espacios[0]?.espacio ?? null;
    return {
      codigoCurso: s.curso.codigo,
      nombreCurso: s.curso.nombre,
      codigoSeccion: s.codigoSeccion,
      tipoEspacioRequerido: s.tipoEspacioRequerido,
      docente: s.docente?.nombre ?? null,
      aula: aula
        ? { identificador: aula.identificador, pabellon: aula.pabellon, piso: aula.piso }
        : null,
      sinAula: !aula,
      horarios: s.horarios.map((h) => `${h.diaSemana} ${h.horaInicio}-${h.horaFin}`),
      alumnosMatriculados: s._count.matriculas,
      softwareRequerido: s.softwareRequerido
        .map((fila) => formatearSoftware(fila.software))
        .sort((a, b) => a.localeCompare(b, 'es')),
    };
  });

  const aulasDistintas = new Set(
    filas.filter((f) => f.aula).map((f) => `${f.aula!.pabellon}|${f.aula!.identificador}`),
  ).size;

  return {
    periodo,
    generadoEn: new Date().toISOString(),
    secciones: filas,
    totales: {
      secciones: filas.length,
      asignadas: filas.filter((f) => !f.sinAula).length,
      sinAula: filas.filter((f) => f.sinAula).length,
      aulasDistintas: aulasDistintas,
      alumnos: filas.reduce((suma, f) => suma + f.alumnosMatriculados, 0),
    },
  };
}

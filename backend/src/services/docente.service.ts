import { randomBytes } from 'crypto';
import {
  DiaSemana,
  EstadoAsignacion,
  Prisma,
  PrismaClient,
  PrioridadIncidencia,
  TipoEspacio,
  TipoIncidencia,
} from '@prisma/client';
import { z } from 'zod';
import { bus } from '../events/bus';
import { HttpError } from '../lib/http';
import {
  agruparPorDia,
  construirSesiones,
  diaYMinutosEnLima,
  formatearHora,
  INCLUIR_SECCION_CON_ASIGNACION,
  mapearEspacios,
} from '../lib/horario';
import { calcularCapacidadReal } from '../rules/calcularCapacidadReal';
import { validarSoftwareLaboratorio } from '../rules/validarSoftware';
import { mapearSoftwareInstalado, mapearSoftwareRequerido } from './software.service';
import {
  AsignacionOcupacionInput,
  calcularEspaciosDisponibles,
  HorarioSlot,
} from './disponibilidad.service';
import { obtenerPeriodoVigente } from './periodo.service';
import { IncidenciaDocenteDTO } from '../types/incidencias';
import {
  AsignacionActivaDocenteDTO,
  CambioAulaDocenteDTO,
  EspacioCambioAulaDTO,
  EstadoLaboratorioDocenteDTO,
  EspacioExploradorDTO,
  ExploradorEspaciosDTO,
  HorarioDocenteDTO,
} from '../types/portal';

/** El id del docente sale del JWT: un docente solo llega a sus propias secciones. */
export async function obtenerDocenteDeCuenta(
  cuentaId: string,
  prisma: Pick<PrismaClient, 'docente'>,
) {
  const docente = await prisma.docente.findUnique({ where: { cuentaId } });
  if (!docente) {
    throw new HttpError(404, 'No hay un docente asociado a esta cuenta');
  }
  return docente;
}

/** Días durante los que el portal muestra un cambio de aula (Issue 7.18). */
export const DIAS_AVISO_CAMBIO_AULA = 7;
const MS_DIA = 24 * 60 * 60 * 1000;

interface SeccionParaAviso {
  id: string;
  codigoSeccion: string;
  tipoEspacioRequerido: TipoEspacio;
  curso: { codigo: string; nombre: string };
}

function mismosEspacios(a: EspacioCambioAulaDTO[], b: EspacioCambioAulaDTO[]): boolean {
  const clave = (l: EspacioCambioAulaDTO[]) =>
    l
      .map((e) => e.identificador)
      .sort((x, y) => x.localeCompare(y))
      .join('|');
  return clave(a) === clave(b);
}

/**
 * Issue 7.18 (riesgo R24): el aviso de cambio de aula por Telegram solo llega a los alumnos; el
 * docente podía llegar al aula anterior. Aquí se detectan los cambios recientes de sus secciones
 * para mostrarlos en su portal.
 *
 * Hay cambio cuando la asignación más reciente de la sección es de los últimos
 * `DIAS_AVISO_CAMBIO_AULA` días y sus espacios difieren de los de la última asignación anterior
 * que tuvo aula. La primera asignación de una sección no es un cambio: no había aula antes.
 */
export async function cambiosDeAulaDocente(
  secciones: SeccionParaAviso[],
  prisma: Pick<PrismaClient, 'asignacion'>,
  ahora: Date = new Date(),
): Promise<CambioAulaDocenteDTO[]> {
  if (secciones.length === 0) return [];

  const asignaciones = await prisma.asignacion.findMany({
    where: { seccionId: { in: secciones.map((s) => s.id) } },
    orderBy: { fechaAsignacion: 'desc' },
    select: {
      id: true,
      seccionId: true,
      fechaAsignacion: true,
      espacios: {
        select: {
          espacio: { select: { identificador: true, tipo: true, pabellon: true, piso: true } },
        },
      },
    },
  });

  const desde = ahora.getTime() - DIAS_AVISO_CAMBIO_AULA * MS_DIA;
  const cambios: CambioAulaDocenteDTO[] = [];

  for (const seccion of secciones) {
    const historial = asignaciones.filter((a) => a.seccionId === seccion.id);
    const [ultima, ...anteriores] = historial;
    if (!ultima || ultima.fechaAsignacion.getTime() < desde) continue;

    const previa = anteriores.find((a) => a.espacios.length > 0);
    if (!previa) continue;

    const espaciosNuevos = ultima.espacios.map((e) => e.espacio);
    const espaciosAnteriores = previa.espacios.map((e) => e.espacio);
    if (mismosEspacios(espaciosNuevos, espaciosAnteriores)) continue;

    cambios.push({
      id: ultima.id,
      seccionId: seccion.id,
      codigoCurso: seccion.curso.codigo,
      nombreCurso: seccion.curso.nombre,
      codigoSeccion: seccion.codigoSeccion,
      tipoEspacioRequerido: seccion.tipoEspacioRequerido,
      fecha: ultima.fechaAsignacion.toISOString(),
      espaciosAnteriores,
      espaciosNuevos,
    });
  }

  return cambios.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

/**
 * Issue 7.2: horario del docente autenticado (por día o semana completa) y la lista de sus
 * asignaciones activas del periodo vigente, con número de alumnos matriculados. Issue 7.18:
 * también los cambios de aula recientes de sus secciones.
 */
export async function obtenerHorarioDocente(
  cuentaId: string,
  dia: DiaSemana | undefined,
  prisma: PrismaClient,
): Promise<HorarioDocenteDTO> {
  const docente = await obtenerDocenteDeCuenta(cuentaId, prisma);
  const periodo = await obtenerPeriodoVigente(prisma);

  const secciones = periodo
    ? await prisma.seccion.findMany({
        where: { docenteId: docente.id, periodo },
        include: {
          ...INCLUIR_SECCION_CON_ASIGNACION,
          _count: { select: { matriculas: true } },
        },
        orderBy: [{ cursoId: 'asc' }, { codigoSeccion: 'asc' }],
      })
    : [];

  const asignacionesActivas: AsignacionActivaDocenteDTO[] = secciones
    .filter((s) => s.asignaciones[0]?.estado === EstadoAsignacion.VIGENTE)
    .map((s) => ({
      asignacionId: s.asignaciones[0].id,
      codigoCurso: s.curso.codigo,
      nombreCurso: s.curso.nombre,
      codigoSeccion: s.codigoSeccion,
      horarios: s.horarios.map((h) => ({
        diaSemana: h.diaSemana,
        horaInicio: h.horaInicio,
        horaFin: h.horaFin,
      })),
      espacios: mapearEspacios(s),
      numeroAlumnos: s._count.matriculas,
    }))
    .sort(
      (a, b) =>
        a.codigoCurso.localeCompare(b.codigoCurso) ||
        a.codigoSeccion.localeCompare(b.codigoSeccion),
    );

  return {
    periodo,
    vista: dia ? 'dia' : 'semana',
    dias: agruparPorDia(construirSesiones(secciones), dia),
    asignacionesActivas,
    cambiosDeAula: await cambiosDeAulaDocente(secciones, prisma),
  };
}

// ---------------------------------------------------------------------------
// Issue 7.3 — Explorar disponibilidad de espacios
// ---------------------------------------------------------------------------

export interface FiltrosExplorador {
  tipo?: TipoEspacio;
  pabellon?: string;
  piso?: number;
  capacidadMinima?: number;
  soloDisponibles?: boolean;
  /** Franja a consultar; por defecto, el momento actual (hora de Lima). */
  franja?: HorarioSlot;
}

/**
 * Issue 7.3: lista los espacios del campus con filtros (tipo, pabellón, piso, capacidad real
 * mínima) y marca si están disponibles en la franja. La disponibilidad la decide
 * `calcularEspaciosDisponibles` (Issue 2.4): solo cuentan las asignaciones VIGENTES.
 */
export async function explorarEspacios(
  filtros: FiltrosExplorador,
  prisma: Pick<PrismaClient, 'espacio' | 'asignacion'>,
  ahora: Date = new Date(),
): Promise<ExploradorEspaciosDTO> {
  const franja =
    filtros.franja ??
    (() => {
      const { dia, minutos } = diaYMinutosEnLima(ahora);
      return {
        diaSemana: dia,
        horaInicio: formatearHora(minutos),
        horaFin: formatearHora(minutos + 1),
      };
    })();

  const espacios = await prisma.espacio.findMany({
    where: {
      habilitado: true,
      ...(filtros.tipo && { tipo: filtros.tipo }),
      ...(filtros.pabellon && { pabellon: { equals: filtros.pabellon, mode: 'insensitive' } }),
      ...(filtros.piso !== undefined && { piso: filtros.piso }),
    },
    orderBy: [{ pabellon: 'asc' }, { piso: 'asc' }, { identificador: 'asc' }],
    take: 200,
  });

  const vigentes = await prisma.asignacion.findMany({
    where: { estado: EstadoAsignacion.VIGENTE },
    include: { espacios: true, seccion: { include: { horarios: true } } },
  });

  const ocupacion: AsignacionOcupacionInput[] = vigentes.map((a) => ({
    id: a.id,
    estado: a.estado,
    espacioIds: a.espacios.map((ae) => ae.espacioId),
    horarios: a.seccion.horarios.map((h) => ({
      diaSemana: h.diaSemana,
      horaInicio: h.horaInicio,
      horaFin: h.horaFin,
    })),
  }));

  const idsDisponibles = new Set<string>();
  for (const tipo of [TipoEspacio.AULA_TEORICA, TipoEspacio.LABORATORIO]) {
    for (const libre of calcularEspaciosDisponibles(franja, tipo, espacios, ocupacion)) {
      idsDisponibles.add(libre.id);
    }
  }

  const resultado: EspacioExploradorDTO[] = espacios
    .map((e) => ({
      id: e.id,
      identificador: e.identificador,
      tipo: e.tipo,
      pabellon: e.pabellon,
      piso: e.piso,
      aforoNominal: e.aforoNominal,
      capacidadReal: calcularCapacidadReal(e),
      disponible: idsDisponibles.has(e.id),
    }))
    .filter(
      (e) => filtros.capacidadMinima === undefined || e.capacidadReal >= filtros.capacidadMinima,
    )
    .filter((e) => !filtros.soloDisponibles || e.disponible);

  return { franja, espacios: resultado };
}

// ---------------------------------------------------------------------------
// Issue 7.5 — Registrar incidencia
// ---------------------------------------------------------------------------

export const CrearIncidenciaSchema = z
  .object({
    asignacionId: z.string().min(1, 'La asignación afectada es requerida'),
    espacioId: z.string().min(1, 'El espacio es requerido'),
    tipo: z.enum(TipoIncidencia, { error: 'El tipo de incidencia no es válido' }),
    descripcion: z
      .string()
      .trim()
      .min(5, 'La descripción debe tener al menos 5 caracteres')
      .max(1000, 'La descripción no puede superar los 1000 caracteres'),
    prioridad: z
      .enum(PrioridadIncidencia, { error: 'La prioridad no es válida' })
      .default(PrioridadIncidencia.MEDIA),
    evidencia: z.string().trim().max(500).optional(),
  })
  .strict();

export type CrearIncidenciaInput = z.infer<typeof CrearIncidenciaSchema>;

export interface IncidenciaRegistradaDTO {
  /** Issue 7.19: con él se adjunta la foto (`POST /docente/incidencias/:id/imagen`). */
  id: string;
  identificadorSeguimiento: string;
  estado: 'PENDIENTE';
  fechaReporte: Date;
  mensaje: string;
}

/** Código público corto (cabe en VARCHAR(20)): INC- + 8 hex en mayúsculas. */
export function generarIdentificadorSeguimiento(): string {
  return `INC-${randomBytes(4).toString('hex').toUpperCase()}`;
}

function esColisionDeIdentificador(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/**
 * Issue 7.5: el docente reporta una incidencia sobre un espacio de una asignación suya.
 * Valida que la asignación esté vigente y sea de una sección del docente, y que el espacio
 * pertenezca al bloque asignado. Devuelve el identificador de seguimiento.
 */
export async function registrarIncidencia(
  cuentaId: string,
  entrada: CrearIncidenciaInput,
  prisma: PrismaClient,
): Promise<IncidenciaRegistradaDTO> {
  const docente = await obtenerDocenteDeCuenta(cuentaId, prisma);

  const asignacion = await prisma.asignacion.findFirst({
    where: {
      id: entrada.asignacionId,
      estado: EstadoAsignacion.VIGENTE,
      seccion: { docenteId: docente.id },
    },
    include: { espacios: true },
  });

  if (!asignacion) {
    throw new HttpError(404, 'La asignación no existe, no está vigente o no te pertenece');
  }

  if (!asignacion.espacios.some((ae) => ae.espacioId === entrada.espacioId)) {
    throw new HttpError(400, 'El espacio indicado no forma parte de la asignación');
  }

  for (let intento = 0; intento < 3; intento++) {
    try {
      const incidencia = await prisma.incidencia.create({
        data: {
          docenteId: docente.id,
          asignacionId: asignacion.id,
          espacioId: entrada.espacioId,
          tipo: entrada.tipo,
          descripcion: entrada.descripcion,
          prioridad: entrada.prioridad,
          evidencia: entrada.evidencia,
          identificadorSeguimiento: generarIdentificadorSeguimiento(),
        },
      });

      // Issue 4.60: Jefatura recibe un aviso inmediato de las incidencias de prioridad alta.
      void bus.emitir('incidencia.registrada', {
        incidenciaId: incidencia.id,
        prioridad: incidencia.prioridad,
      });

      return {
        id: incidencia.id,
        identificadorSeguimiento: incidencia.identificadorSeguimiento,
        estado: 'PENDIENTE',
        fechaReporte: incidencia.fechaReporte,
        mensaje: 'Incidencia registrada. Guarda el identificador para hacer seguimiento.',
      };
    } catch (error: unknown) {
      if (!esColisionDeIdentificador(error) || intento === 2) throw error;
    }
  }

  // Inalcanzable: el bucle devuelve o lanza.
  throw new HttpError(500, 'No se pudo generar el identificador de seguimiento');
}

// ---------------------------------------------------------------------------
// Issue 7.14 — Consultar mis incidencias
// ---------------------------------------------------------------------------

const INCLUIR_INCIDENCIA_DOCENTE = {
  espacio: true,
  // Issue 7.19: solo si hay foto; los bytes se piden aparte.
  imagen: { select: { id: true } },
  asignacion: { include: { seccion: { include: { curso: true } } } },
} satisfies Prisma.IncidenciaInclude;

/**
 * Issue 7.14: incidencias reportadas por el docente autenticado, de la más reciente a la más
 * antigua. El filtro por `docenteId` sale de la cuenta del token: nunca ve las de otra persona.
 */
export async function listarMisIncidencias(
  cuentaId: string,
  prisma: Pick<PrismaClient, 'docente' | 'incidencia'>,
): Promise<IncidenciaDocenteDTO[]> {
  const docente = await obtenerDocenteDeCuenta(cuentaId, prisma);

  const incidencias = await prisma.incidencia.findMany({
    where: { docenteId: docente.id },
    include: INCLUIR_INCIDENCIA_DOCENTE,
    orderBy: { fechaReporte: 'desc' },
  });

  return incidencias.map((i) => ({
    id: i.id,
    identificadorSeguimiento: i.identificadorSeguimiento,
    tipo: i.tipo,
    prioridad: i.prioridad,
    estado: i.estado,
    descripcion: i.descripcion,
    evidencia: i.evidencia,
    tieneImagen: Boolean(i.imagen),
    fechaReporte: i.fechaReporte,
    comentarioCierre: i.comentarioCierre,
    fechaCierre: i.fechaCierre,
    espacio: {
      id: i.espacio.id,
      identificador: i.espacio.identificador,
      pabellon: i.espacio.pabellon,
      piso: i.espacio.piso,
    },
    asignacion: {
      id: i.asignacionId,
      codigoCurso: i.asignacion.seccion.curso.codigo,
      nombreCurso: i.asignacion.seccion.curso.nombre,
      codigoSeccion: i.asignacion.seccion.codigoSeccion,
    },
  }));
}

// ---------------------------------------------------------------------------
// Issue 7.4 — Estado de equipos del laboratorio del docente
// ---------------------------------------------------------------------------

const MAX_CAMBIOS_HISTORIAL = 20;

/**
 * Issue 7.4: antes de su clase, el docente consulta cuántas PCs están operativas, qué software
 * hay instalado, si cubre el stack de su curso y los últimos cambios del laboratorio.
 *
 * Solo accede a laboratorios donde tiene una asignación VIGENTE (404 en cualquier otro caso,
 * para no revelar qué espacios existen).
 */
export async function obtenerEstadoLaboratorioDocente(
  cuentaId: string,
  espacioId: string,
  prisma: Pick<PrismaClient, 'docente' | 'asignacion' | 'historialEspacio'>,
): Promise<EstadoLaboratorioDocenteDTO> {
  const docente = await obtenerDocenteDeCuenta(cuentaId, prisma);

  const asignaciones = await prisma.asignacion.findMany({
    where: {
      estado: EstadoAsignacion.VIGENTE,
      seccion: { docenteId: docente.id },
      espacios: { some: { espacioId, espacio: { tipo: TipoEspacio.LABORATORIO } } },
    },
    include: {
      espacios: {
        include: {
          espacio: {
            include: { softwareInstaladoCatalogo: { include: { software: true } } },
          },
        },
      },
      seccion: {
        include: { curso: true, softwareRequerido: { include: { software: true } } },
      },
    },
  });

  const laboratorio = asignaciones[0]?.espacios.find((ae) => ae.espacioId === espacioId)?.espacio;
  if (!laboratorio) {
    throw new HttpError(404, 'No tienes una asignación vigente en ese laboratorio');
  }

  const historial = await prisma.historialEspacio.findMany({
    where: { espacioId },
    orderBy: { fechaCambio: 'desc' },
    take: MAX_CAMBIOS_HISTORIAL,
  });

  const cursos = asignaciones
    .map((a) => {
      const requerido = mapearSoftwareRequerido(a.seccion.softwareRequerido);
      const { cumple, softwareFaltante } = validarSoftwareLaboratorio(
        mapearSoftwareInstalado(laboratorio.softwareInstaladoCatalogo),
        requerido,
      );
      return {
        asignacionId: a.id,
        codigoCurso: a.seccion.curso.codigo,
        nombreCurso: a.seccion.curso.nombre,
        codigoSeccion: a.seccion.codigoSeccion,
        softwareRequerido: a.seccion.softwareRequerido.map((fila) => ({
          id: fila.softwareId,
          nombre: fila.software.nombre,
          version: fila.software.version,
          comparacionVersion: fila.comparacionVersion,
        })),
        softwareFaltante,
        cumple,
      };
    })
    .sort(
      (a, b) =>
        a.codigoCurso.localeCompare(b.codigoCurso) ||
        a.codigoSeccion.localeCompare(b.codigoSeccion),
    );

  const pcsMalogradas = laboratorio.pcsMalogradas ?? 0;

  return {
    laboratorio: {
      id: laboratorio.id,
      identificador: laboratorio.identificador,
      pabellon: laboratorio.pabellon,
      piso: laboratorio.piso,
      aforoNominal: laboratorio.aforoNominal,
      pcsMalogradas,
      pcsOperativas: calcularCapacidadReal(laboratorio),
      softwareInstalado: laboratorio.softwareInstaladoCatalogo.map((fila) => ({
        id: fila.softwareId,
        nombre: fila.software.nombre,
        version: fila.software.version,
      })),
    },
    cursos,
    historial: historial.map((h) => ({
      campo: h.campo,
      valorAnterior: h.valorAnterior,
      valorNuevo: h.valorNuevo,
      fechaCambio: h.fechaCambio,
    })),
  };
}

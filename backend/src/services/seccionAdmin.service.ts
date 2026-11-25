import {
  DiaSemana,
  EstadoAsignacion,
  Prisma,
  PrismaClient,
  RolCuenta,
  TipoAlerta,
  TipoEspacio,
  TipoEventoAuditoria,
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
  FranjaSeccionInput,
  ListadoSeccionesDTO,
  ReasignacionSeccionDTO,
  ResultadoEdicionSeccionDTO,
  SeccionAdminDTO,
  SoftwareRequeridoInputSeccion,
} from '../types/secciones';
import { registrarAlertaDesdeDeteccion } from './alerta.service';
import {
  CamposAuditados,
  calcularCambios,
  registrarAccionDePersona,
} from './auditoriaAcciones.service';
import { ejecutarAsignacionADemanda } from './asignacionDemanda.service';
import { evaluarIncompatibilidadSoftware } from './deteccionAlertas.service';
import { haySolapamientoHorario } from './disponibilidad.service';
import { asegurarPeriodoEscribible, obtenerPeriodoVigente } from './periodo.service';
import { mapearSoftwareInstalado, resolverSoftwareIds } from './software.service';

type Db = Prisma.TransactionClient;

/**
 * Issue 4.31 — gestión individual de secciones.
 *
 * La carga masiva crea y actualiza secciones, pero no había forma de verlas una por una ni de
 * cambiarles el software requerido sin reimportar el CSV. Este servicio expone el listado y
 * permite a Coordinación editar el tipo de aula, el docente y el software requerido. Issue 4.62:
 * también el horario (agregar, cambiar y quitar franjas) sin volver a cargar el CSV completo.
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

const HORA_HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const NOMBRE_DIA: Record<DiaSemana, string> = {
  LUNES: 'Lunes',
  MARTES: 'Martes',
  MIERCOLES: 'Miércoles',
  JUEVES: 'Jueves',
  VIERNES: 'Viernes',
  SABADO: 'Sábado',
  DOMINGO: 'Domingo',
};

/** «Lunes 08:00–10:00»: así se muestra una franja en avisos y en la auditoría. */
export function textoFranja(f: FranjaSeccionInput): string {
  return `${NOMBRE_DIA[f.diaSemana]} ${f.horaInicio}–${f.horaFin}`;
}

/** Issue 4.62: una franja del horario, con el inicio antes que el fin. */
const franjaSeccion = z
  .object({
    diaSemana: z.enum(DiaSemana, { error: 'El día de la semana no es válido' }),
    horaInicio: z.string().regex(HORA_HHMM, 'La hora de inicio debe tener formato HH:mm (24 h)'),
    horaFin: z.string().regex(HORA_HHMM, 'La hora de fin debe tener formato HH:mm (24 h)'),
  })
  .strict()
  .refine((f) => f.horaInicio < f.horaFin, {
    message: 'La hora de inicio debe ser anterior a la hora de fin',
    path: ['horaFin'],
  });

/** Las franjas de una misma sección no pueden pisarse entre sí. */
const horariosSeccion = z
  .array(franjaSeccion)
  .max(20, 'Demasiadas franjas para una sección')
  .superRefine((franjas, ctx) => {
    for (let i = 0; i < franjas.length; i++) {
      for (let j = i + 1; j < franjas.length; j++) {
        if (haySolapamientoHorario(franjas[i], franjas[j])) {
          ctx.addIssue({
            code: 'custom',
            message: `Las franjas ${textoFranja(franjas[i])} y ${textoFranja(franjas[j])} se cruzan`,
            path: [j],
          });
        }
      }
    }
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
    horarios: horariosSeccion.optional(),
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
  prisma: Pick<PrismaClient, 'seccion' | 'periodo'>,
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
/** «Python 3.11», o «Python 3.11 (versión mínima)» si la sección no acepta cualquier versión. */
function etiquetaSoftwareRequerido(
  software: { nombre: string; version: string },
  comparacion: string | undefined,
): string {
  const base = formatearSoftware(software);
  if (comparacion === 'EXACTA') return `${base} (versión exacta)`;
  if (comparacion === 'MINIMA') return `${base} (versión mínima)`;
  return base;
}

const ORDEN_DIA: DiaSemana[] = [
  DiaSemana.LUNES,
  DiaSemana.MARTES,
  DiaSemana.MIERCOLES,
  DiaSemana.JUEVES,
  DiaSemana.VIERNES,
  DiaSemana.SABADO,
  DiaSemana.DOMINGO,
];

function ordenarFranjas<T extends FranjaSeccionInput>(franjas: T[]): T[] {
  return [...franjas].sort(
    (a, b) =>
      ORDEN_DIA.indexOf(a.diaSemana) - ORDEN_DIA.indexOf(b.diaSemana) ||
      a.horaInicio.localeCompare(b.horaInicio),
  );
}

function mismasFranjas(a: FranjaSeccionInput[], b: FranjaSeccionInput[]): boolean {
  const clave = (l: FranjaSeccionInput[]) => ordenarFranjas(l).map(textoFranja).join('|');
  return clave(a) === clave(b);
}

/**
 * Issue 4.62 (riesgo R36): avisa si el docente de la sección quedaría con dos clases a la vez
 * con otra de sus secciones del mismo periodo. Es un aviso, no un bloqueo: Coordinación decide.
 */
export async function choquesDeDocente(
  seccion: {
    id: string;
    periodo: string;
    docenteId: string | null;
    horarios: FranjaSeccionInput[];
  },
  prisma: Pick<PrismaClient, 'seccion'>,
): Promise<string[]> {
  if (!seccion.docenteId || seccion.horarios.length === 0) return [];

  const otras = await prisma.seccion.findMany({
    where: { docenteId: seccion.docenteId, periodo: seccion.periodo, id: { not: seccion.id } },
    include: { curso: true, horarios: true },
  });

  const avisos: string[] = [];
  for (const franja of ordenarFranjas(seccion.horarios)) {
    for (const otra of otras) {
      const choque = otra.horarios.find((h) => haySolapamientoHorario(franja, h));
      if (choque) {
        avisos.push(
          `El docente también dicta ${otra.curso.codigo}-${otra.codigoSeccion} el ${textoFranja(choque)}: ` +
            `se cruza con la franja ${textoFranja(franja)}`,
        );
      }
    }
  }
  return avisos;
}

/**
 * Issue 4.62: el horario se reemplaza entero por las franjas que llegan (agregar, cambiar y quitar
 * son la misma operación). Si no cambió nada, no se toca la base. Devuelve si cambió.
 */
async function reemplazarHorario(
  tx: Db,
  actual: { id: string; horarios: FranjaSeccionInput[] },
  franjas: FranjaSeccionInput[],
  campos: CamposAuditados,
): Promise<boolean> {
  const nuevas = ordenarFranjas(franjas);
  const cambiado = !mismasFranjas(actual.horarios, nuevas);
  if (cambiado) {
    await tx.horario.deleteMany({ where: { seccionId: actual.id } });
    if (nuevas.length > 0) {
      await tx.horario.createMany({
        data: nuevas.map((f) => ({ seccionId: actual.id, ...f })),
      });
    }
  }
  campos.horarios = {
    anterior: actual.horarios.map(textoFranja),
    nuevo: nuevas.map(textoFranja),
  };
  return cambiado;
}

const AVISO_CORRIDA_EN_CURSO =
  'El horario se guardó, pero no se pudo reasignar la sección porque hay una corrida de ' +
  'asignación en curso. Vuelve a asignarla cuando termine.';

/**
 * Issue 4.62: reasigna la sección con su horario nuevo. Si hay una corrida en curso no se
 * pierde el cambio de horario: se avisa para que Coordinación la reasigne después.
 */
async function reasignarTrasCambioDeHorario(
  seccionId: string,
  prisma: PrismaClient,
  advertencias: string[],
): Promise<ReasignacionSeccionDTO | null> {
  try {
    const resumen = await ejecutarAsignacionADemanda(seccionId, prisma);
    const r = resumen.resultados[0];
    if (!r) return null;
    return { estado: r.estado, motivoEscalamiento: r.motivoEscalamiento, conservada: r.conservada };
  } catch (error: unknown) {
    if (error instanceof HttpError && error.status === 409) {
      advertencias.push(AVISO_CORRIDA_EN_CURSO);
      return null;
    }
    throw error;
  }
}

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

  // Issue 4.64 (R50): un periodo cerrado solo admite consulta.
  await asegurarPeriodoEscribible(prisma, actual.periodo);

  const alertas: { id: string; tipo: string; motivo: string }[] = [];
  const advertencias: string[] = [];
  let horarioCambiado = false;

  await prisma.$transaction(async (tx) => {
    // Issue 4.58: lo que cambia se acumula aquí y se registra al final, junto con el cambio.
    const campos: CamposAuditados = {};

    if (entrada.docenteId !== undefined) {
      let nombreNuevo: string | null = null;
      if (entrada.docenteId !== null) {
        const docente = await tx.docente.findUnique({ where: { id: entrada.docenteId } });
        if (!docente) {
          throw new HttpError(404, 'El docente indicado no existe');
        }
        nombreNuevo = docente.nombre ?? null;
      }
      await tx.seccion.update({ where: { id: actual.id }, data: { docenteId: entrada.docenteId } });
      campos.docente = { anterior: actual.docente?.nombre ?? null, nuevo: nombreNuevo };
    }

    if (entrada.tipoEspacioRequerido !== undefined) {
      await tx.seccion.update({
        where: { id: actual.id },
        data: { tipoEspacioRequerido: entrada.tipoEspacioRequerido },
      });
      campos.tipoEspacioRequerido = {
        anterior: actual.tipoEspacioRequerido,
        nuevo: entrada.tipoEspacioRequerido,
      };
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

      campos.softwareRequerido = {
        anterior: actual.softwareRequerido.map((f) =>
          etiquetaSoftwareRequerido(f.software, f.comparacionVersion),
        ),
        nuevo: software.map((s) => etiquetaSoftwareRequerido(s, versiones.get(s.id))),
      };
    }

    if (entrada.horarios !== undefined) {
      horarioCambiado = await reemplazarHorario(tx, actual, entrada.horarios, campos);
    }

    await registrarAccionDePersona(tx, {
      tipoEvento: TipoEventoAuditoria.EDICION_SECCION,
      cuentaId: auth.sub,
      seccionId: actual.id,
      descripcion: `Sección ${actual.curso.codigo}-${actual.codigoSeccion} editada`,
      cambios: calcularCambios(campos),
    });
  });

  // Issue 4.62: con el horario nuevo, la sección se reasigna (el aula puede ya no servir).
  const reasignacion = horarioCambiado
    ? await reasignarTrasCambioDeHorario(actual.id, prisma, advertencias)
    : null;

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

  if (horarioCambiado || entrada.docenteId !== undefined) {
    advertencias.unshift(...(await choquesDeDocente(actualizada, prisma)));
  }

  return { seccion: aSeccionDTO(actualizada, auth.rol), alertas, advertencias, reasignacion };
}

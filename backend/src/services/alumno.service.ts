import { DiaSemana, Prisma, PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { HttpError } from '../lib/http';
import {
  agruparPorDia,
  construirSesiones,
  estadoDeSeccion,
  INCLUIR_SECCION_CON_ASIGNACION,
  mapearEspacios,
  proximaSesion,
} from '../lib/horario';
import {
  CursoMatriculadoDTO,
  EstadoTelegramDTO,
  HorarioSemanalDTO,
  PerfilAlumnoDTO,
} from '../types/portal';
import { obtenerPeriodoVigente } from './periodo.service';
import { construirGrafoContiguedad } from './contiguedad.service';
import { calcularRutaReferencia } from './rutaReferencia.service';
import {
  desvincularPorAlumno,
  EstadoVinculacionAlumno,
  obtenerVinculacionDeAlumno,
} from '../telegram/vinculacion.service';

/**
 * Resuelve el alumno dueño de la cuenta del token. Todas las consultas del portal parten de
 * aquí: el id sale del JWT, nunca de un parámetro de la petición, así que un alumno solo puede
 * llegar a sus propios datos.
 */
async function obtenerAlumnoDeCuenta(cuentaId: string, prisma: Pick<PrismaClient, 'alumno'>) {
  const alumno = await prisma.alumno.findUnique({ where: { cuentaId } });
  if (!alumno) {
    throw new HttpError(404, 'No hay un alumno asociado a esta cuenta');
  }
  return alumno;
}

async function cargarSeccionesMatriculadas(
  alumnoId: string,
  periodo: string,
  prisma: Pick<PrismaClient, 'matricula'>,
) {
  const matriculas = await prisma.matricula.findMany({
    where: { alumnoId, seccion: { periodo } },
    include: { seccion: { include: INCLUIR_SECCION_CON_ASIGNACION } },
  });
  return matriculas.map((m) => m.seccion);
}

/**
 * Issue 3.10: horario semanal completo del alumno autenticado, agrupado por día.
 * Con `dia` devuelve solo ese día (vista por día); sin él, la semana completa.
 */
export async function obtenerHorarioAlumno(
  cuentaId: string,
  dia: DiaSemana | undefined,
  prisma: PrismaClient,
): Promise<HorarioSemanalDTO> {
  const alumno = await obtenerAlumnoDeCuenta(cuentaId, prisma);
  const periodo = await obtenerPeriodoVigente(prisma);

  const secciones = periodo ? await cargarSeccionesMatriculadas(alumno.id, periodo, prisma) : [];
  const sesiones = construirSesiones(secciones);

  return {
    periodo,
    vista: dia ? 'dia' : 'semana',
    dias: agruparPorDia(sesiones, dia),
  };
}

/**
 * Issue 3.11: cursos matriculados del alumno en el periodo vigente, con docente, horario y el
 * espacio de la siguiente sesión a partir de `ahora`.
 */
export async function listarCursosAlumno(
  cuentaId: string,
  prisma: PrismaClient,
  ahora: Date = new Date(),
): Promise<{ periodo: string | null; cursos: CursoMatriculadoDTO[] }> {
  const alumno = await obtenerAlumnoDeCuenta(cuentaId, prisma);
  const periodo = await obtenerPeriodoVigente(prisma);

  if (!periodo) {
    return { periodo, cursos: [] };
  }

  const secciones = await cargarSeccionesMatriculadas(alumno.id, periodo, prisma);

  const cursos = secciones
    .map((seccion): CursoMatriculadoDTO => {
      const horarios = seccion.horarios.map((h) => ({
        diaSemana: h.diaSemana,
        horaInicio: h.horaInicio,
        horaFin: h.horaFin,
      }));
      const espacios = mapearEspacios(seccion);
      const proxima = proximaSesion(horarios, ahora);

      return {
        codigoCurso: seccion.curso.codigo,
        nombreCurso: seccion.curso.nombre,
        codigoSeccion: seccion.codigoSeccion,
        periodo: seccion.periodo,
        docenteNombre: seccion.docente ? seccion.docente.nombre : null,
        horarios,
        estadoAsignacion: estadoDeSeccion(seccion),
        espacios,
        proximaSesion: proxima ? { ...proxima, espacios } : null,
      };
    })
    .sort((a, b) => a.codigoCurso.localeCompare(b.codigoCurso));

  return { periodo, cursos };
}

// ---------------------------------------------------------------------------
// Issue 3.12 — Datos personales y ficha médica (datos sensibles, Ley 29733)
// ---------------------------------------------------------------------------

const TIPOS_SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

const textoOpcional = (max: number) => z.string().trim().max(max).nullable().optional();

export const ActualizarPerfilSchema = z
  .object({
    datosPersonales: z
      .object({
        dni: z
          .string()
          .trim()
          .regex(/^\d{8}$/, 'El DNI debe tener 8 dígitos')
          .nullable()
          .optional(),
        fechaNacimiento: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha de nacimiento debe tener formato AAAA-MM-DD')
          .refine((v) => {
            const fecha = new Date(`${v}T00:00:00.000Z`);
            return (
              !Number.isNaN(fecha.getTime()) &&
              fecha.toISOString().startsWith(v) &&
              fecha.getUTCFullYear() >= 1900 &&
              fecha.getTime() <= Date.now()
            );
          }, 'La fecha de nacimiento no es válida')
          .nullable()
          .optional(),
        telefono: z
          .string()
          .trim()
          .regex(/^\+?\d{7,15}$/, 'El teléfono debe tener entre 7 y 15 dígitos')
          .nullable()
          .optional(),
        direccion: textoOpcional(200),
      })
      .strict()
      .optional(),
    fichaMedica: z
      .object({
        tipoSangre: z
          .enum(TIPOS_SANGRE, { error: 'Tipo de sangre no válido' })
          .nullable()
          .optional(),
        alergias: textoOpcional(500),
        condicionEspecial: textoOpcional(500),
        contactoEmergencia: textoOpcional(200),
        /**
         * Declaración propia del alumno: tiene una condición que le impide subir a pisos
         * superiores o usar escaleras. Es un requisito de acceso al espacio, no un
         * diagnóstico: el campo de texto libre sigue siendo el lugar de la información clínica.
         */
        condicionAccesible: z
          .boolean({ error: 'condicionAccesible debe ser verdadero o falso' })
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type ActualizarPerfilInput = z.infer<typeof ActualizarPerfilSchema>;

function armarPerfil(
  alumno: {
    codigo: string;
    nombre: string;
    correo: string;
    dni: string | null;
    fechaNacimiento: Date | null;
    telefono: string | null;
    direccion: string | null;
  },
  ficha: {
    tipoSangre: string | null;
    alergias: string | null;
    condicionEspecial: string | null;
    contactoEmergencia: string | null;
    condicionAccesible: boolean;
  } | null,
): PerfilAlumnoDTO {
  return {
    alumno: {
      codigo: alumno.codigo,
      nombre: alumno.nombre,
      correo: alumno.correo,
      dni: alumno.dni,
      fechaNacimiento: alumno.fechaNacimiento
        ? alumno.fechaNacimiento.toISOString().slice(0, 10)
        : null,
      telefono: alumno.telefono,
      direccion: alumno.direccion,
    },
    fichaMedica: ficha
      ? {
          tipoSangre: ficha.tipoSangre,
          alergias: ficha.alergias,
          condicionEspecial: ficha.condicionEspecial,
          contactoEmergencia: ficha.contactoEmergencia,
          condicionAccesible: ficha.condicionAccesible,
        }
      : null,
  };
}

/** Lectura del perfil del propio alumno (el id sale del token, no de la URL). */
export async function obtenerPerfilAlumno(
  cuentaId: string,
  prisma: PrismaClient,
): Promise<PerfilAlumnoDTO> {
  const alumno = await prisma.alumno.findUnique({
    where: { cuentaId },
    include: { fichaMedica: true },
  });
  if (!alumno) {
    throw new HttpError(404, 'No hay un alumno asociado a esta cuenta');
  }
  return armarPerfil(alumno, alumno.fichaMedica);
}

/**
 * Edición del perfil del propio alumno. Solo se pueden modificar los campos del esquema
 * (DNI, fecha de nacimiento, teléfono, dirección y ficha médica); `strict()` rechaza el resto.
 * Un `null` borra el dato; un campo ausente no se toca.
 */
export async function actualizarPerfilAlumno(
  cuentaId: string,
  entrada: ActualizarPerfilInput,
  prisma: PrismaClient,
): Promise<PerfilAlumnoDTO> {
  const alumno = await obtenerAlumnoDeCuenta(cuentaId, prisma);
  const { datosPersonales, fichaMedica } = entrada;

  return prisma.$transaction(async (tx) => {
    const alumnoActualizado = datosPersonales
      ? await tx.alumno.update({
          where: { id: alumno.id },
          data: {
            ...(datosPersonales.dni !== undefined && { dni: datosPersonales.dni }),
            ...(datosPersonales.telefono !== undefined && { telefono: datosPersonales.telefono }),
            ...(datosPersonales.direccion !== undefined && {
              direccion: datosPersonales.direccion,
            }),
            ...(datosPersonales.fechaNacimiento !== undefined && {
              fechaNacimiento: datosPersonales.fechaNacimiento
                ? new Date(`${datosPersonales.fechaNacimiento}T00:00:00.000Z`)
                : null,
            }),
          },
        })
      : alumno;

    // La ficha anterior se lee antes del `upsert`: sirve para saber si el flag de las
    // matrículas lo puso esta declaración o una carga de datos de Coordinación.
    const fichaPrevia = await tx.fichaMedica.findUnique({ where: { alumnoId: alumno.id } });

    const ficha = fichaMedica
      ? await tx.fichaMedica.upsert({
          where: { alumnoId: alumno.id },
          create: { alumnoId: alumno.id, ...fichaMedica },
          update: fichaMedica,
        })
      : fichaPrevia;

    await propagarCondicionAccesible(alumno.id, fichaMedica?.condicionAccesible, fichaPrevia, tx);

    return armarPerfil(alumnoActualizado, ficha);
  });
}

/**
 * Traduce la declaración de accesibilidad de la ficha al flag que consume el motor
 * (`Matricula.movilidadReducida`).
 *
 * - Declarar `true` marca todas las matrículas del alumno: el motor prioriza el Piso 1.
 * - Declarar `false` solo limpia el flag si la declaración anterior estaba activa; si el flag
 *   venía de una carga de datos de Coordinación, se respeta y no se toca.
 *
 * Así el alumno puede corregir su declaración sin perder un dato que otro puso, y a la vez
 * su declaración manda mientras está activa.
 */
async function propagarCondicionAccesible(
  alumnoId: string,
  declarado: boolean | undefined,
  fichaPrevia: { condicionAccesible: boolean } | null,
  tx: Prisma.TransactionClient,
): Promise<void> {
  if (declarado === undefined) return;

  if (declarado) {
    await tx.matricula.updateMany({
      where: { alumnoId },
      data: { movilidadReducida: true },
    });
    return;
  }

  if (fichaPrevia?.condicionAccesible) {
    await tx.matricula.updateMany({
      where: { alumnoId },
      data: { movilidadReducida: false },
    });
  }
}

/**
 * Issue 3.14 / 3.15: Obtiene la ruta de referencia hacia el espacio asignado de una asignación.
 * Verifica que la asignación pertenezca a una sección donde el alumno autenticado esté matriculado,
 * o que sea una asignación activa del periodo si se consulta directamente.
 */
export async function obtenerRutaAlumnoPorAsignacionId(
  cuentaId: string,
  asignacionId: string,
  prisma: PrismaClient,
) {
  const alumno = await obtenerAlumnoDeCuenta(cuentaId, prisma);

  // Buscar la asignación con sus espacios y sección
  const asignacion = await prisma.asignacion.findUnique({
    where: { id: asignacionId },
    include: {
      seccion: {
        include: {
          matriculas: {
            where: { alumnoId: alumno.id },
          },
        },
      },
      espacios: {
        include: {
          espacio: true,
        },
      },
    },
  });

  if (!asignacion) {
    throw new HttpError(404, 'La asignación solicitada no existe');
  }

  // Verificar que el alumno esté matriculado en la sección asignada
  const matricula = asignacion.seccion.matriculas[0];
  if (!matricula) {
    throw new HttpError(
      403,
      'No tienes permiso para ver la ruta de una sección en la que no estás matriculado',
    );
  }

  const movilidadReducida = matricula.movilidadReducida;

  // Construir grafo de contigüidad si existen relaciones de contigüidad
  const [espaciosDb, contiguosDb] = await Promise.all([
    prisma.espacio.findMany({ select: { id: true, tipo: true, identificador: true } }),
    prisma.espacioContiguo.findMany({ select: { espacioIdA: true, espacioIdB: true } }),
  ]);

  const grafo = construirGrafoContiguedad(
    espaciosDb || [],
    (contiguosDb || []).map((c) => ({ idA: c.espacioIdA, idB: c.espacioIdB })),
  );

  const espaciosParaRuta = asignacion.espacios.map((ae) => ({
    id: ae.espacio.id,
    identificador: ae.espacio.identificador,
    pabellon: ae.espacio.pabellon,
    piso: ae.espacio.piso,
    tipo: ae.espacio.tipo,
  }));

  return calcularRutaReferencia({
    asignacionId: asignacion.id,
    espacios: espaciosParaRuta,
    grafoContiguedad: grafo,
    movilidadReducida,
  });
}

// ---------------------------------------------------------------------------
// Issue 3.28 — Vinculación de Telegram en el perfil del alumno
// ---------------------------------------------------------------------------

function armarEstadoTelegram(vinculacion: EstadoVinculacionAlumno | null): EstadoTelegramDTO {
  return {
    vinculado: Boolean(vinculacion?.activo),
    fechaVinculacion: vinculacion?.fechaVinculacion?.toISOString() ?? null,
    fechaBaja: vinculacion?.fechaBaja?.toISOString() ?? null,
    botUsername: process.env.TELEGRAM_BOT_USERNAME ?? null,
  };
}

/**
 * Issue 3.28: estado de la vinculación con el bot de Telegram del propio alumno. El alumno sale
 * del token de la sesión, así que nadie puede consultar la vinculación de otro.
 */
export async function obtenerEstadoTelegramAlumno(
  cuentaId: string,
  prisma: PrismaClient,
): Promise<EstadoTelegramDTO> {
  const alumno = await obtenerAlumnoDeCuenta(cuentaId, prisma);
  return armarEstadoTelegram(await obtenerVinculacionDeAlumno(alumno.id, prisma));
}

/**
 * Issue 3.28: baja de la vinculación de Telegram del propio alumno. Idempotente: si no había una
 * vinculación activa, responde igual con el estado ya desvinculado.
 */
export async function darDeBajaTelegramAlumno(
  cuentaId: string,
  prisma: PrismaClient,
): Promise<EstadoTelegramDTO> {
  const alumno = await obtenerAlumnoDeCuenta(cuentaId, prisma);
  await desvincularPorAlumno(alumno.id, prisma);
  return armarEstadoTelegram(await obtenerVinculacionDeAlumno(alumno.id, prisma));
}

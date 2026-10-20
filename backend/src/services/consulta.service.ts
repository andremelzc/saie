import { EstadoAsignacion, PrismaClient } from '@prisma/client';
import { marcarAccesibilidad } from '../lib/accesibilidad';
import { minutosHastaProximaSesion } from '../lib/horario';
import {
  AsignacionConsultaItemDTO,
  ConsultaAlumnoResponseDTO,
  ConsultaCursoResponseDTO,
  EspacioAsignadoDTO,
  HorarioConsultaDTO,
  SeccionCursoConsultaDTO,
} from '../types/consulta';

/**
 * Ordena por cercanía temporal: primero la clase que se está dictando ahora mismo, después la
 * que empieza más tarde hoy, luego mañana, pasado mañana y así hasta completar la semana. Las
 * secciones sin horario quedan al final porque no se les puede situar en el tiempo.
 */
function ordenarPorProximidad<T extends { horarios: HorarioConsultaDTO[] }>(
  items: T[],
  ahora: Date,
  desempate: (a: T, b: T) => number,
): T[] {
  return [...items].sort((a, b) => {
    const esperaA = minutosHastaProximaSesion(a.horarios, ahora);
    const esperaB = minutosHastaProximaSesion(b.horarios, ahora);
    if (esperaA !== esperaB) return esperaA - esperaB;
    return desempate(a, b);
  });
}

interface SeccionConAsignacion {
  horarios: { diaSemana: HorarioConsultaDTO['diaSemana']; horaInicio: string; horaFin: string }[];
  asignaciones: {
    estado: EstadoAsignacion;
    motivoEscalamiento: string | null;
    espacios: {
      espacio: {
        id: string;
        identificador: string;
        tipo: EspacioAsignadoDTO['tipo'];
        pabellon: string;
        piso: number;
        distanciaAscensor: number | null;
      };
    }[];
  }[];
}

/**
 * Campos del DTO que comparten la consulta por alumno y la consulta por curso: horarios, espacios
 * de la asignación vigente, estado y motivo de escalamiento. Se calculan en un solo lugar para que
 * ambas vistas muestren exactamente la misma información.
 */
function resumirSeccion(seccion: SeccionConAsignacion) {
  const asignacion = seccion.asignaciones[0];

  const horarios: HorarioConsultaDTO[] = seccion.horarios.map((h) => ({
    diaSemana: h.diaSemana,
    horaInicio: h.horaInicio,
    horaFin: h.horaFin,
  }));

  const espacios: EspacioAsignadoDTO[] = (asignacion?.espacios ?? []).map(({ espacio }) => ({
    id: espacio.id,
    identificador: espacio.identificador,
    tipo: espacio.tipo,
    pabellon: espacio.pabellon,
    piso: espacio.piso,
    ...marcarAccesibilidad({
      piso: espacio.piso,
      distanciaAscensor: espacio.distanciaAscensor,
    }),
  }));

  return {
    horarios,
    espacios,
    estadoAsignacion: (asignacion?.estado as 'VIGENTE' | 'ESCALADA') ?? 'PENDIENTE',
    motivoEscalamiento: asignacion?.motivoEscalamiento ?? null,
  };
}

export async function obtenerAsignacionPorAlumno(
  codigoAlumno: string,
  prisma: PrismaClient,
  ahora: Date = new Date(),
): Promise<ConsultaAlumnoResponseDTO | null> {
  // 1. Buscar alumno con sus matrículas, ficha médica, secciones, horarios y asignaciones
  const alumno = await prisma.alumno.findUnique({
    where: { codigo: codigoAlumno },
    include: {
      fichaMedica: true,
      matriculas: {
        include: {
          seccion: {
            include: {
              curso: true,
              docente: true,
              horarios: true,
              asignaciones: {
                where: {
                  estado: {
                    in: [EstadoAsignacion.VIGENTE, EstadoAsignacion.ESCALADA],
                  },
                },
                orderBy: { fechaAsignacion: 'desc' },
                take: 1,
                include: {
                  espacios: {
                    include: {
                      espacio: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!alumno) {
    return null;
  }

  const asignacionesItems: AsignacionConsultaItemDTO[] = alumno.matriculas.map((mat) => {
    const seccion = mat.seccion;
    const asignacionVigente = seccion.asignaciones[0];

    return {
      asignacionId: asignacionVigente?.id,
      codigoCurso: seccion.curso.codigo,
      nombreCurso: seccion.curso.nombre,
      codigoSeccion: seccion.codigoSeccion,
      periodo: seccion.periodo,
      docenteNombre: seccion.docente ? seccion.docente.nombre : null,
      ...resumirSeccion(seccion),
    };
  });

  return {
    alumno: {
      codigo: alumno.codigo,
      nombre: alumno.nombre,
      correo: alumno.correo,
      movilidadReducida: alumno.matriculas.some((m) => m.movilidadReducida),
    },
    asignaciones: ordenarPorProximidad(
      asignacionesItems,
      ahora,
      (a, b) =>
        a.codigoCurso.localeCompare(b.codigoCurso) ||
        a.codigoSeccion.localeCompare(b.codigoSeccion),
    ),
  };
}

export async function obtenerAsignacionPorCurso(
  codigoCurso: string,
  prisma: PrismaClient,
  ahora: Date = new Date(),
): Promise<ConsultaCursoResponseDTO | null> {
  // Buscar el curso con todas sus secciones
  const curso = await prisma.curso.findUnique({
    where: { codigo: codigoCurso },
    include: {
      secciones: {
        include: {
          docente: true,
          horarios: true,
          asignaciones: {
            where: {
              estado: {
                in: [EstadoAsignacion.VIGENTE, EstadoAsignacion.ESCALADA],
              },
            },
            orderBy: { fechaAsignacion: 'desc' },
            take: 1,
            include: {
              espacios: {
                include: {
                  espacio: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!curso) {
    return null;
  }

  const seccionesDTO: SeccionCursoConsultaDTO[] = curso.secciones.map((seccion) => ({
    seccionId: seccion.id,
    codigoSeccion: seccion.codigoSeccion,
    periodo: seccion.periodo,
    docenteNombre: seccion.docente ? seccion.docente.nombre : null,
    ...resumirSeccion(seccion),
  }));

  return {
    curso: {
      codigo: curso.codigo,
      nombre: curso.nombre,
    },
    secciones: ordenarPorProximidad(seccionesDTO, ahora, (a, b) =>
      a.codigoSeccion.localeCompare(b.codigoSeccion),
    ),
  };
}

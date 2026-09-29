import { EstadoAsignacion, PrismaClient } from '@prisma/client';
import {
  AsignacionConsultaItemDTO,
  ConsultaAlumnoResponseDTO,
  ConsultaCursoResponseDTO,
  EspacioAsignadoDTO,
  HorarioConsultaDTO,
  SeccionCursoConsultaDTO,
} from '../types/consulta';

export async function obtenerAsignacionPorAlumno(
  codigoAlumno: string,
  prisma: PrismaClient
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

    const horariosDTO: HorarioConsultaDTO[] = seccion.horarios.map((h) => ({
      diaSemana: h.diaSemana,
      horaInicio: h.horaInicio,
      horaFin: h.horaFin,
    }));

    let espaciosDTO: EspacioAsignadoDTO[] = [];
    let estado: 'VIGENTE' | 'ESCALADA' | 'PENDIENTE' = 'PENDIENTE';
    let motivoEscalamiento: string | null = null;
    let asignacionId: string | undefined = undefined;

    if (asignacionVigente) {
      asignacionId = asignacionVigente.id;
      estado = asignacionVigente.estado as 'VIGENTE' | 'ESCALADA';
      motivoEscalamiento = asignacionVigente.motivoEscalamiento;
      espaciosDTO = asignacionVigente.espacios.map((e) => ({
        id: e.espacio.id,
        identificador: e.espacio.identificador,
        tipo: e.espacio.tipo,
        pabellon: e.espacio.pabellon,
        piso: e.espacio.piso,
      }));
    }

    return {
      asignacionId,
      codigoCurso: seccion.curso.codigo,
      nombreCurso: seccion.curso.nombre,
      codigoSeccion: seccion.codigoSeccion,
      periodo: seccion.periodo,
      docenteNombre: seccion.docente ? seccion.docente.nombre : null,
      horarios: horariosDTO,
      espacios: espaciosDTO,
      estadoAsignacion: estado,
      motivoEscalamiento,
    };
  });

  return {
    alumno: {
      codigo: alumno.codigo,
      nombre: alumno.nombre,
      correo: alumno.correo,
      movilidadReducida: alumno.matriculas.some((m) => m.movilidadReducida),
    },
    asignaciones: asignacionesItems,
  };
}

export async function obtenerAsignacionPorCurso(
  codigoCurso: string,
  prisma: PrismaClient
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

  const seccionesDTO: SeccionCursoConsultaDTO[] = curso.secciones.map((seccion) => {
    const asignacionVigente = seccion.asignaciones[0];

    const horariosDTO: HorarioConsultaDTO[] = seccion.horarios.map((h) => ({
      diaSemana: h.diaSemana,
      horaInicio: h.horaInicio,
      horaFin: h.horaFin,
    }));

    let espaciosDTO: EspacioAsignadoDTO[] = [];
    let estado: 'VIGENTE' | 'ESCALADA' | 'PENDIENTE' = 'PENDIENTE';
    let motivoEscalamiento: string | null = null;

    if (asignacionVigente) {
      estado = asignacionVigente.estado as 'VIGENTE' | 'ESCALADA';
      motivoEscalamiento = asignacionVigente.motivoEscalamiento;
      espaciosDTO = asignacionVigente.espacios.map((e) => ({
        id: e.espacio.id,
        identificador: e.espacio.identificador,
        tipo: e.espacio.tipo,
        pabellon: e.espacio.pabellon,
        piso: e.espacio.piso,
      }));
    }

    return {
      seccionId: seccion.id,
      codigoSeccion: seccion.codigoSeccion,
      periodo: seccion.periodo,
      docenteNombre: seccion.docente ? seccion.docente.nombre : null,
      horarios: horariosDTO,
      espacios: espaciosDTO,
      estadoAsignacion: estado,
      motivoEscalamiento,
    };
  });

  return {
    curso: {
      codigo: curso.codigo,
      nombre: curso.nombre,
    },
    secciones: seccionesDTO,
  };
}

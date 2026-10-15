import { EstadoAlerta, EstadoAsignacion, PrismaClient } from '@prisma/client';
import { diaYMinutosEnLima, formatearHora } from '../lib/horario';
import { calcularCapacidadReal } from '../rules/calcularCapacidadReal';
import {
  EspacioOcupacionDTO,
  FranjaOcupacionDTO,
  MapaOcupacionDTO,
  MapaOcupacionLecturaDTO,
} from '../types/ocupacion';
import { haySolapamientoHorario } from './disponibilidad.service';

export interface FiltrosOcupacion {
  pabellon: string;
  piso: number;
  /** Franja a consultar; por defecto, el momento actual (hora de Lima). */
  franja?: FranjaOcupacionDTO;
}

type DbOcupacion = Pick<PrismaClient, 'espacio' | 'asignacion' | 'alerta'>;

function franjaActual(ahora: Date): FranjaOcupacionDTO {
  const { dia, minutos } = diaYMinutosEnLima(ahora);
  return {
    diaSemana: dia,
    horaInicio: formatearHora(minutos),
    horaFin: formatearHora(minutos + 1),
  };
}

/**
 * Issue 4.11: estado de ocupación de cada espacio de un piso en una franja.
 *
 * - ALERTA_ACTIVA: el espacio tiene una alerta PENDIENTE (prevalece sobre el resto).
 * - OCUPADO: hay una asignación VIGENTE cuyo horario solapa con la franja.
 * - DISPONIBLE: ninguna de las anteriores.
 *
 * Solo las asignaciones VIGENTES reservan espacio (igual que `calcularEspaciosDisponibles`).
 * Hace consultas acotadas a los espacios del piso, sin importar cuántos haya en el campus.
 */
export async function obtenerOcupacionPorPiso(
  filtros: FiltrosOcupacion,
  prisma: DbOcupacion,
  ahora: Date = new Date(),
): Promise<MapaOcupacionDTO> {
  const franja = filtros.franja ?? franjaActual(ahora);

  const espacios = await prisma.espacio.findMany({
    where: { pabellon: { equals: filtros.pabellon, mode: 'insensitive' }, piso: filtros.piso },
    orderBy: { identificador: 'asc' },
  });
  const ids = espacios.map((e) => e.id);

  const [asignaciones, alertas] =
    ids.length === 0
      ? [[], []]
      : await Promise.all([
          prisma.asignacion.findMany({
            where: {
              estado: EstadoAsignacion.VIGENTE,
              espacios: { some: { espacioId: { in: ids } } },
            },
            include: {
              espacios: true,
              seccion: {
                include: {
                  curso: true,
                  docente: true,
                  horarios: true,
                  _count: { select: { matriculas: true } },
                },
              },
            },
          }),
          prisma.alerta.findMany({
            where: { estado: EstadoAlerta.PENDIENTE, espacioId: { in: ids } },
            orderBy: { fechaDeteccion: 'desc' },
          }),
        ]);

  const resultado: EspacioOcupacionDTO[] = espacios.map((espacio) => {
    let ocupacion: EspacioOcupacionDTO['asignacion'] = null;

    for (const a of asignaciones) {
      if (!a.espacios.some((ae) => ae.espacioId === espacio.id)) continue;
      const bloque = a.seccion.horarios.find((h) => haySolapamientoHorario(h, franja));
      if (!bloque) continue;
      ocupacion = {
        asignacionId: a.id,
        codigoCurso: a.seccion.curso.codigo,
        nombreCurso: a.seccion.curso.nombre,
        codigoSeccion: a.seccion.codigoSeccion,
        docenteNombre: a.seccion.docente?.nombre ?? null,
        alumnosMatriculados: a.seccion._count.matriculas,
        horaInicio: bloque.horaInicio,
        horaFin: bloque.horaFin,
      };
      break;
    }

    const alertasEspacio = alertas
      .filter((al) => al.espacioId === espacio.id)
      .map((al) => ({ id: al.id, tipo: al.tipo, motivo: al.motivo }));

    return {
      id: espacio.id,
      identificador: espacio.identificador,
      tipo: espacio.tipo,
      aforoNominal: espacio.aforoNominal,
      capacidadReal: calcularCapacidadReal(espacio),
      estado: espacio.habilitado === false
        ? 'DESHABILITADO'
        : alertasEspacio.length > 0
          ? 'ALERTA_ACTIVA'
          : ocupacion
            ? 'OCUPADO'
            : 'DISPONIBLE',
      descripcionUso: espacio.descripcionUso,
      asignacion: ocupacion,
      alertas: alertasEspacio,
    };
  });

  return {
    pabellon: filtros.pabellon,
    piso: filtros.piso,
    franja,
    espacios: resultado,
    resumen: {
      disponibles: resultado.filter((e) => e.estado === 'DISPONIBLE').length,
      ocupados: resultado.filter((e) => e.estado === 'OCUPADO').length,
      conAlerta: resultado.filter((e) => e.estado === 'ALERTA_ACTIVA').length,
      deshabilitados: resultado.filter((e) => e.estado === 'DESHABILITADO').length,
    },
  };
}

/**
 * Issue 3.13: mapa de solo lectura para el alumno. Reutiliza `obtenerOcupacionPorPiso` pero no
 * expone alertas, docentes ni cursos: un espacio con alerta se muestra según su asignación.
 */
export async function obtenerMapaLectura(
  filtros: FiltrosOcupacion,
  prisma: DbOcupacion,
  ahora: Date = new Date(),
): Promise<MapaOcupacionLecturaDTO> {
  const mapa = await obtenerOcupacionPorPiso(filtros, prisma, ahora);
  return {
    pabellon: mapa.pabellon,
    piso: mapa.piso,
    franja: mapa.franja,
    // El alumno no ve los espacios fuera de servicio: no se le puede asignar ni consultar uno.
    espacios: mapa.espacios
      .filter((e) => e.estado !== 'DESHABILITADO')
      .map((e) => ({
        id: e.id,
        identificador: e.identificador,
        tipo: e.tipo,
        estado: e.asignacion ? ('OCUPADO' as const) : ('DISPONIBLE' as const),
      })),
  };
}

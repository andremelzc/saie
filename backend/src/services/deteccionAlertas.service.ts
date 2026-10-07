import { EstadoAsignacion, Prisma, TipoEspacio } from '@prisma/client';
import { calcularCapacidadReal } from '../rules/calcularCapacidadReal';
import { BloqueCandidato } from '../rules/buscarBloqueContiguo';
import { validarSoftwareBloque } from '../rules/validarSoftware';
import { AsignacionAfectadaDTO, CambioCapacidad } from '../types/alertas';

type Db = Prisma.TransactionClient;

interface EspacioDeAsignacion {
  id: string;
  identificador: string;
  tipo: TipoEspacio;
  pabellon: string;
  piso: number;
  aforoNominal: number;
  pcsMalogradas: number | null;
  softwareInstalado: string[];
}

/** Asignación vigente con los datos mínimos que necesitan las dos detecciones. */
export interface AsignacionVigenteConEspacios {
  id: string;
  seccionId: string;
  codigoSeccion: string;
  codigoCurso: string;
  nombreCurso: string;
  stackSoftwareRequerido: string[];
  alumnosMatriculados: number;
  espacios: EspacioDeAsignacion[];
}

/**
 * Carga las asignaciones VIGENTES (ignora ESCALADA e HISTORICA) que usan el espacio dado,
 * con todos los espacios de su bloque y el número de alumnos matriculados.
 */
export async function cargarAsignacionesVigentesDeEspacio(
  espacioId: string,
  db: Db,
): Promise<AsignacionVigenteConEspacios[]> {
  const asignaciones = await db.asignacion.findMany({
    where: {
      estado: EstadoAsignacion.VIGENTE,
      espacios: { some: { espacioId } },
    },
    include: {
      seccion: {
        include: {
          curso: true,
          _count: { select: { matriculas: true } },
        },
      },
      espacios: { include: { espacio: true } },
    },
  });

  return asignaciones.map((a) => ({
    id: a.id,
    seccionId: a.seccionId,
    codigoSeccion: a.seccion.codigoSeccion,
    codigoCurso: a.seccion.curso.codigo,
    nombreCurso: a.seccion.curso.nombre,
    stackSoftwareRequerido: a.seccion.stackSoftwareRequerido,
    alumnosMatriculados: a.seccion._count.matriculas,
    espacios: a.espacios.map((ae) => ({
      id: ae.espacio.id,
      identificador: ae.espacio.identificador,
      tipo: ae.espacio.tipo,
      pabellon: ae.espacio.pabellon,
      piso: ae.espacio.piso,
      aforoNominal: ae.espacio.aforoNominal,
      pcsMalogradas: ae.espacio.pcsMalogradas,
      softwareInstalado: ae.espacio.softwareInstalado,
    })),
  }));
}

/**
 * Issue 4.3 (parte pura): decide qué asignaciones quedaron incompatibles en software.
 *
 * Reutiliza `validarSoftwareBloque` (Issue 2.7) sobre el bloque de cada asignación, con el
 * software del laboratorio modificado ya reemplazado por el nuevo estado. Una asignación solo
 * se considera afectada si el faltante está en el laboratorio que cambió: así, en un bloque
 * de varios laboratorios, no se alerta por un laboratorio que no se tocó.
 */
export function detectarIncompatibilidadesSoftware(
  laboratorioId: string,
  nuevoSoftware: string[],
  asignaciones: AsignacionVigenteConEspacios[],
): AsignacionAfectadaDTO[] {
  const afectadas: AsignacionAfectadaDTO[] = [];

  for (const asignacion of asignaciones) {
    if (!asignacion.espacios.some((e) => e.id === laboratorioId)) {
      continue;
    }

    const espacios = asignacion.espacios.map((e) => ({
      ...e,
      softwareInstalado: e.id === laboratorioId ? nuevoSoftware : e.softwareInstalado,
    }));

    const bloque: BloqueCandidato = {
      espacios,
      espacioIds: espacios.map((e) => e.id),
      capacidadTotal: espacios.reduce((suma, e) => suma + calcularCapacidadReal(e), 0),
      desperdicio: 0,
      piso: espacios[0].piso,
      pabellon: espacios[0].pabellon,
      tipo: espacios[0].tipo,
    };

    const resultado = validarSoftwareBloque(bloque, asignacion.stackSoftwareRequerido);
    const falloEnLab = resultado.detalles.find((d) => d.laboratorioId === laboratorioId);

    if (!resultado.cumple && falloEnLab) {
      afectadas.push({
        asignacionId: asignacion.id,
        seccionId: asignacion.seccionId,
        codigoCurso: asignacion.codigoCurso,
        nombreCurso: asignacion.nombreCurso,
        codigoSeccion: asignacion.codigoSeccion,
        detalle: `${falloEnLab.identificador} no tiene instalado: ${falloEnLab.softwareFaltante.join(', ')}`,
      });
    }
  }

  return afectadas;
}

/**
 * Issue 4.3: dado el nuevo estado de software de un laboratorio, devuelve las asignaciones
 * vigentes que quedaron incompatibles. No persiste nada (eso es el Issue 4.5).
 */
export async function evaluarIncompatibilidadSoftware(
  laboratorioId: string,
  nuevoSoftware: string[],
  db: Db,
): Promise<AsignacionAfectadaDTO[]> {
  const asignaciones = await cargarAsignacionesVigentesDeEspacio(laboratorioId, db);
  return detectarIncompatibilidadesSoftware(laboratorioId, nuevoSoftware, asignaciones);
}

/**
 * Issue 4.4 (parte pura): decide qué asignaciones quedaron con capacidad insuficiente.
 *
 * Recalcula la capacidad real del espacio modificado con `calcularCapacidadReal` (Issue 2.1),
 * suma la de todo el bloque y la compara con los alumnos matriculados. Si el cambio sube la
 * capacidad (p. ej. PCs reparadas) o la suma del bloque sigue alcanzando, no hay alerta.
 */
export function detectarCapacidadInsuficiente(
  espacioId: string,
  cambio: CambioCapacidad,
  asignaciones: AsignacionVigenteConEspacios[],
): AsignacionAfectadaDTO[] {
  const afectadas: AsignacionAfectadaDTO[] = [];

  for (const asignacion of asignaciones) {
    if (!asignacion.espacios.some((e) => e.id === espacioId)) {
      continue;
    }

    const capacidadBloque = asignacion.espacios.reduce((suma, e) => {
      if (e.id !== espacioId) {
        return suma + calcularCapacidadReal(e);
      }
      return (
        suma +
        calcularCapacidadReal({
          ...e,
          aforoNominal: cambio.aforoNominal ?? e.aforoNominal,
          pcsMalogradas:
            cambio.pcsMalogradas !== undefined ? cambio.pcsMalogradas : e.pcsMalogradas,
        })
      );
    }, 0);

    if (capacidadBloque < asignacion.alumnosMatriculados) {
      afectadas.push({
        asignacionId: asignacion.id,
        seccionId: asignacion.seccionId,
        codigoCurso: asignacion.codigoCurso,
        nombreCurso: asignacion.nombreCurso,
        codigoSeccion: asignacion.codigoSeccion,
        detalle: `Capacidad real del bloque ${capacidadBloque} < ${asignacion.alumnosMatriculados} alumnos matriculados`,
      });
    }
  }

  return afectadas;
}

/**
 * Issue 4.4: dado el nuevo estado de PCs malogradas o el nuevo aforo nominal de un espacio,
 * devuelve las asignaciones vigentes con capacidad insuficiente. No persiste nada.
 */
export async function evaluarCapacidadInsuficiente(
  espacioId: string,
  cambio: CambioCapacidad,
  db: Db,
): Promise<AsignacionAfectadaDTO[]> {
  const asignaciones = await cargarAsignacionesVigentesDeEspacio(espacioId, db);
  return detectarCapacidadInsuficiente(espacioId, cambio, asignaciones);
}

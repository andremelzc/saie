import { CampoHistorialEspacio, PrismaClient, TipoAlerta, TipoEspacio } from '@prisma/client';
import { HttpError } from '../lib/http';
import { formatearSoftware } from '../lib/software';
import { emitirAlertasCreadas } from '../events/emisores';
import { AlertaRegistradaDTO } from '../types/alertas';
import { TokenPayload } from '../types/auth';
import { SoftwareInstaladoInput, SoftwareResumenDTO } from '../types/software';
import { verificarAccesoEspacio } from './acceso.service';
import { registrarAlertaDesdeDeteccion } from './alerta.service';
import {
  evaluarCapacidadInsuficiente,
  evaluarIncompatibilidadSoftware,
} from './deteccionAlertas.service';
import { resolverSoftwareIds } from './software.service';

export interface ResultadoCambioLaboratorio {
  laboratorio: {
    id: string;
    identificador: string;
    softwareInstalado: SoftwareResumenDTO[];
    pcsMalogradas: number | null;
  };
  /** `false` si el valor enviado ya era el vigente: no se registra historial ni se evalúa. */
  cambioRegistrado: boolean;
  alertas: AlertaRegistradaDTO[];
}

/** Orden estable (nombre + versión) para comparar y presentar el software instalado. */
function aResumen(
  filas: Array<{ softwareId: string; software: { nombre: string; version: string } }>,
): SoftwareResumenDTO[] {
  return filas
    .map((fila) => ({
      id: fila.softwareId,
      nombre: fila.software.nombre,
      version: fila.software.version,
    }))
    .sort((a, b) => formatearSoftware(a).localeCompare(formatearSoftware(b)));
}

function mismoConjunto(a: string[], b: string[]): boolean {
  const conjuntoA = [...new Set(a)].sort((x, y) => x.localeCompare(y));
  const conjuntoB = [...new Set(b)].sort((x, y) => x.localeCompare(y));
  return conjuntoA.length === conjuntoB.length && conjuntoA.every((v, i) => v === conjuntoB[i]);
}

async function obtenerLaboratorio(laboratorioId: string, db: Pick<PrismaClient, 'espacio'>) {
  const espacio = await db.espacio.findUnique({
    where: { id: laboratorioId },
    include: { softwareInstaladoCatalogo: { include: { software: true } } },
  });
  if (!espacio) {
    throw new HttpError(404, `El laboratorio con ID '${laboratorioId}' no existe`);
  }
  if (espacio.tipo !== TipoEspacio.LABORATORIO) {
    throw new HttpError(400, `El espacio '${espacio.identificador}' no es un laboratorio`);
  }
  return espacio;
}

/**
 * Issue 4.1 / 4.28: registra el software instalado en un laboratorio usando el catálogo.
 *
 * En una sola transacción: verifica acceso, reemplaza las filas de `EspacioSoftware`, deja la
 * fila de `HistorialEspacio` con los nombres y versiones anteriores y nuevos, evalúa la
 * incompatibilidad (Issue 4.3) y persiste la alerta resultante (Issue 4.5).
 * Un software inexistente responde 404 y uno dado de baja, 422: nunca se guarda texto libre.
 */
export async function registrarCambioSoftware(
  laboratorioId: string,
  softwareIds: string[],
  auth: TokenPayload,
  prisma: PrismaClient,
): Promise<ResultadoCambioLaboratorio> {
  const resultado = await prisma.$transaction(async (tx) => {
    const lab = await obtenerLaboratorio(laboratorioId, tx);
    await verificarAccesoEspacio(auth, lab.id, tx);

    const software = await resolverSoftwareIds(softwareIds, tx);
    const actuales = lab.softwareInstaladoCatalogo;

    if (
      mismoConjunto(
        actuales.map((a) => a.softwareId),
        software.map((s) => s.id),
      )
    ) {
      return {
        laboratorio: {
          id: lab.id,
          identificador: lab.identificador,
          softwareInstalado: aResumen(actuales),
          pcsMalogradas: lab.pcsMalogradas,
        },
        cambioRegistrado: false,
        alertas: [],
      };
    }

    await tx.espacioSoftware.deleteMany({ where: { espacioId: lab.id } });
    if (software.length > 0) {
      await tx.espacioSoftware.createMany({
        data: software.map((s) => ({
          espacioId: lab.id,
          softwareId: s.id,
          registradoPorId: auth.sub,
        })),
      });
    }

    await tx.historialEspacio.create({
      data: {
        espacioId: lab.id,
        campo: CampoHistorialEspacio.SOFTWARE,
        valorAnterior: JSON.stringify(actuales.map((a) => formatearSoftware(a.software))),
        valorNuevo: JSON.stringify(software.map(formatearSoftware)),
        cuentaId: auth.sub,
      },
    });

    const nuevoSoftware: SoftwareInstaladoInput[] = software.map((s) => ({
      nombre: s.nombre,
      nombreNormalizado: s.nombreNormalizado,
      version: s.version,
    }));

    const afectadas = await evaluarIncompatibilidadSoftware(lab.id, nuevoSoftware, tx);
    const alerta = await registrarAlertaDesdeDeteccion(
      TipoAlerta.SOFTWARE,
      lab.id,
      lab.identificador,
      afectadas,
      tx,
    );

    return {
      laboratorio: {
        id: lab.id,
        identificador: lab.identificador,
        softwareInstalado: software.map(({ id, nombre, version }) => ({ id, nombre, version })),
        pcsMalogradas: lab.pcsMalogradas,
      },
      cambioRegistrado: true,
      alertas: alerta ? [alerta] : [],
    };
  });

  // Issue 2.16: el evento sale una vez confirmada la transacción, nunca dentro de ella.
  emitirAlertasCreadas(resultado.alertas);
  return resultado;
}

/**
 * Issue 4.2: registra el nuevo conteo de PCs malogradas de un laboratorio.
 *
 * Rechaza (422) un conteo mayor al aforo nominal. Guarda el valor, deja historial, evalúa la
 * capacidad insuficiente (Issue 4.4) y persiste la alerta (Issue 4.5), todo en una transacción.
 * Si las PCs se reparan la capacidad sube y la detección no devuelve afectados.
 */
export async function registrarCambioPcsMalogradas(
  laboratorioId: string,
  pcsMalogradas: number,
  auth: TokenPayload,
  prisma: PrismaClient,
): Promise<ResultadoCambioLaboratorio> {
  const resultado = await prisma.$transaction(async (tx) => {
    const lab = await obtenerLaboratorio(laboratorioId, tx);
    await verificarAccesoEspacio(auth, lab.id, tx);

    if (pcsMalogradas > lab.aforoNominal) {
      throw new HttpError(
        422,
        `El conteo de PCs malogradas (${pcsMalogradas}) excede el aforo nominal (${lab.aforoNominal}) de ${lab.identificador}`,
      );
    }

    if ((lab.pcsMalogradas ?? 0) === pcsMalogradas) {
      return {
        laboratorio: {
          id: lab.id,
          identificador: lab.identificador,
          softwareInstalado: aResumen(lab.softwareInstaladoCatalogo),
          pcsMalogradas: lab.pcsMalogradas,
        },
        cambioRegistrado: false,
        alertas: [],
      };
    }

    const actualizado = await tx.espacio.update({
      where: { id: lab.id },
      data: { pcsMalogradas },
    });

    await tx.historialEspacio.create({
      data: {
        espacioId: lab.id,
        campo: CampoHistorialEspacio.PCS_MALOGRADAS,
        valorAnterior: lab.pcsMalogradas === null ? null : String(lab.pcsMalogradas),
        valorNuevo: String(pcsMalogradas),
        cuentaId: auth.sub,
      },
    });

    const afectadas = await evaluarCapacidadInsuficiente(lab.id, { pcsMalogradas }, tx);
    const alerta = await registrarAlertaDesdeDeteccion(
      TipoAlerta.CAPACIDAD,
      lab.id,
      lab.identificador,
      afectadas,
      tx,
    );

    return {
      laboratorio: {
        id: actualizado.id,
        identificador: actualizado.identificador,
        softwareInstalado: aResumen(lab.softwareInstaladoCatalogo),
        pcsMalogradas: actualizado.pcsMalogradas,
      },
      cambioRegistrado: true,
      alertas: alerta ? [alerta] : [],
    };
  });

  // Issue 2.16: el evento sale una vez confirmada la transacción, nunca dentro de ella.
  emitirAlertasCreadas(resultado.alertas);
  return resultado;
}

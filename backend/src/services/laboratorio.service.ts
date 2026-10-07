import { CampoHistorialEspacio, PrismaClient, TipoAlerta, TipoEspacio } from '@prisma/client';
import { HttpError } from '../lib/http';
import { AlertaRegistradaDTO } from '../types/alertas';
import { TokenPayload } from '../types/auth';
import { verificarAccesoEspacio } from './acceso.service';
import { registrarAlertaDesdeDeteccion } from './alerta.service';
import {
  evaluarCapacidadInsuficiente,
  evaluarIncompatibilidadSoftware,
} from './deteccionAlertas.service';

export interface ResultadoCambioLaboratorio {
  laboratorio: {
    id: string;
    identificador: string;
    softwareInstalado: string[];
    pcsMalogradas: number | null;
  };
  /** `false` si el valor enviado ya era el vigente: no se registra historial ni se evalúa. */
  cambioRegistrado: boolean;
  alertas: AlertaRegistradaDTO[];
}

/** Quita espacios sobrantes, descarta vacíos y duplicados (sin distinguir mayúsculas). */
export function normalizarListaSoftware(software: string[]): string[] {
  const vistos = new Set<string>();
  const resultado: string[] = [];
  for (const item of software) {
    const limpio = item.trim().replace(/\s+/g, ' ');
    const clave = limpio.toLowerCase();
    if (limpio && !vistos.has(clave)) {
      vistos.add(clave);
      resultado.push(limpio);
    }
  }
  return resultado;
}

function mismoSoftware(a: string[], b: string[]): boolean {
  const claveA = normalizarListaSoftware(a)
    .map((s) => s.toLowerCase())
    .sort();
  const claveB = normalizarListaSoftware(b)
    .map((s) => s.toLowerCase())
    .sort();
  return claveA.length === claveB.length && claveA.every((s, i) => s === claveB[i]);
}

async function obtenerLaboratorio(laboratorioId: string, db: Pick<PrismaClient, 'espacio'>) {
  const espacio = await db.espacio.findUnique({ where: { id: laboratorioId } });
  if (!espacio) {
    throw new HttpError(404, `El laboratorio con ID '${laboratorioId}' no existe`);
  }
  if (espacio.tipo !== TipoEspacio.LABORATORIO) {
    throw new HttpError(400, `El espacio '${espacio.identificador}' no es un laboratorio`);
  }
  return espacio;
}

/**
 * Issue 4.1: registra un cambio de software instalado en un laboratorio.
 *
 * En una sola transacción: verifica acceso, guarda el nuevo software, deja la fila de
 * HistorialEspacio (valor anterior, nuevo, fecha y cuenta), evalúa la incompatibilidad
 * (Issue 4.3) y persiste la alerta resultante (Issue 4.5).
 */
export async function registrarCambioSoftware(
  laboratorioId: string,
  softwareInstalado: string[],
  auth: TokenPayload,
  prisma: PrismaClient,
): Promise<ResultadoCambioLaboratorio> {
  return prisma.$transaction(async (tx) => {
    const lab = await obtenerLaboratorio(laboratorioId, tx);
    await verificarAccesoEspacio(auth, lab.id, tx);

    const nuevoSoftware = normalizarListaSoftware(softwareInstalado);

    if (mismoSoftware(lab.softwareInstalado, nuevoSoftware)) {
      return {
        laboratorio: {
          id: lab.id,
          identificador: lab.identificador,
          softwareInstalado: lab.softwareInstalado,
          pcsMalogradas: lab.pcsMalogradas,
        },
        cambioRegistrado: false,
        alertas: [],
      };
    }

    const actualizado = await tx.espacio.update({
      where: { id: lab.id },
      data: { softwareInstalado: nuevoSoftware },
    });

    await tx.historialEspacio.create({
      data: {
        espacioId: lab.id,
        campo: CampoHistorialEspacio.SOFTWARE,
        valorAnterior: JSON.stringify(lab.softwareInstalado),
        valorNuevo: JSON.stringify(nuevoSoftware),
        cuentaId: auth.sub,
      },
    });

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
        id: actualizado.id,
        identificador: actualizado.identificador,
        softwareInstalado: actualizado.softwareInstalado,
        pcsMalogradas: actualizado.pcsMalogradas,
      },
      cambioRegistrado: true,
      alertas: alerta ? [alerta] : [],
    };
  });
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
  return prisma.$transaction(async (tx) => {
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
          softwareInstalado: lab.softwareInstalado,
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
        softwareInstalado: actualizado.softwareInstalado,
        pcsMalogradas: actualizado.pcsMalogradas,
      },
      cambioRegistrado: true,
      alertas: alerta ? [alerta] : [],
    };
  });
}

import { PrismaClient, ResultadoImportacion, TipoArchivoImportacion } from '@prisma/client';
import { resolverCuentas } from '../lib/nombresCuenta';
import {
  TIPOS_IMPORTACION,
  TipoImportacion,
  UltimaImportacionDTO,
  UltimasImportacionesDTO,
} from '../types/importacion';

/**
 * Issue 4.54 — Registro de las importaciones de datos maestros.
 *
 * «Última carga» y su estado salían del navegador (`localStorage`) y de la memoria de React: en
 * otro equipo, en modo privado o tras limpiar datos aparecían vacíos, y la carga de otra persona
 * de Coordinación nunca se veía. Cada importación queda ahora en la tabla `importaciones`, con
 * la cuenta que la hizo, la fecha y el resultado, y el panel la lee del servidor.
 */

const TIPO_ARCHIVO: Record<TipoImportacion, TipoArchivoImportacion> = {
  'cursos-secciones': TipoArchivoImportacion.CURSOS_SECCIONES,
  horarios: TipoArchivoImportacion.HORARIOS,
  matriculas: TipoArchivoImportacion.MATRICULAS,
  docentes: TipoArchivoImportacion.DOCENTES,
};

const TIPO_IMPORTACION = Object.fromEntries(
  (Object.entries(TIPO_ARCHIVO) as [TipoImportacion, TipoArchivoImportacion][]).map(([t, a]) => [
    a,
    t,
  ]),
) as Record<TipoArchivoImportacion, TipoImportacion>;

export interface DatosImportacion {
  tipo: TipoImportacion;
  /** Cuenta que cargó el archivo (`auth.sub`); `null` si se desconoce. */
  cuentaId: string | null;
  filasRecibidas: number;
  /** Una entrada por fila rechazada. */
  errores: string[];
}

/** Guarda el resultado de una importación. Cada entrada de `errores` es una fila rechazada. */
export async function registrarImportacion(
  prisma: Pick<PrismaClient, 'importacion'>,
  datos: DatosImportacion,
): Promise<void> {
  const rechazadas = Math.min(datos.errores.length, datos.filasRecibidas);
  await prisma.importacion.create({
    data: {
      tipo: TIPO_ARCHIVO[datos.tipo],
      cuentaId: datos.cuentaId,
      filasRecibidas: datos.filasRecibidas,
      filasAceptadas: datos.filasRecibidas - rechazadas,
      filasRechazadas: rechazadas,
      resultado:
        datos.errores.length === 0
          ? ResultadoImportacion.EXITOSA
          : ResultadoImportacion.CON_ERRORES,
    },
  });
}

/**
 * Issue 4.54 — GET /api/v1/admin/importaciones/ultima[?tipo=]
 *
 * La última importación de cada tipo (o solo la del `tipo` indicado), `null` si nunca se cargó.
 */
export async function obtenerUltimasImportaciones(
  tipo: TipoImportacion | undefined,
  prisma: Pick<PrismaClient, 'importacion' | 'cuenta'>,
): Promise<Partial<UltimasImportacionesDTO>> {
  const tipos = tipo ? [tipo] : [...TIPOS_IMPORTACION];

  const ultimas = await Promise.all(
    tipos.map((t) =>
      prisma.importacion.findFirst({
        where: { tipo: TIPO_ARCHIVO[t] },
        orderBy: { fecha: 'desc' },
      }),
    ),
  );

  const cuentas = await resolverCuentas(
    ultimas.flatMap((u) => (u?.cuentaId ? [u.cuentaId] : [])),
    prisma,
  );

  const resultado: Partial<UltimasImportacionesDTO> = {};
  tipos.forEach((t, i) => {
    const u = ultimas[i];
    resultado[t] = u
      ? ({
          tipo: TIPO_IMPORTACION[u.tipo],
          fecha: u.fecha.toISOString(),
          cuenta: u.cuentaId ? (cuentas.get(u.cuentaId) ?? null) : null,
          filasRecibidas: u.filasRecibidas,
          filasAceptadas: u.filasAceptadas,
          filasRechazadas: u.filasRechazadas,
          resultado: u.resultado,
        } satisfies UltimaImportacionDTO)
      : null;
  });
  return resultado;
}

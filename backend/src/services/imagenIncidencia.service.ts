import { EstadoIncidencia, PrismaClient, RolCuenta } from '@prisma/client';
import { HttpError } from '../lib/http';
import { detectarTipoImagen, MAX_BYTES_IMAGEN, TipoImagenEvidencia } from '../lib/imagenEvidencia';
import { TokenPayload } from '../types/auth';
import { obtenerDocenteDeCuenta } from './docente.service';

/**
 * Issue 7.19 (riesgo R45): la foto de una incidencia.
 *
 * El docente la adjunta a una incidencia suya mientras está pendiente (si ya había una, la
 * reemplaza). Jefatura la ve en la ficha de la incidencia: Coordinación todas, Jefatura solo las
 * de los laboratorios a su cargo, la misma regla que el listado (Issue 7.6).
 */

export interface ImagenDTO {
  tipoMime: TipoImagenEvidencia;
  datos: Buffer;
}

const MB = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(0)} MB`;

/** Comprueba tamaño y tipo real; devuelve el tipo detectado por la firma y los bytes. */
export function validarImagen(datos: Buffer | undefined): {
  tipoMime: TipoImagenEvidencia;
  bytes: Uint8Array<ArrayBuffer>;
} {
  if (!datos || datos.length === 0) {
    throw new HttpError(400, 'Adjunta una imagen JPEG, PNG o WebP');
  }
  if (datos.length > MAX_BYTES_IMAGEN) {
    throw new HttpError(413, `La imagen no puede superar ${MB(MAX_BYTES_IMAGEN)}`);
  }
  const tipoMime = detectarTipoImagen(datos);
  if (!tipoMime) {
    throw new HttpError(415, 'El archivo no es una imagen JPEG, PNG o WebP');
  }
  return { tipoMime, bytes: Uint8Array.from(datos) };
}

/** POST /api/v1/docente/incidencias/:id/imagen — adjunta (o reemplaza) la foto. */
export async function guardarImagenIncidencia(
  cuentaId: string,
  incidenciaId: string,
  datos: Buffer | undefined,
  prisma: PrismaClient,
): Promise<{ tipoMime: TipoImagenEvidencia; tamanoBytes: number }> {
  const docente = await obtenerDocenteDeCuenta(cuentaId, prisma);
  const incidencia = await prisma.incidencia.findFirst({
    where: { id: incidenciaId, docenteId: docente.id },
    select: { id: true, estado: true },
  });
  if (!incidencia) {
    throw new HttpError(404, 'La incidencia no existe o no te pertenece');
  }
  if (incidencia.estado !== EstadoIncidencia.PENDIENTE) {
    throw new HttpError(409, 'La incidencia ya fue resuelta: no se puede cambiar su foto');
  }

  const { tipoMime, bytes } = validarImagen(datos);
  const contenido = { tipoMime, tamanoBytes: bytes.length, datos: bytes };
  await prisma.imagenIncidencia.upsert({
    where: { incidenciaId },
    create: { incidenciaId, ...contenido },
    update: { ...contenido, creadaEn: new Date() },
  });
  return { tipoMime, tamanoBytes: contenido.tamanoBytes };
}

async function leerImagen(incidenciaId: string, prisma: PrismaClient): Promise<ImagenDTO> {
  const imagen = await prisma.imagenIncidencia.findUnique({ where: { incidenciaId } });
  if (!imagen) throw new HttpError(404, 'La incidencia no tiene foto');
  return { tipoMime: imagen.tipoMime as TipoImagenEvidencia, datos: Buffer.from(imagen.datos) };
}

/** GET /api/v1/docente/incidencias/:id/imagen — solo la de una incidencia propia. */
export async function obtenerImagenParaDocente(
  cuentaId: string,
  incidenciaId: string,
  prisma: PrismaClient,
): Promise<ImagenDTO> {
  const docente = await obtenerDocenteDeCuenta(cuentaId, prisma);
  const propia = await prisma.incidencia.count({
    where: { id: incidenciaId, docenteId: docente.id },
  });
  if (propia === 0) throw new HttpError(404, 'La incidencia no existe o no te pertenece');
  return leerImagen(incidenciaId, prisma);
}

/** GET /api/v1/admin/incidencias/:id/imagen — Coordinación todas; Jefatura las de sus laboratorios. */
export async function obtenerImagenParaAdmin(
  auth: TokenPayload,
  incidenciaId: string,
  prisma: PrismaClient,
): Promise<ImagenDTO> {
  const soloResponsable =
    auth.rol === RolCuenta.JEFATURA_LABORATORIOS
      ? { espacio: { responsables: { some: { cuentaId: auth.sub } } } }
      : {};
  const visible = await prisma.incidencia.count({
    where: { id: incidenciaId, ...soloResponsable },
  });
  if (visible === 0) throw new HttpError(404, 'La incidencia no existe');
  return leerImagen(incidenciaId, prisma);
}

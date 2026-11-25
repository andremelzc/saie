/**
 * Issue 7.19 (riesgo R45): reglas de la foto que el docente adjunta a una incidencia.
 *
 * Solo JPEG, PNG o WebP de hasta 2 MB. El tipo se comprueba por los primeros bytes del archivo
 * (su «firma»), no por el nombre ni por lo que declara el navegador: así un archivo que no es
 * una imagen no pasa aunque lo renombren.
 */

export const TIPOS_IMAGEN_EVIDENCIA = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type TipoImagenEvidencia = (typeof TIPOS_IMAGEN_EVIDENCIA)[number];

/** 2 MB: suficiente para una foto del equipo tomada con el celular. */
export const MAX_BYTES_IMAGEN = 2 * 1024 * 1024;

const empiezaCon = (datos: Buffer, firma: number[], desde = 0) =>
  datos.length >= desde + firma.length && firma.every((b, i) => datos[desde + i] === b);

/** Tipo real de la imagen según su firma, o `null` si no es JPEG, PNG ni WebP. */
export function detectarTipoImagen(datos: Buffer): TipoImagenEvidencia | null {
  if (empiezaCon(datos, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (empiezaCon(datos, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  // WebP: «RIFF» + 4 bytes de tamaño + «WEBP».
  if (
    empiezaCon(datos, [0x52, 0x49, 0x46, 0x46]) &&
    empiezaCon(datos, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return 'image/webp';
  }
  return null;
}

/**
 * Issue 7.19 (riesgo R45): la foto que el docente adjunta a una incidencia. Las mismas reglas que
 * el backend (que además comprueba el contenido del archivo): JPEG, PNG o WebP de hasta 2 MB.
 */

export const TIPOS_IMAGEN_EVIDENCIA = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_BYTES_IMAGEN = 2 * 1024 * 1024;

/** Error del archivo elegido, o `null` si se puede enviar. */
export function validarArchivoImagen(archivo: Pick<File, 'type' | 'size'>): string | null {
  if (!TIPOS_IMAGEN_EVIDENCIA.includes(archivo.type)) {
    return 'Elige una imagen JPEG, PNG o WebP.';
  }
  if (archivo.size > MAX_BYTES_IMAGEN) {
    return 'La imagen no puede superar 2 MB. Prueba con una foto de menor resolución.';
  }
  return null;
}

/**
 * Issue 1.18 (riesgo R38 de la auditoría): Excel en Windows en español guarda «CSV (delimitado por
 * comas)» en Windows-1252. Leerlo siempre como UTF-8 convierte cada tilde y ñ en «�», sin error.
 *
 * Se lee el archivo como bytes: si son UTF-8 válido se usa UTF-8; si no, Windows-1252.
 */
export function decodificarCsv(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

/** Lee un archivo CSV eligiendo la codificación correcta. */
export function leerArchivoCsv(archivo: File): Promise<string> {
  if (typeof archivo.arrayBuffer === 'function') {
    return archivo.arrayBuffer().then(decodificarCsv);
  }
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(decodificarCsv(lector.result as ArrayBuffer));
    lector.onerror = () => reject(lector.error);
    lector.readAsArrayBuffer(archivo);
  });
}

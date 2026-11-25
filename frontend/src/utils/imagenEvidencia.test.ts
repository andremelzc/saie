import { describe, expect, it } from 'vitest';
import { MAX_BYTES_IMAGEN, validarArchivoImagen } from './imagenEvidencia';

describe('validarArchivoImagen (Issue 7.19)', () => {
  it('acepta JPEG, PNG y WebP de hasta 2 MB', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(validarArchivoImagen({ type, size: 1000 })).toBeNull();
    }
    expect(validarArchivoImagen({ type: 'image/png', size: MAX_BYTES_IMAGEN })).toBeNull();
  });

  it('rechaza otros tipos y archivos de más de 2 MB', () => {
    expect(validarArchivoImagen({ type: 'application/pdf', size: 1000 })).toContain('JPEG');
    expect(validarArchivoImagen({ type: 'image/gif', size: 1000 })).toContain('JPEG');
    expect(validarArchivoImagen({ type: 'image/png', size: MAX_BYTES_IMAGEN + 1 })).toContain(
      '2 MB',
    );
  });
});

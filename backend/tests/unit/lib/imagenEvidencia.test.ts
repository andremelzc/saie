import { detectarTipoImagen } from '../../../src/lib/imagenEvidencia';

describe('detectarTipoImagen (Issue 7.19)', () => {
  it('reconoce JPEG, PNG y WebP por su firma', () => {
    expect(detectarTipoImagen(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe('image/jpeg');
    expect(
      detectarTipoImagen(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])),
    ).toBe('image/png');
    expect(detectarTipoImagen(Buffer.from('RIFF\u0000\u0000\u0000\u0000WEBPVP8 ', 'latin1'))).toBe(
      'image/webp',
    );
  });

  it('no acepta otros archivos ni firmas incompletas', () => {
    expect(detectarTipoImagen(Buffer.from('GIF89a'))).toBeNull();
    expect(detectarTipoImagen(Buffer.from('%PDF-1.7'))).toBeNull();
    expect(
      detectarTipoImagen(Buffer.from('RIFF\u0000\u0000\u0000\u0000WAVE', 'latin1')),
    ).toBeNull();
    expect(detectarTipoImagen(Buffer.from([0xff, 0xd8]))).toBeNull();
    expect(detectarTipoImagen(Buffer.alloc(0))).toBeNull();
  });
});

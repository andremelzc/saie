import { describe, expect, it } from 'vitest';
import { decodificarCsv, leerArchivoCsv } from './archivoCsv';

const bytes = (valores: number[]) => new Uint8Array(valores).buffer;

describe('decodificarCsv (Issue 1.18)', () => {
  it('lee UTF-8 válido sin cambios', () => {
    const utf8 = new TextEncoder().encode('Cálculo;Muñoz').buffer;
    expect(decodificarCsv(utf8)).toBe('Cálculo;Muñoz');
  });

  it('lee Windows-1252 (CSV de Excel en español)', () => {
    // «Cálculo Muñoz» en Windows-1252: á = 0xE1, ñ = 0xF1
    const cp1252 = bytes([
      0x43, 0xe1, 0x6c, 0x63, 0x75, 0x6c, 0x6f, 0x20, 0x4d, 0x75, 0xf1, 0x6f, 0x7a,
    ]);
    expect(decodificarCsv(cp1252)).toBe('Cálculo Muñoz');
  });
});

describe('leerArchivoCsv', () => {
  it('decodifica el archivo elegido', async () => {
    const archivo = new File([bytes([0x4d, 0x75, 0xf1, 0x6f, 0x7a])], 'a.csv');
    expect(await leerArchivoCsv(archivo)).toBe('Muñoz');
  });

  it('usa FileReader si el navegador no tiene arrayBuffer()', async () => {
    const archivo = new File([bytes([0x4d, 0x75, 0xf1, 0x6f, 0x7a])], 'a.csv');
    Object.defineProperty(archivo, 'arrayBuffer', { value: undefined });
    expect(await leerArchivoCsv(archivo)).toBe('Muñoz');
  });
});

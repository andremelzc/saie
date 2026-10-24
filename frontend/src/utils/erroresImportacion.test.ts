import { describe, expect, it } from 'vitest';
import { agruparErroresPorTipo, tipoDeError } from './erroresImportacion';

describe('errores de importación por tipo (Issue 4.53)', () => {
  it('quita el número de fila y generaliza los valores concretos', () => {
    expect(tipoDeError("Fila 12: el curso 'CC-117' no existe")).toBe('el curso «…» no existe');
    expect(tipoDeError('Fila 7 - la hora 25:00 no es válida')).toBe('la hora N no es válida');
  });

  it('agrupa filas distintas con el mismo problema y ordena por cantidad', () => {
    const grupos = agruparErroresPorTipo([
      "Fila 2: el curso 'A' no existe",
      'Fila 3: falta el código de sección',
      "Fila 4: el curso 'B' no existe",
      "Fila 9: el curso 'C' no existe",
    ]);
    expect(grupos.map((g) => g.errores.length)).toEqual([3, 1]);
    expect(grupos[0].tipo).toBe('el curso «…» no existe');
    expect(grupos[0].errores[0]).toBe("Fila 2: el curso 'A' no existe");
  });

  it('un archivo con miles de errores se agrupa sin perder ninguno', () => {
    const errores = Array.from({ length: 20000 }, (_, i) => `Fila ${i + 2}: falta el código`);
    const grupos = agruparErroresPorTipo(errores);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].errores).toHaveLength(20000);
  });

  it('un mensaje vacío no rompe el agrupado', () => {
    expect(agruparErroresPorTipo(['Fila 3:'])[0].tipo).toBe('Error sin detalle');
  });
});

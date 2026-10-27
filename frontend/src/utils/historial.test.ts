import { describe, expect, it } from 'vitest';
import type { HistorialAsignacionDTO } from '../types/admin';
import { agruparPorCorrida, tituloDeCorrida, ubicacionDeEspacios } from './historial';

const fila = (
  id: string,
  corridaId: string | null,
  estado: HistorialAsignacionDTO['estado'],
  fecha: string,
): HistorialAsignacionDTO => ({
  id,
  seccionId: `s-${id}`,
  codigoCurso: 'IS101',
  nombreCurso: 'Algoritmos',
  codigoSeccion: '1',
  periodo: '2026-2',
  estado,
  fechaAsignacion: fecha,
  corridaId,
  motivoEscalamiento: null,
  espacios: [],
});

describe('historial por corrida (Issue 4.47)', () => {
  const items = [
    fila('1', 'c2', 'VIGENTE', '2026-10-20T15:32:00Z'),
    fila('2', 'c2', 'ESCALADA', '2026-10-20T15:30:00Z'),
    fila('3', 'c1', 'HISTORICA', '2026-10-12T15:00:00Z'),
    fila('4', null, 'VIGENTE', '2026-10-10T15:00:00Z'),
  ];

  it('agrupa por corrida en el orden recibido y cuenta asignadas y en revisión', () => {
    const grupos = agruparPorCorrida(items);
    expect(grupos.map((g) => g.corridaId)).toEqual(['c2', 'c1', null]);
    expect(grupos[0]).toMatchObject({ asignadas: 1, enRevision: 1 });
    expect(grupos[0].fecha).toBe('2026-10-20T15:32:00Z');
  });

  it('el título es legible y no contiene el identificador de la corrida', () => {
    const [primero, , individual] = agruparPorCorrida(items);
    expect(tituloDeCorrida(primero)).toMatch(
      /^Corrida del 20 oct.*10:32.* · 1 asignada · 1 en revisión$/,
    );
    expect(tituloDeCorrida(primero)).not.toContain('c2');
    expect(tituloDeCorrida(individual)).toMatch(/^Asignación individual del 10 oct/);
  });

  it('la ubicación junta pabellón y piso sin repetir', () => {
    expect(
      ubicacionDeEspacios([
        { id: 'a', identificador: 'C-301', pabellon: 'C', piso: 3 },
        { id: 'b', identificador: 'C-302', pabellon: 'C', piso: 3 },
      ]),
    ).toBe('Pabellón C · piso 3');
    expect(
      ubicacionDeEspacios([{ id: 'a', identificador: 'x', pabellon: 'Pabellón A', piso: 1 }]),
    ).toBe('Pabellón A · piso 1');
  });
});

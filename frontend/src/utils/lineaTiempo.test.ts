import { describe, expect, it } from 'vitest';
import type { HistorialAsignacionDTO } from '../types/admin';
import { lineaTiempoDeSeccion } from './lineaTiempo';

const fila = (o: Partial<HistorialAsignacionDTO>): HistorialAsignacionDTO => ({
  id: 'a',
  seccionId: 's1',
  codigoCurso: 'IS101',
  nombreCurso: 'Algoritmos',
  codigoSeccion: '1',
  periodo: '2026-2',
  estado: 'HISTORICA',
  fechaAsignacion: '2026-10-01T10:00:00Z',
  corridaId: null,
  motivoEscalamiento: null,
  espacios: [{ id: 'e1', identificador: 'Lab 03', pabellon: 'A', piso: 2 }],
  ...o,
});

describe('lineaTiempoDeSeccion (Issue 4.46)', () => {
  it('ordena de la más antigua a la más reciente: asignada → revisión → reasignada', () => {
    const pasos = lineaTiempoDeSeccion([
      fila({
        id: 'c',
        estado: 'VIGENTE',
        fechaAsignacion: '2026-10-03T10:00:00Z',
        espacios: [{ id: 'e2', identificador: 'Lab 05', pabellon: 'A', piso: 3 }],
      }),
      fila({ id: 'a' }),
      fila({
        id: 'b',
        fechaAsignacion: '2026-10-02T10:00:00Z',
        espacios: [],
        motivoEscalamiento: '[SIN_HORARIO] No tiene horario',
      }),
    ]);

    expect(pasos.map((p) => p.titulo)).toEqual([
      'Asignada a Lab 03',
      'Pasó a revisión',
      'Reasignada a Lab 05',
    ]);
    expect(pasos[0].detalle).toBe('Pabellón A · piso 2');
    expect(pasos[1].detalle).toMatch(/No tiene horario$/);
    expect(pasos.map((p) => p.actual)).toEqual([false, false, true]);
  });

  it('marca como actual la revisión pendiente si es lo último', () => {
    const pasos = lineaTiempoDeSeccion([
      fila({}),
      fila({ id: 'b', estado: 'ESCALADA', fechaAsignacion: '2026-10-02T10:00:00Z', espacios: [] }),
    ]);
    expect(pasos[1]).toMatchObject({ titulo: 'Pasó a revisión', actual: true, detalle: null });
  });
});

import { describe, expect, it } from 'vitest';
import {
  fechaLarga,
  formatearFechaCivil,
  formatearFechaCorta,
  formatearFechaLarga,
  formatearFechaRelativa,
} from './fechas';

describe('fechas en hora de Lima (Issue 3.50)', () => {
  it('formatea el instante en Lima, no en la zona del equipo', () => {
    // 02:30 UTC del 2 de octubre es las 21:30 del 1 de octubre en Lima (UTC-5).
    expect(formatearFechaLarga('2026-10-02T02:30:00Z')).toBe('1 de octubre de 2026');
    expect(formatearFechaCorta('2026-10-02T02:30:00Z')).toMatch(/^1 oct/);
  });

  it('la fecha larga con día de la semana también usa Lima', () => {
    expect(fechaLarga(new Date('2026-10-19T03:00:00Z'))).toBe('domingo, 18 de octubre');
  });

  it('una fecha civil no se corre un día por la zona horaria', () => {
    expect(formatearFechaCivil('2003-04-12')).toBe('12 de abril de 2003');
    expect(formatearFechaCivil('2003-13-01')).toBeNull();
    expect(formatearFechaCivil(null)).toBeNull();
  });

  it('usa formato relativo por debajo de 24 horas y fecha corta después', () => {
    const ahora = new Date('2026-10-20T15:00:00Z');
    expect(formatearFechaRelativa('2026-10-20T14:58:00Z', ahora)).toBe('hace 2 min');
    expect(formatearFechaRelativa('2026-10-20T13:00:00Z', ahora)).toBe('hace 2 h');
    expect(formatearFechaRelativa('2026-10-17T13:00:00Z', ahora)).toMatch(/oct/);
  });

  it('devuelve null o el texto original si la fecha no es válida', () => {
    expect(formatearFechaLarga('no es fecha')).toBeNull();
    expect(formatearFechaCorta('no es fecha')).toBe('no es fecha');
  });
});

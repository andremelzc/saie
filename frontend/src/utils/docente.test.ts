import { describe, expect, it } from 'vitest';
import { horarioDocente } from '../test/fixtures/docente';
import { laboratoriosDelDocente, proximaClaseDocente } from './docente';

describe('proximaClaseDocente (Issue 7.8)', () => {
  const horario = horarioDocente();

  it('devuelve la clase en curso de hoy', () => {
    const proxima = proximaClaseDocente(horario, 'LUNES', 9 * 60);
    expect(proxima?.sesion.codigoCurso).toBe('IS101');
    expect(proxima?.esHoy).toBe(true);
  });

  it('salta a la siguiente clase del día cuando la primera ya terminó', () => {
    expect(proximaClaseDocente(horario, 'LUNES', 11 * 60)?.sesion.codigoCurso).toBe('IS202');
  });

  it('si hoy ya no quedan clases, devuelve la primera del próximo día con clases', () => {
    const proxima = proximaClaseDocente(horario, 'LUNES', 17 * 60);
    expect(proxima).toMatchObject({ dia: 'MIERCOLES', esHoy: false });
  });

  it('sin clases en la semana devuelve null', () => {
    expect(proximaClaseDocente(horarioDocente({ dias: {} }), 'LUNES', 0)).toBeNull();
  });
});

describe('laboratoriosDelDocente', () => {
  it('lista solo los laboratorios, sin repetir, con sus cursos', () => {
    expect(laboratoriosDelDocente(horarioDocente().asignacionesActivas)).toEqual([
      {
        id: 'esp-l204',
        identificador: 'L-204',
        pabellon: 'Nuevo',
        piso: 2,
        cursos: ['IS101 · 1'],
      },
    ]);
  });
});

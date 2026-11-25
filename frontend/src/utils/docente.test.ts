import { describe, expect, it } from 'vitest';
import { horarioDocente } from '../test/fixtures/docente';
import {
  describirCambioLaboratorio,
  describirCambioSoftware,
  laboratoriosDelDocente,
  proximaClaseDocente,
} from './docente';

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

describe('describirCambioSoftware (Issue 7.15)', () => {
  const lista = (...nombres: string[]) => JSON.stringify(nombres);

  it('dice qué se instaló, sin corchetes ni comillas', () => {
    const frase = describirCambioSoftware(
      lista('Visual Studio Code 1.95', 'Python 3.11'),
      lista('Visual Studio Code 1.95', 'Python 3.11', 'IntelliJ IDEA Community 2024.2'),
    );
    expect(frase).toBe('Se instaló IntelliJ IDEA Community 2024.2');
    expect(frase).not.toMatch(/[[\]"]/);
  });

  it('dice qué se retiró', () => {
    expect(describirCambioSoftware(lista('Python 3.10', 'Git 2.45'), lista('Git 2.45'))).toBe(
      'Se retiró Python 3.10',
    );
  });

  it('une varios nombres con comas y «y», y combina instalado y retirado', () => {
    expect(describirCambioSoftware(lista('A'), lista('A', 'B', 'C'))).toBe('Se instalaron B y C');
    expect(describirCambioSoftware(lista('A', 'B', 'C'), lista('A'))).toBe('Se retiraron B y C');
    expect(describirCambioSoftware(lista('A', 'B'), lista('B', 'C'))).toBe(
      'Se instaló C y se retiró A',
    );
    expect(describirCambioSoftware(lista(), lista('A', 'B', 'C'))).toBe('Se instalaron A, B y C');
  });

  it('una lista vacía no es un error: todo lo nuevo se instaló y todo lo anterior se retiró', () => {
    expect(describirCambioSoftware(lista(), lista('Git 2.45'))).toBe('Se instaló Git 2.45');
    expect(describirCambioSoftware(lista('Git 2.45'), lista())).toBe('Se retiró Git 2.45');
  });

  it('un valor anterior null cuenta como lista vacía', () => {
    expect(describirCambioSoftware(null, lista('Git 2.45', 'Python 3.11'))).toBe(
      'Se instalaron Git 2.45 y Python 3.11',
    );
  });

  it('sin diferencias avisa que no hubo cambios', () => {
    expect(describirCambioSoftware(lista('A', 'B'), lista('B', 'A'))).toBe(
      'No hubo cambios en el software instalado',
    );
    expect(describirCambioSoftware(lista(), lista())).toBe(
      'No hubo cambios en el software instalado',
    );
  });

  it('un valor que no se puede interpretar da un texto genérico, nunca el crudo', () => {
    const generico = 'Se actualizó el software instalado';
    expect(describirCambioSoftware('{no es json', lista('A'))).toBe(generico);
    expect(describirCambioSoftware(lista('A'), 'texto libre')).toBe(generico);
    expect(describirCambioSoftware(lista('A'), '{"a":1}')).toBe(generico);
    expect(describirCambioSoftware(lista('A'), '[1,2]')).toBe(generico);
    expect(describirCambioSoftware('{no es json', 'texto libre')).not.toContain('texto libre');
  });
});

describe('describirCambioLaboratorio (Issue 7.15)', () => {
  it('las PCs inoperativas siguen como antes', () => {
    expect(
      describirCambioLaboratorio({
        campo: 'PCS_MALOGRADAS',
        valorAnterior: '1',
        valorNuevo: '3',
        fechaCambio: '2026-11-10T10:00:00Z',
      }),
    ).toBe('PCs inoperativas: 1 → 3');
    expect(
      describirCambioLaboratorio({
        campo: 'PCS_MALOGRADAS',
        valorAnterior: null,
        valorNuevo: '2',
        fechaCambio: '2026-11-10T10:00:00Z',
      }),
    ).toBe('PCs inoperativas: — → 2');
  });

  it('el software se describe por la diferencia', () => {
    expect(
      describirCambioLaboratorio({
        campo: 'SOFTWARE',
        valorAnterior: '["Python 3.10"]',
        valorNuevo: '["Python 3.11"]',
        fechaCambio: '2026-11-10T10:00:00Z',
      }),
    ).toBe('Se instaló Python 3.11 y se retiró Python 3.10');
  });
});

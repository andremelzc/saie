import { describe, expect, it } from 'vitest';
import type { CursoMatriculadoDTO } from '../../types/horario';
import { etiquetaDeProxima, minutosHastaSesion, ordenarPorProxima } from './clases';

// 2026-10-21 es miércoles, 10:00.
const AHORA = new Date(2026, 9, 21, 10, 0);

const sesion = (diaSemana: string, horaInicio: string, horaFin: string) =>
  ({ diaSemana, horaInicio, horaFin, espacios: [] }) as never;

const curso = (nombre: string, proximaSesion: unknown): CursoMatriculadoDTO =>
  ({ nombreCurso: nombre, asignacionId: nombre, proximaSesion }) as never;

describe('clases de la ruta', () => {
  it('cuenta los minutos hasta la sesión dentro de la semana', () => {
    expect(minutosHastaSesion(sesion('MIERCOLES', '12:00', '14:00'), AHORA)).toBe(120);
    expect(minutosHastaSesion(sesion('JUEVES', '08:00', '10:00'), AHORA)).toBe(22 * 60);
    // Ya pasó hoy: es la de la semana próxima.
    expect(minutosHastaSesion(sesion('MIERCOLES', '08:00', '09:00'), AHORA)).toBe(
      6 * 24 * 60 + 22 * 60,
    );
  });

  it('una sesión en curso cuenta 0', () => {
    expect(minutosHastaSesion(sesion('MIERCOLES', '09:00', '11:00'), AHORA)).toBe(0);
  });

  it('dice «en curso», «hoy», «mañana» o el día', () => {
    expect(etiquetaDeProxima(sesion('MIERCOLES', '09:00', '11:00'), AHORA)).toBe('En curso ahora');
    expect(etiquetaDeProxima(sesion('MIERCOLES', '14:00', '16:00'), AHORA)).toBe('Hoy 14:00');
    expect(etiquetaDeProxima(sesion('JUEVES', '08:00', '10:00'), AHORA)).toBe('Mañana 08:00');
    expect(etiquetaDeProxima(sesion('SABADO', '08:00', '10:00'), AHORA)).toBe('Sáb 08:00');
  });

  it('ordena por la que toca primero y deja al final las que no tienen próxima sesión', () => {
    const orden = ordenarPorProxima(
      [
        curso('Sin horario', null),
        curso('Viernes', sesion('VIERNES', '08:00', '10:00')),
        curso('Hoy', sesion('MIERCOLES', '15:00', '17:00')),
        curso('En curso', sesion('MIERCOLES', '09:00', '11:00')),
      ],
      AHORA,
    ).map((c) => c.nombreCurso);
    expect(orden).toEqual(['En curso', 'Hoy', 'Viernes', 'Sin horario']);
  });

  it('conserva el orden del servidor entre las que no tienen próxima sesión', () => {
    const orden = ordenarPorProxima([curso('B', null), curso('A', null)], AHORA).map(
      (c) => c.nombreCurso,
    );
    expect(orden).toEqual(['B', 'A']);
  });
});

import { describe, it, expect } from 'vitest';
import { HORARIO_FIXTURE } from '../test/fixtures/horario';
import type { EspacioAsignadoDTO } from '../types/consulta';
import type { SesionDTO } from '../types/horario';
import {
  PALETA_CURSOS,
  aMinutos,
  asignarColoresCursos,
  diaDeFecha,
  diaLectivoInicial,
  estadoAMostrar,
  estadoDeClase,
  formatearRango,
  ordenarSesiones,
  posicionBloque,
  resumenUbicacion,
  todasLasSesiones,
} from './horario';

const LABORATORIO: EspacioAsignadoDTO = {
  id: 'esp-l204',
  identificador: 'L-204',
  tipo: 'LABORATORIO',
  pabellon: 'L',
  piso: 2,
};

function sesion(codigoCurso: string, horaInicio: string): SesionDTO {
  return {
    seccionId: `sec-${codigoCurso}`,
    codigoCurso,
    nombreCurso: codigoCurso,
    codigoSeccion: 'A',
    docenteNombre: null,
    diaSemana: 'LUNES',
    horaInicio,
    horaFin: '23:00',
    espacios: [],
    estadoAsignacion: 'PENDIENTE',
  };
}

describe('utilidades del horario del alumno (Issue #145 / 3.16)', () => {
  it('convierte horas en minutos y da formato a los rangos', () => {
    expect(aMinutos('08:30')).toBe(510);
    expect(aMinutos('08:30:00')).toBe(510);
    expect(formatearRango('08:00:00', '10:00')).toBe('08:00 – 10:00');
  });

  it('obtiene el día de la semana de una fecha y un día lectivo inicial', () => {
    expect(diaDeFecha(new Date(2026, 9, 13))).toBe('MARTES');
    expect(diaDeFecha(new Date(2026, 9, 11))).toBe('DOMINGO');
    expect(diaLectivoInicial(new Date(2026, 9, 13))).toBe('MARTES');
    expect(diaLectivoInicial(new Date(2026, 9, 11))).toBe('LUNES');
  });

  it('clasifica una clase como próxima, en curso o finalizada', () => {
    const clase = { horaInicio: '10:00', horaFin: '12:00' };
    expect(estadoDeClase(clase, 599)).toBe('PROXIMA');
    expect(estadoDeClase(clase, 600)).toBe('EN_CURSO');
    expect(estadoDeClase(clase, 719)).toBe('EN_CURSO');
    expect(estadoDeClase(clase, 720)).toBe('FINALIZADA');
  });

  it('calcula la posición del bloque dentro de la franja de 08:00 a 22:00', () => {
    const { top, height } = posicionBloque('14:00', '16:00');
    expect(top).toBeCloseTo((360 / 840) * 100);
    expect(height).toBeCloseTo((120 / 840) * 100);

    const recortado = posicionBloque('07:00', '09:00');
    expect(recortado.top).toBe(0);
    expect(recortado.height).toBeCloseTo((60 / 840) * 100);
  });

  it('ordena las sesiones por hora sin modificar la lista original', () => {
    const original = [sesion('B', '10:00'), sesion('A', '10:00'), sesion('C', '08:00')];
    const ordenadas = ordenarSesiones(original);

    expect(ordenadas.map((s) => s.codigoCurso)).toEqual(['C', 'A', 'B']);
    expect(original.map((s) => s.codigoCurso)).toEqual(['B', 'A', 'C']);
  });

  it('resume la ubicación y decide qué estado de asignación destacar', () => {
    expect(resumenUbicacion([])).toBe('Por asignar');
    expect(resumenUbicacion([LABORATORIO])).toBe('Lab. L-204');

    expect(estadoAMostrar('VIGENTE', 2)).toBeNull();
    expect(estadoAMostrar('VIGENTE', 0)).toBe('PENDIENTE');
    expect(estadoAMostrar('ESCALADA', 1)).toBe('ESCALADA');
  });

  it('asigna colores estables a los cursos, sin importar el orden ni los repetidos', () => {
    const a = asignarColoresCursos(['MA-201', 'CC-101', 'MA-201']);
    const b = asignarColoresCursos(['CC-101', 'MA-201']);

    expect(a).toEqual(b);
    expect(a['CC-101']).toBe(PALETA_CURSOS[0]);
    expect(a['MA-201']).toBe(PALETA_CURSOS[1]);
  });

  it('reúne todas las sesiones del horario de ejemplo', () => {
    expect(todasLasSesiones(HORARIO_FIXTURE)).toHaveLength(11);
  });
});

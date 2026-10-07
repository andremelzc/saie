import { DiaSemana } from '@prisma/client';
import {
  agruparPorDia,
  diaYMinutosEnLima,
  normalizarDia,
  proximaSesion,
} from '../../../src/lib/horario';
import { SesionDTO } from '../../../src/types/portal';

// Lima es UTC-5 todo el año (sin horario de verano).
const lima = (iso: string) => new Date(`${iso}-05:00`);

function sesion(dia: DiaSemana, inicio: string, fin: string, curso = 'C1'): SesionDTO {
  return {
    seccionId: 's',
    codigoCurso: curso,
    nombreCurso: curso,
    codigoSeccion: '1',
    docenteNombre: null,
    diaSemana: dia,
    horaInicio: inicio,
    horaFin: fin,
    espacios: [],
    estadoAsignacion: 'PENDIENTE',
  };
}

describe('normalizarDia', () => {
  it('acepta mayúsculas, minúsculas y tildes', () => {
    expect(normalizarDia('miércoles')).toBe('MIERCOLES');
    expect(normalizarDia(' LUNES ')).toBe('LUNES');
    expect(normalizarDia('Sabado')).toBe('SABADO');
  });

  it('devuelve null para valores inválidos', () => {
    expect(normalizarDia('someday')).toBeNull();
    expect(normalizarDia('')).toBeNull();
  });
});

describe('diaYMinutosEnLima', () => {
  it('usa la hora de Lima aunque el servidor esté en UTC', () => {
    // 2026-03-02 es lunes. 22:30 en Lima = 03:30 UTC del martes.
    expect(diaYMinutosEnLima(new Date('2026-03-03T03:30:00Z'))).toEqual({
      dia: 'LUNES',
      minutos: 22 * 60 + 30,
    });
  });
});

describe('agruparPorDia', () => {
  const sesiones = [
    sesion('LUNES', '10:00', '12:00', 'B'),
    sesion('LUNES', '08:00', '10:00', 'A'),
    sesion('MIERCOLES', '14:00', '16:00'),
  ];

  it('semana completa: ordena por hora y deja los días sin clases como lista vacía', () => {
    const semana = agruparPorDia(sesiones);
    expect(semana.LUNES?.map((s) => s.horaInicio)).toEqual(['08:00', '10:00']);
    expect(semana.MARTES).toEqual([]);
    expect(semana.MIERCOLES).toHaveLength(1);
    expect(Object.keys(semana)).toEqual([
      'LUNES',
      'MARTES',
      'MIERCOLES',
      'JUEVES',
      'VIERNES',
      'SABADO',
    ]);
  });

  it('vista por día: devuelve solo ese día', () => {
    expect(Object.keys(agruparPorDia(sesiones, 'MIERCOLES'))).toEqual(['MIERCOLES']);
  });

  it('el domingo solo aparece si hay clases', () => {
    expect(agruparPorDia(sesiones).DOMINGO).toBeUndefined();
    expect(agruparPorDia([sesion('DOMINGO', '09:00', '11:00')]).DOMINGO).toHaveLength(1);
  });
});

describe('proximaSesion', () => {
  const horarios = [
    { diaSemana: 'LUNES' as DiaSemana, horaInicio: '08:00', horaFin: '10:00' },
    { diaSemana: 'MIERCOLES' as DiaSemana, horaInicio: '14:00', horaFin: '16:00' },
  ];

  it('elige la siguiente sesión del mismo día', () => {
    // Lunes 2026-03-02 07:00
    expect(proximaSesion(horarios, lima('2026-03-02T07:00:00'))).toBe(horarios[0]);
  });

  it('si ya pasó la de hoy, salta a la siguiente de la semana', () => {
    // Lunes 11:00 -> miércoles
    expect(proximaSesion(horarios, lima('2026-03-02T11:00:00'))).toBe(horarios[1]);
  });

  it('una sesión en curso cuenta como la próxima', () => {
    expect(proximaSesion(horarios, lima('2026-03-02T09:00:00'))).toBe(horarios[0]);
  });

  it('una sesión que acaba de terminar ya no cuenta', () => {
    expect(proximaSesion(horarios, lima('2026-03-02T10:00:00'))).toBe(horarios[1]);
  });

  it('después de la última de la semana, vuelve a la primera de la siguiente', () => {
    // Jueves
    expect(proximaSesion(horarios, lima('2026-03-05T12:00:00'))).toBe(horarios[0]);
  });

  it('sin horarios devuelve null', () => {
    expect(proximaSesion([], new Date())).toBeNull();
  });
});

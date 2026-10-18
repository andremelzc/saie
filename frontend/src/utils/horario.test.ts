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
  cuentaRegresiva,
  cursosEnFranja,
  haySolape,
  progresoClase,
  proximoDiaConClases,
  resumenSemana,
  formatearMinutos,
  formatearRango,
  ordenarSesiones,
  posicionBloque,
  resumenUbicacion,
  saludoSegunHora,
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

describe('saludo y cuenta regresiva', () => {
  const sesion = { horaInicio: '10:00', horaFin: '12:00' };

  it('saluda según la hora del día', () => {
    expect(saludoSegunHora(new Date(2026, 9, 19, 8))).toBe('Buenos días');
    expect(saludoSegunHora(new Date(2026, 9, 19, 15))).toBe('Buenas tardes');
    expect(saludoSegunHora(new Date(2026, 9, 19, 20))).toBe('Buenas noches');
  });

  it('formatea minutos como minutos u horas', () => {
    expect(formatearMinutos(35)).toBe('35 min');
    expect(formatearMinutos(60)).toBe('1 h');
    expect(formatearMinutos(80)).toBe('1 h 20 min');
  });

  it('indica cuánto falta para empezar o para terminar', () => {
    expect(cuentaRegresiva(sesion, 9 * 60 + 25)).toBe('Empieza en 35 min');
    expect(cuentaRegresiva(sesion, 11 * 60 + 40)).toBe('Termina en 20 min');
    expect(cuentaRegresiva(sesion, 13 * 60)).toBe('Ya terminó');
  });
});

describe('franjas, resumen y progreso', () => {
  const franjaLunes = { diaSemana: 'LUNES' as const, horaInicio: '08:00', horaFin: '10:00' };

  it('detecta si un bloque se cruza con una franja', () => {
    expect(haySolape({ ...franjaLunes, horaInicio: '09:00', horaFin: '11:00' }, franjaLunes)).toBe(
      true,
    );
    // Rozarse en el borde no cuenta como cruce.
    expect(haySolape({ ...franjaLunes, horaInicio: '10:00', horaFin: '12:00' }, franjaLunes)).toBe(
      false,
    );
    expect(haySolape({ ...franjaLunes, diaSemana: 'MARTES' }, franjaLunes)).toBe(false);
  });

  it('filtra los cursos que tienen clase en la franja (un domingo, ninguno)', () => {
    const cursos = [
      { horarios: [franjaLunes] },
      { horarios: [{ ...franjaLunes, horaInicio: '14:00', horaFin: '16:00' }] },
    ];
    expect(cursosEnFranja(cursos, franjaLunes)).toHaveLength(1);
    expect(cursosEnFranja(cursos, { ...franjaLunes, diaSemana: 'DOMINGO' })).toHaveLength(0);
  });

  it('calcula el avance de una clase entre 0 y 1', () => {
    const sesion = { horaInicio: '10:00', horaFin: '12:00' };
    expect(progresoClase(sesion, 9 * 60)).toBe(0);
    expect(progresoClase(sesion, 11 * 60)).toBe(0.5);
    expect(progresoClase(sesion, 13 * 60)).toBe(1);
  });

  it('resume la semana y busca el próximo día con clases', () => {
    const resumen = resumenSemana(HORARIO_FIXTURE);
    expect(resumen.clases).toBe(todasLasSesiones(HORARIO_FIXTURE).length);
    expect(resumen.minutos).toBeGreaterThan(0);
    const siguiente = proximoDiaConClases(HORARIO_FIXTURE, 'DOMINGO');
    expect(siguiente?.dia).toBeDefined();
    expect(siguiente?.sesiones.length).toBeGreaterThan(0);
    expect(proximoDiaConClases({ periodo: null, vista: 'semana', dias: {} }, 'LUNES')).toBeNull();
  });
});

import { DiaSemana, EstadoAsignacion, TipoEspacio } from '@prisma/client';
import { EspacioConexo } from '../../../src/rules/buscarBloqueContiguo';
import { ejecutarCorridaBatch } from '../../../src/rules/corridaBatch';
import { calcularHuellaEntradaSeccion } from '../../../src/rules/orquestadorAsignacion';
import { AsignacionExistenteContexto, SeccionInputMotor } from '../../../src/types/asignacion';
import {
  cambioPorReorganizacion,
  compararReorganizacion,
} from '../../../src/services/motor.service';

/**
 * Issue 2.26 (R9): «Reorganizar con prioridad». Hay una sola aula a esa hora: la tiene la sección A
 * y la sección B está escalada. La corrida normal conserva A; la reorganización atiende primero a B.
 */

const AULA: EspacioConexo = {
  id: 'aula-101',
  identificador: 'Aula 101',
  pabellon: 'Pab-A',
  piso: 1,
  tipo: TipoEspacio.AULA_TEORICA,
  aforoNominal: 30,
  pcsMalogradas: null,
};

const horario = [{ diaSemana: DiaSemana.LUNES, horaInicio: '08:00', horaFin: '10:00' }];

const seccion = (id: string, alumnos: number): SeccionInputMotor => ({
  id,
  cursoId: `cur-${id}`,
  codigoSeccion: id,
  periodo: '2026-2',
  tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
  alumnosMatriculados: alumnos,
  horarios: horario,
});

const A = seccion('A', 28);
const B = seccion('B', 20);

const previas: AsignacionExistenteContexto[] = [
  {
    id: 'asig-A',
    seccionId: 'A',
    estado: EstadoAsignacion.VIGENTE,
    espacioIds: ['aula-101'],
    horarios: horario,
    huellaEntrada: calcularHuellaEntradaSeccion(A),
  },
  {
    id: 'asig-B',
    seccionId: 'B',
    estado: EstadoAsignacion.ESCALADA,
    espacioIds: [],
    horarios: horario,
    huellaEntrada: calcularHuellaEntradaSeccion(B),
  },
];

const correr = (priorizarEscaladas?: boolean) =>
  ejecutarCorridaBatch({
    periodo: '2026-2',
    secciones: [A, B],
    todosLosEspacios: [AULA],
    obtenerVecinosContiguos: () => [],
    asignacionesPrevias: previas,
    priorizarEscaladas,
  });

const resultadoDe = (r: ReturnType<typeof correr>, id: string) =>
  r.resultados.find((x) => x.seccionId === id)!;

describe('ejecutarCorridaBatch con priorizarEscaladas (Issue 2.26)', () => {
  it('sin la opción, conserva el aula de A y B sigue escalada', () => {
    const r = correr();
    expect(resultadoDe(r, 'A')).toMatchObject({
      estado: EstadoAsignacion.VIGENTE,
      conservadaPorIdempotencia: true,
    });
    expect(resultadoDe(r, 'B').estado).toBe(EstadoAsignacion.ESCALADA);
  });

  it('con la opción, B (escalada) se procesa primero y toma el aula; A queda escalada', () => {
    const r = correr(true);
    expect(r.resultados[0].seccionId).toBe('B');
    expect(resultadoDe(r, 'B')).toMatchObject({
      estado: EstadoAsignacion.VIGENTE,
      espacioIds: ['aula-101'],
    });
    expect(resultadoDe(r, 'A').estado).toBe(EstadoAsignacion.ESCALADA);
    expect(r.conservadas).toBe(0);
  });

  it('compararReorganizacion cuenta las escaladas que consiguen aula y las que la pierden', () => {
    expect(compararReorganizacion(previas, correr(true).resultados)).toEqual({
      totalEscaladas: 1,
      escaladasConAula: 1,
      cambianDeAula: 0,
      pierdenAula: 1,
    });
  });
});

describe('compararReorganizacion (Issue 2.26)', () => {
  it('cuenta los cambios entre aulas e ignora las secciones sin asignación previa', () => {
    const vigente = (seccionId: string, espacioIds: string[]): AsignacionExistenteContexto => ({
      id: `asig-${seccionId}`,
      seccionId,
      estado: EstadoAsignacion.VIGENTE,
      espacioIds,
      horarios: horario,
    });
    const resultado = (seccionId: string, espacioIds: string[]) => ({
      seccionId,
      codigoSeccion: seccionId,
      cursoId: 'c',
      estado: EstadoAsignacion.VIGENTE,
      espacioIds,
    });

    expect(
      compararReorganizacion(
        [vigente('X', ['a1']), vigente('Y', ['a2'])],
        [resultado('X', ['a3']), resultado('Y', ['a2']), resultado('Z', ['a4'])],
      ),
    ).toEqual({ totalEscaladas: 0, escaladasConAula: 0, cambianDeAula: 1, pierdenAula: 0 });
  });
});

describe('cambioPorReorganizacion (Issue 2.26)', () => {
  it('avisa a la escalada que consigue aula', () => {
    expect(
      cambioPorReorganizacion(
        { estado: EstadoAsignacion.ESCALADA, espacioIds: [] },
        EstadoAsignacion.VIGENTE,
        ['a1'],
      ),
    ).toEqual({ anteriores: [], nuevos: ['a1'] });
  });

  it('avisa a la sección que pierde su aula', () => {
    expect(
      cambioPorReorganizacion(
        { estado: EstadoAsignacion.VIGENTE, espacioIds: ['a1'] },
        EstadoAsignacion.ESCALADA,
        [],
      ),
    ).toEqual({ anteriores: ['a1'], nuevos: [] });
  });

  it('sin previa o sin cambio de estado no hay aviso adicional', () => {
    expect(cambioPorReorganizacion(undefined, EstadoAsignacion.VIGENTE, ['a1'])).toBeNull();
    expect(
      cambioPorReorganizacion(
        { estado: EstadoAsignacion.VIGENTE, espacioIds: ['a1'] },
        EstadoAsignacion.VIGENTE,
        ['a2'],
      ),
    ).toBeNull();
  });
});

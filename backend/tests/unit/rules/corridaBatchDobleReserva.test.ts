import { DiaSemana, EstadoAsignacion, TipoEspacio } from '@prisma/client';
import { EspacioConexo } from '../../../src/rules/buscarBloqueContiguo';
import {
  DobleReservaError,
  detectarDobleReserva,
  ejecutarCorridaBatch,
} from '../../../src/rules/corridaBatch';
import {
  calcularHuellaEntradaSeccion,
  orquestarAsignacionSeccion,
} from '../../../src/rules/orquestadorAsignacion';
import {
  AsignacionExistenteContexto,
  ResultadoOrquestacion,
  SeccionInputMotor,
} from '../../../src/types/asignacion';

const LUNES_8_10 = [{ diaSemana: DiaSemana.LUNES, horaInicio: '08:00', horaFin: '10:00' }];
const LUNES_10_12 = [{ diaSemana: DiaSemana.LUNES, horaInicio: '10:00', horaFin: '12:00' }];

function aula(id: string, aforo: number, piso = 1): EspacioConexo {
  return {
    id,
    identificador: id,
    tipo: TipoEspacio.AULA_TEORICA,
    pabellon: 'P',
    piso,
    aforoNominal: aforo,
    pcsMalogradas: null,
    softwareInstalado: [],
  };
}

function seccion(id: string, alumnos: number, horarios = LUNES_8_10): SeccionInputMotor {
  return {
    id,
    cursoId: `curso-${id}`,
    codigoSeccion: id,
    periodo: '2026-2',
    tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
    alumnosMatriculados: alumnos,
    movilidadReducida: false,
    softwareRequerido: [],
    horarios,
  };
}

function previa(
  seccionId: string,
  espacioIds: string[],
  huellaEntrada: string,
): AsignacionExistenteContexto {
  return {
    id: `prev-${seccionId}`,
    seccionId,
    estado: EstadoAsignacion.VIGENTE,
    espacioIds,
    horarios: LUNES_8_10,
    huellaEntrada,
  };
}

describe('Corrida batch sin dobles reservas (Issue 2.20, riesgo R1)', () => {
  it('una sección que cambió no toma el aula que conserva otra sección procesada después', () => {
    // S1 (45 alumnos) cambió y se procesa primero por ser más grande; S2 (30) no cambió y
    // conserva el aula A. Antes S1 veía libre el aula A y ambas quedaban en ella.
    const s1 = seccion('S1', 45);
    const s2 = seccion('S2', 30);

    const resultado = ejecutarCorridaBatch({
      periodo: '2026-2',
      secciones: [s1, s2],
      todosLosEspacios: [aula('A', 50), aula('B', 40)],
      obtenerVecinosContiguos: () => [],
      asignacionesPrevias: [
        previa('S1', ['B'], 'huella-anterior'),
        previa('S2', ['A'], calcularHuellaEntradaSeccion(s2)),
      ],
    });

    const r1 = resultado.resultados.find((r) => r.seccionId === 'S1')!;
    const r2 = resultado.resultados.find((r) => r.seccionId === 'S2')!;
    expect(r2.estado).toBe(EstadoAsignacion.VIGENTE);
    expect(r2.espacioIds).toEqual(['A']);
    expect(r2.conservadaPorIdempotencia).toBe(true);
    expect(r1.espacioIds).not.toContain('A');
    expect(r1.estado).toBe(EstadoAsignacion.ESCALADA);
    expect(detectarDobleReserva(resultado.resultados, [s1, s2])).toEqual([]);
  });

  it('las conservadas cuentan como paralelas desde el inicio de la corrida', () => {
    const s1 = { ...seccion('S1', 20), cursoId: 'curso-comun' };
    const s2 = { ...seccion('S2', 20, LUNES_10_12), cursoId: 'curso-comun' };

    const resultado = ejecutarCorridaBatch({
      periodo: '2026-2',
      secciones: [s1, s2],
      todosLosEspacios: [aula('A', 25, 2), aula('B', 25, 1)],
      obtenerVecinosContiguos: () => [],
      asignacionesPrevias: [
        previa('S1', ['B'], 'huella-anterior'),
        { ...previa('S2', ['A'], calcularHuellaEntradaSeccion(s2)), horarios: LUNES_10_12 },
      ],
    });

    // S1 se reasigna y prefiere el piso de su paralela conservada (A, piso 2).
    expect(resultado.resultados.find((r) => r.seccionId === 'S1')!.espacioIds).toEqual(['A']);
  });

  describe('detectarDobleReserva', () => {
    const vigente = (seccionId: string, espacioIds: string[]): ResultadoOrquestacion => ({
      seccionId,
      codigoSeccion: seccionId,
      cursoId: `curso-${seccionId}`,
      estado: EstadoAsignacion.VIGENTE,
      espacioIds,
      huellaEntrada: 'h',
    });

    it('detecta dos asignaciones vigentes en el mismo espacio y franja', () => {
      const conflictos = detectarDobleReserva(
        [vigente('S1', ['A']), vigente('S2', ['A', 'B'])],
        [seccion('S1', 10), seccion('S2', 10)],
      );
      expect(conflictos).toEqual([{ espacioId: 'A', seccionIdA: 'S1', seccionIdB: 'S2' }]);
    });

    it('no es conflicto compartir espacio en franjas que no se solapan', () => {
      const conflictos = detectarDobleReserva(
        [vigente('S1', ['A']), vigente('S2', ['A'])],
        [seccion('S1', 10), seccion('S2', 10, LUNES_10_12)],
      );
      expect(conflictos).toEqual([]);
    });

    it('ignora las secciones escaladas', () => {
      const conflictos = detectarDobleReserva(
        [vigente('S1', ['A']), { ...vigente('S2', ['A']), estado: EstadoAsignacion.ESCALADA }],
        [seccion('S1', 10), seccion('S2', 10)],
      );
      expect(conflictos).toEqual([]);
    });

    it('trata como vacíos los horarios de una sección que no está en la lista', () => {
      const conflictos = detectarDobleReserva(
        [vigente('S1', ['A']), vigente('S2', ['A'])],
        [seccion('S1', 10)],
      );
      expect(conflictos).toEqual([]);
    });
  });

  describe('DobleReservaError', () => {
    it('responde 409 y describe cada conflicto', () => {
      const error = new DobleReservaError([{ espacioId: 'A', seccionIdA: 'S1', seccionIdB: 'S2' }]);
      expect(error.status).toBe(409);
      expect(error.name).toBe('DobleReservaError');
      expect(error.message).toContain('1 doble(s) reserva(s)');
      expect(error.errors).toEqual(['Espacio A: secciones S1 y S2 a la misma hora']);
    });
  });
});

describe('Aulas de menor a mayor (Issue 2.21, riesgo R2)', () => {
  const paralelaPiso1 = [
    { seccionId: 'p', codigoSeccion: '1', espacios: [{ pabellon: 'P', piso: 1 }] },
  ];

  const elegir = (espacios: EspacioConexo[]) =>
    orquestarAsignacionSeccion({
      seccion: seccion('S', 20),
      todosLosEspacios: espacios,
      asignacionesVigentes: [],
      obtenerVecinosContiguos: () => [],
      paralelasAsignadas: paralelaPiso1,
    }).espacioIds;

  it('prefiere el aula justa aunque otra más grande esté más cerca de la paralela', () => {
    expect(elegir([aula('AUDITORIO-200', 200, 1), aula('AULA-25', 25, 2)])).toEqual(['AULA-25']);
  });

  it('entre aulas de tamaño parecido decide la cercanía con la paralela', () => {
    expect(elegir([aula('AULA-28', 28, 1), aula('AULA-25', 25, 2)])).toEqual(['AULA-28']);
  });

  it('a igual tramo y cercanía gana el menor desperdicio exacto', () => {
    expect(elegir([aula('AULA-28', 28, 1), aula('AULA-21', 21, 1)])).toEqual(['AULA-21']);
  });
});

import { DiaSemana, EstadoAsignacion, TipoEspacio } from '@prisma/client';
import { listaSoftwareInstalado, listaSoftwareRequerido } from '../../helpers/software';
import { EspacioConexo } from '../../../src/rules/buscarBloqueContiguo';
import { ejecutarCorridaBatch } from '../../../src/rules/corridaBatch';
import {
  calcularHuellaEntradaSeccion,
  espaciosSiguenSirviendo,
  orquestarAsignacionSeccion,
  puedeConservarse,
} from '../../../src/rules/orquestadorAsignacion';
import { AsignacionExistenteContexto, SeccionInputMotor } from '../../../src/types/asignacion';

const HORARIO = [{ diaSemana: DiaSemana.JUEVES, horaInicio: '20:00', horaFin: '22:00' }];

function lab(id: string, overrides: Partial<EspacioConexo> = {}): EspacioConexo {
  return {
    id,
    identificador: id,
    tipo: TipoEspacio.LABORATORIO,
    pabellon: 'Nuevo Pabellón',
    piso: 2,
    aforoNominal: 21,
    pcsMalogradas: 0,
    softwareInstalado: listaSoftwareInstalado(['Python 3.12']),
    ...overrides,
  };
}

function seccionLab(alumnos: number, software: string[] = []): SeccionInputMotor {
  return {
    id: 'sec-2-lab',
    cursoId: 'curso-805',
    codigoSeccion: '2-LAB',
    periodo: '2026-2',
    tipoEspacioRequerido: TipoEspacio.LABORATORIO,
    alumnosMatriculados: alumnos,
    movilidadReducida: false,
    softwareRequerido: listaSoftwareRequerido(software),
    horarios: HORARIO,
  };
}

function previa(seccion: SeccionInputMotor, espacioIds: string[]): AsignacionExistenteContexto {
  return {
    id: 'prev',
    seccionId: seccion.id,
    estado: EstadoAsignacion.VIGENTE,
    espacioIds,
    horarios: HORARIO,
    huellaEntrada: calcularHuellaEntradaSeccion(seccion),
  };
}

describe('El motor no conserva espacios que dejaron de servir (Issue 2.22, riesgo R3)', () => {
  const bloqueActual = ['lab-01', 'lab-02', 'lab-03'];

  describe('espaciosSiguenSirviendo', () => {
    it('sirve si los espacios existen, alcanzan y tienen el software', () => {
      const espacios = [lab('lab-01'), lab('lab-02'), lab('lab-03')];
      expect(espaciosSiguenSirviendo(seccionLab(61, ['Python']), bloqueActual, espacios)).toBe(
        true,
      );
    });

    it('no sirve si las PCs malogradas bajan la capacidad por debajo de los alumnos', () => {
      const espacios = [lab('lab-01', { pcsMalogradas: 3 }), lab('lab-02'), lab('lab-03')];
      expect(espaciosSiguenSirviendo(seccionLab(61), bloqueActual, espacios)).toBe(false);
    });

    it('no sirve si uno de los espacios fue deshabilitado (ya no está entre los disponibles)', () => {
      expect(
        espaciosSiguenSirviendo(seccionLab(40), bloqueActual, [lab('lab-01'), lab('lab-02')]),
      ).toBe(false);
    });

    it('no sirve si falta el software requerido', () => {
      const espacios = [lab('lab-01'), lab('lab-02'), lab('lab-03')];
      expect(espaciosSiguenSirviendo(seccionLab(61, ['Docker']), bloqueActual, espacios)).toBe(
        false,
      );
    });

    it('no sirve si el espacio cambió de tipo', () => {
      const espacios = [lab('lab-01', { tipo: TipoEspacio.AULA_TEORICA })];
      expect(espaciosSiguenSirviendo(seccionLab(10), ['lab-01'], espacios)).toBe(false);
    });

    it('no sirve una asignación sin espacios', () => {
      expect(espaciosSiguenSirviendo(seccionLab(10), [], [lab('lab-01')])).toBe(false);
    });

    it('en un aula teórica no revisa software', () => {
      const aula = lab('aula-1', { tipo: TipoEspacio.AULA_TEORICA, aforoNominal: 40 });
      const seccion = {
        ...seccionLab(30, ['Docker']),
        tipoEspacioRequerido: TipoEspacio.AULA_TEORICA,
      };
      expect(espaciosSiguenSirviendo(seccion, ['aula-1'], [aula])).toBe(true);
    });
  });

  describe('puedeConservarse', () => {
    it('no conserva una asignación escalada ni una sin previa', () => {
      const s = seccionLab(10);
      expect(puedeConservarse(s, null, [lab('lab-01')])).toBe(false);
      expect(
        puedeConservarse(s, { ...previa(s, ['lab-01']), estado: EstadoAsignacion.ESCALADA }, [
          lab('lab-01'),
        ]),
      ).toBe(false);
    });

    it('no conserva si los datos de la sección cambiaron', () => {
      const s = seccionLab(10);
      expect(
        puedeConservarse(s, { ...previa(s, ['lab-01']), huellaEntrada: 'otra' }, [lab('lab-01')]),
      ).toBe(false);
    });
  });

  it('reasignar una sección mueve el bloque cuyo laboratorio perdió capacidad', () => {
    const s = seccionLab(61);
    const espacios = [
      lab('lab-01', { pcsMalogradas: 3 }),
      lab('lab-02'),
      lab('lab-03'),
      lab('lab-04'),
    ];
    const vecinos: Record<string, string[]> = {
      'lab-01': ['lab-02'],
      'lab-02': ['lab-01', 'lab-03'],
      'lab-03': ['lab-02', 'lab-04'],
      'lab-04': ['lab-03'],
    };

    const resultado = orquestarAsignacionSeccion({
      seccion: s,
      todosLosEspacios: espacios,
      asignacionesVigentes: [],
      obtenerVecinosContiguos: (id) => vecinos[id] ?? [],
      asignacionPrevia: previa(s, bloqueActual),
    });

    expect(resultado.conservadaPorIdempotencia).toBeUndefined();
    expect(resultado.estado).toBe(EstadoAsignacion.VIGENTE);
    expect(resultado.espacioIds.sort()).toEqual(['lab-02', 'lab-03', 'lab-04']);
  });

  it('la corrida completa tampoco conserva un bloque con un laboratorio deshabilitado', () => {
    const s = seccionLab(40);
    const resultado = ejecutarCorridaBatch({
      periodo: '2026-2',
      secciones: [s],
      todosLosEspacios: [lab('lab-02'), lab('lab-03')],
      obtenerVecinosContiguos: (id) => (id === 'lab-02' ? ['lab-03'] : ['lab-02']),
      asignacionesPrevias: [previa(s, ['lab-01', 'lab-02'])],
    });

    const r = resultado.resultados[0];
    expect(r.conservadaPorIdempotencia).toBeUndefined();
    expect(r.espacioIds.sort()).toEqual(['lab-02', 'lab-03']);
  });
});

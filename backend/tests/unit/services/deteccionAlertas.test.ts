import { TipoEspacio } from '@prisma/client';
import {
  AsignacionVigenteConEspacios,
  detectarCapacidadInsuficiente,
  detectarIncompatibilidadesSoftware,
  evaluarCapacidadInsuficiente,
  evaluarIncompatibilidadSoftware,
} from '../../../src/services/deteccionAlertas.service';

function lab(id: string, aforo: number, software: string[], pcs: number | null = 0) {
  return {
    id,
    identificador: `Lab ${id}`,
    tipo: TipoEspacio.LABORATORIO,
    pabellon: 'A',
    piso: 1,
    aforoNominal: aforo,
    pcsMalogradas: pcs,
    softwareInstalado: software,
  };
}

function aula(id: string, aforo: number) {
  return {
    id,
    identificador: `Aula ${id}`,
    tipo: TipoEspacio.AULA_TEORICA,
    pabellon: 'A',
    piso: 2,
    aforoNominal: aforo,
    pcsMalogradas: null,
    softwareInstalado: [] as string[],
  };
}

function asignacion(
  id: string,
  espacios: AsignacionVigenteConEspacios['espacios'],
  extra: Partial<AsignacionVigenteConEspacios> = {},
): AsignacionVigenteConEspacios {
  return {
    id,
    seccionId: `sec-${id}`,
    codigoSeccion: '1',
    codigoCurso: `CUR-${id}`,
    nombreCurso: `Curso ${id}`,
    stackSoftwareRequerido: [],
    alumnosMatriculados: 20,
    espacios,
    ...extra,
  };
}

describe('Detección de incompatibilidad de software (Issue 4.3)', () => {
  it('devuelve las asignaciones que ya no cumplen el stack con el nuevo software', () => {
    const asignaciones = [
      asignacion('a1', [lab('L1', 30, ['Python', 'Git'])], {
        stackSoftwareRequerido: ['Python', 'Docker'],
      }),
    ];

    const afectadas = detectarIncompatibilidadesSoftware('L1', ['Python', 'Git'], asignaciones);

    expect(afectadas).toHaveLength(1);
    expect(afectadas[0]).toMatchObject({ asignacionId: 'a1', codigoCurso: 'CUR-a1' });
    expect(afectadas[0].detalle).toContain('Docker');
  });

  it('no devuelve nada si el nuevo software sigue cubriendo el stack', () => {
    const asignaciones = [
      asignacion('a1', [lab('L1', 30, [])], { stackSoftwareRequerido: ['python'] }),
    ];
    expect(detectarIncompatibilidadesSoftware('L1', ['Python'], asignaciones)).toEqual([]);
  });

  it('usa el software nuevo y no el guardado: la detección no depende de haber persistido', () => {
    const asignaciones = [
      asignacion('a1', [lab('L1', 30, ['Docker'])], { stackSoftwareRequerido: ['Docker'] }),
    ];
    expect(detectarIncompatibilidadesSoftware('L1', ['Docker'], asignaciones)).toEqual([]);
    expect(detectarIncompatibilidadesSoftware('L1', [], asignaciones)).toHaveLength(1);
  });

  it('laboratorio sin asignaciones vigentes: lista vacía', () => {
    expect(detectarIncompatibilidadesSoftware('L1', [], [])).toEqual([]);
  });

  it('ignora asignaciones que no usan el laboratorio modificado', () => {
    const asignaciones = [
      asignacion('a1', [lab('L2', 30, [])], { stackSoftwareRequerido: ['Docker'] }),
    ];
    expect(detectarIncompatibilidadesSoftware('L1', [], asignaciones)).toEqual([]);
  });

  it('bloque de varios laboratorios: solo alerta si falla el laboratorio que cambió', () => {
    const bloque = asignacion('a1', [lab('L1', 20, ['Docker']), lab('L2', 20, ['Docker'])], {
      stackSoftwareRequerido: ['Docker'],
    });

    // Cambia L1 y pierde Docker: afecta; L2 sigue bien.
    const cambiaL1 = detectarIncompatibilidadesSoftware('L1', [], [bloque]);
    expect(cambiaL1).toHaveLength(1);
    expect(cambiaL1[0].detalle).toContain('Lab L1');
    expect(cambiaL1[0].detalle).not.toContain('Lab L2');

    // Cambia L1 pero conserva Docker: no afecta aunque el bloque tenga otro lab.
    expect(detectarIncompatibilidadesSoftware('L1', ['Docker'], [bloque])).toEqual([]);
  });

  it('un bloque con otro laboratorio ya incompleto no se culpa al laboratorio que cambió', () => {
    const bloque = asignacion('a1', [lab('L1', 20, ['Docker']), lab('L2', 20, [])], {
      stackSoftwareRequerido: ['Docker'],
    });
    expect(detectarIncompatibilidadesSoftware('L1', ['Docker', 'Git'], [bloque])).toEqual([]);
  });

  it('stack vacío siempre cumple', () => {
    const asignaciones = [asignacion('a1', [lab('L1', 30, ['X'])])];
    expect(detectarIncompatibilidadesSoftware('L1', [], asignaciones)).toEqual([]);
  });

  it('la versión evaluar* consulta solo asignaciones VIGENTES del laboratorio', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    await evaluarIncompatibilidadSoftware('L1', [], { asignacion: { findMany } } as any);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { estado: 'VIGENTE', espacios: { some: { espacioId: 'L1' } } },
      }),
    );
  });
});

describe('Detección de capacidad insuficiente (Issue 4.4)', () => {
  it('laboratorio: más PCs malogradas que el margen deja asignaciones afectadas', () => {
    const asignaciones = [asignacion('a1', [lab('L1', 30, [], 0)], { alumnosMatriculados: 28 })];

    const afectadas = detectarCapacidadInsuficiente('L1', { pcsMalogradas: 5 }, asignaciones);

    expect(afectadas).toHaveLength(1);
    expect(afectadas[0].detalle).toContain('25');
    expect(afectadas[0].detalle).toContain('28');
  });

  it('laboratorio: PCs malogradas dentro del margen no genera alerta', () => {
    const asignaciones = [asignacion('a1', [lab('L1', 30, [], 0)], { alumnosMatriculados: 25 })];
    expect(detectarCapacidadInsuficiente('L1', { pcsMalogradas: 5 }, asignaciones)).toEqual([]);
  });

  it('PCs reparadas: la capacidad sube y no genera alerta', () => {
    const asignaciones = [asignacion('a1', [lab('L1', 30, [], 10)], { alumnosMatriculados: 25 })];
    expect(detectarCapacidadInsuficiente('L1', { pcsMalogradas: 0 }, asignaciones)).toEqual([]);
  });

  it('aula con aforo editado por debajo de los matriculados: afectada', () => {
    const asignaciones = [asignacion('a1', [aula('S1', 40)], { alumnosMatriculados: 35 })];

    const afectadas = detectarCapacidadInsuficiente('S1', { aforoNominal: 30 }, asignaciones);

    expect(afectadas).toHaveLength(1);
    expect(afectadas[0].asignacionId).toBe('a1');
  });

  it('aula: aforo editado que sigue alcanzando no genera alerta', () => {
    const asignaciones = [asignacion('a1', [aula('S1', 40)], { alumnosMatriculados: 35 })];
    expect(detectarCapacidadInsuficiente('S1', { aforoNominal: 36 }, asignaciones)).toEqual([]);
  });

  it('las PCs malogradas no afectan la capacidad de un aula teórica', () => {
    const asignaciones = [asignacion('a1', [aula('S1', 40)], { alumnosMatriculados: 40 })];
    expect(detectarCapacidadInsuficiente('S1', { pcsMalogradas: 30 }, asignaciones)).toEqual([]);
  });

  it('espacio sin asignaciones vigentes: lista vacía', () => {
    expect(detectarCapacidadInsuficiente('S1', { aforoNominal: 1 }, [])).toEqual([]);
  });

  it('bloque de varios espacios: la suma sigue alcanzando, no hay alerta', () => {
    const bloque = asignacion('a1', [aula('S1', 30), aula('S2', 30)], { alumnosMatriculados: 50 });
    // S1 baja a 25: 25 + 30 = 55 >= 50
    expect(detectarCapacidadInsuficiente('S1', { aforoNominal: 25 }, [bloque])).toEqual([]);
    // S1 baja a 10: 10 + 30 = 40 < 50
    expect(detectarCapacidadInsuficiente('S1', { aforoNominal: 10 }, [bloque])).toHaveLength(1);
  });

  it('reutiliza calcularCapacidadReal: la capacidad nunca es negativa', () => {
    const asignaciones = [asignacion('a1', [lab('L1', 10, [], 0)], { alumnosMatriculados: 1 })];
    // 50 malogradas sobre aforo 10 => capacidad 0 (no negativa) => 0 < 1
    expect(detectarCapacidadInsuficiente('L1', { pcsMalogradas: 50 }, asignaciones)).toHaveLength(
      1,
    );
  });

  it('la versión evaluar* carga matrículas y espacios del bloque', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'a1',
        seccionId: 's1',
        seccion: {
          codigoSeccion: '1',
          curso: { codigo: 'C1', nombre: 'Curso 1' },
          stackSoftwareRequerido: [],
          _count: { matriculas: 28 },
        },
        espacios: [{ espacio: lab('L1', 30, [], 0) }],
      },
    ]);

    const afectadas = await evaluarCapacidadInsuficiente('L1', { pcsMalogradas: 5 }, {
      asignacion: { findMany },
    } as any);

    expect(afectadas).toHaveLength(1);
    expect(afectadas[0]).toMatchObject({ codigoCurso: 'C1', codigoSeccion: '1' });
  });
});

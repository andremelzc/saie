import { TipoEspacio } from '@prisma/client';
import {
  calcularPuntajeDistancia,
  evaluarCercaniaParalelas,
  consultarUbicacionesSeccionesParalelas,
  PUNTAJE_CERCANIA_NEUTRO,
  AsignacionParalelaUbicacion,
} from '../../../src/rules/cercaniaParalelas';
import { BloqueCandidato, EspacioConexo } from '../../../src/rules/buscarBloqueContiguo';

// ---------------------------------------------------------------------------
// Helpers de fixtures
// ---------------------------------------------------------------------------

function crearBloqueAula(piso: number, pabellon = 'Pabellon A'): BloqueCandidato {
  const espacio: EspacioConexo = {
    id: `aula-p${piso}`,
    identificador: `Aula ${piso}01`,
    tipo: TipoEspacio.AULA_TEORICA,
    pabellon,
    piso,
    aforoNominal: 40,
  };
  return {
    espacios: [espacio],
    espacioIds: [espacio.id],
    capacidadTotal: 40,
    desperdicio: 0,
    piso,
    pabellon,
    tipo: TipoEspacio.AULA_TEORICA,
  };
}

function crearBloqueLab(piso: number, pabellon = 'Pabellon A'): BloqueCandidato {
  const espacio: EspacioConexo = {
    id: `lab-p${piso}`,
    identificador: `Lab ${piso}01`,
    tipo: TipoEspacio.LABORATORIO,
    pabellon,
    piso,
    aforoNominal: 30,
    softwareInstalado: ['VS Code'],
  };
  return {
    espacios: [espacio],
    espacioIds: [espacio.id],
    capacidadTotal: 30,
    desperdicio: 0,
    piso,
    pabellon,
    tipo: TipoEspacio.LABORATORIO,
  };
}

function crearParalela(
  id: string,
  pabellon: string,
  piso: number,
): AsignacionParalelaUbicacion {
  return {
    seccionId: id,
    codigoSeccion: id,
    espacios: [{ pabellon, piso }],
  };
}

// ---------------------------------------------------------------------------
// Suite principal
// ---------------------------------------------------------------------------

describe('Issue 2.13 / 5.16 — Pruebas de cercanía entre secciones paralelas', () => {
  // -------------------------------------------------------------------------
  // calcularPuntajeDistancia — función auxiliar (tabla de puntuaciones completa)
  // -------------------------------------------------------------------------
  describe('Función auxiliar: calcularPuntajeDistancia', () => {
    test('mismo pabellón y mismo piso otorga la máxima puntuación (100 pts)', () => {
      expect(calcularPuntajeDistancia('Pabellon A', 1, 'Pabellon A', 1)).toBe(100);
      expect(calcularPuntajeDistancia('Pab A', 2, 'pab a ', 2)).toBe(100); // normalización case/trim
    });

    test('mismo pabellón y piso adyacente (|Δpiso| = 1) otorga puntuación intermedia (70 pts)', () => {
      expect(calcularPuntajeDistancia('Pabellon A', 1, 'Pabellon A', 2)).toBe(70);
      expect(calcularPuntajeDistancia('Pabellon A', 3, 'Pabellon A', 2)).toBe(70);
    });

    test('mismo pabellón y piso distante (|Δpiso| ≥ 2) otorga baja puntuación (30 pts)', () => {
      expect(calcularPuntajeDistancia('Pabellon A', 1, 'Pabellon A', 3)).toBe(30);
      expect(calcularPuntajeDistancia('Pabellon A', 1, 'Pabellon A', 4)).toBe(30);
    });

    test('distinto pabellón otorga la mínima puntuación (10 pts), independiente del piso', () => {
      expect(calcularPuntajeDistancia('Pabellon A', 1, 'Pabellon B', 1)).toBe(10);
      expect(calcularPuntajeDistancia('Pabellon A', 1, 'Pabellon B', 2)).toBe(10);
      expect(calcularPuntajeDistancia('Pabellon A', 3, 'Pabellon C', 1)).toBe(10);
    });
  });

  // -------------------------------------------------------------------------
  // evaluarCercaniaParalelas — AULAS TEÓRICAS
  // Plan maestro §1.1: puntuación neutra, mismo piso, piso adyacente, piso no adyacente
  // -------------------------------------------------------------------------
  describe('Función pura: evaluarCercaniaParalelas — Aulas Teóricas', () => {
    const bloquePiso1 = crearBloqueAula(1);

    test('sin secciones paralelas asignadas previamente, retorna puntuación neutra (50 pts)', () => {
      expect(evaluarCercaniaParalelas(bloquePiso1, [])).toBe(PUNTAJE_CERCANIA_NEUTRO);
      expect(evaluarCercaniaParalelas(bloquePiso1, null as any)).toBe(PUNTAJE_CERCANIA_NEUTRO);
    });

    test('sección paralela en el mismo pabellón y piso → 100 pts (máxima cercanía)', () => {
      const paralelas = [crearParalela('sec-2', 'Pabellon A', 1)];
      expect(evaluarCercaniaParalelas(bloquePiso1, paralelas)).toBe(100);
    });

    test('sección paralela en piso adyacente (|Δpiso| = 1) → 70 pts', () => {
      const paralelas = [crearParalela('sec-2', 'Pabellon A', 2)];
      expect(evaluarCercaniaParalelas(bloquePiso1, paralelas)).toBe(70);
    });

    test('sección paralela en piso no adyacente (|Δpiso| ≥ 2) → 30 pts', () => {
      const paralelas = [crearParalela('sec-2', 'Pabellon A', 3)]; // piso 1 vs piso 3 = delta 2
      expect(evaluarCercaniaParalelas(bloquePiso1, paralelas)).toBe(30);
    });

    test('sección paralela en distinto pabellón → 10 pts (mínima cercanía)', () => {
      const paralelas = [crearParalela('sec-2', 'Pabellon B', 1)];
      expect(evaluarCercaniaParalelas(bloquePiso1, paralelas)).toBe(10);
    });

    test('con múltiples secciones paralelas retorna el promedio de cercanía', () => {
      const paralelas: AsignacionParalelaUbicacion[] = [
        crearParalela('sec-2', 'Pabellon A', 1), // 100 pts
        crearParalela('sec-3', 'Pabellon A', 2), // 70 pts
      ];
      // Promedio: (100 + 70) / 2 = 85
      expect(evaluarCercaniaParalelas(bloquePiso1, paralelas)).toBe(85);
    });

    test('sección paralela con lista de espacios vacía se omite del cálculo (retorna neutro)', () => {
      const paralelas: AsignacionParalelaUbicacion[] = [
        {
          seccionId: 'sec-sin-espacios',
          codigoSeccion: '2',
          espacios: [], // <-- branch línea 64 de cercaniaParalelas.ts
        },
      ];
      // No hay ninguna sección válida para calcular → retorna neutro
      expect(evaluarCercaniaParalelas(bloquePiso1, paralelas)).toBe(PUNTAJE_CERCANIA_NEUTRO);
    });

    test('mezcla de secciones con y sin espacios: solo considera las que tienen espacios', () => {
      const paralelas: AsignacionParalelaUbicacion[] = [
        {
          seccionId: 'sec-sin-espacios',
          codigoSeccion: '1',
          espacios: [], // debe ignorarse
        },
        crearParalela('sec-3', 'Pabellon A', 1), // 100 pts
      ];
      expect(evaluarCercaniaParalelas(bloquePiso1, paralelas)).toBe(100);
    });
  });

  // -------------------------------------------------------------------------
  // evaluarCercaniaParalelas — LABORATORIOS
  // Plan maestro §1.1: repetir escenarios para laboratorios
  // -------------------------------------------------------------------------
  describe('Función pura: evaluarCercaniaParalelas — Laboratorios', () => {
    const bloqueLab1 = crearBloqueLab(1); // Lab en Piso 1, Pabellon A

    test('sin secciones paralelas, laboratorio retorna puntuación neutra (50 pts)', () => {
      expect(evaluarCercaniaParalelas(bloqueLab1, [])).toBe(PUNTAJE_CERCANIA_NEUTRO);
    });

    test('laboratorio paralelo en mismo piso → 100 pts', () => {
      const paralelas = [crearParalela('lab-sec-2', 'Pabellon A', 1)];
      expect(evaluarCercaniaParalelas(bloqueLab1, paralelas)).toBe(100);
    });

    test('laboratorio paralelo en piso adyacente (|Δpiso| = 1) → 70 pts', () => {
      const paralelas = [crearParalela('lab-sec-2', 'Pabellon A', 2)];
      expect(evaluarCercaniaParalelas(bloqueLab1, paralelas)).toBe(70);
    });

    test('laboratorio paralelo en piso no adyacente (|Δpiso| ≥ 2) → 30 pts', () => {
      const paralelas = [crearParalela('lab-sec-2', 'Pabellon A', 3)];
      expect(evaluarCercaniaParalelas(bloqueLab1, paralelas)).toBe(30);
    });

    test('laboratorio paralelo en distinto pabellón → 10 pts', () => {
      const paralelas = [crearParalela('lab-sec-2', 'Pabellon B', 1)];
      expect(evaluarCercaniaParalelas(bloqueLab1, paralelas)).toBe(10);
    });

    test('laboratorio con múltiples secciones paralelas: retorna promedio', () => {
      const paralelas: AsignacionParalelaUbicacion[] = [
        crearParalela('lab-2', 'Pabellon A', 2), // 70 pts
        crearParalela('lab-3', 'Pabellon A', 3), // 30 pts
      ];
      // Promedio: (70 + 30) / 2 = 50
      expect(evaluarCercaniaParalelas(bloqueLab1, paralelas)).toBe(50);
    });

    test('laboratorio con sección paralela con espacios vacíos → retorna puntuación neutra', () => {
      const paralelas: AsignacionParalelaUbicacion[] = [
        {
          seccionId: 'lab-sec-sin-espacios',
          codigoSeccion: '2',
          espacios: [],
        },
      ];
      expect(evaluarCercaniaParalelas(bloqueLab1, paralelas)).toBe(PUNTAJE_CERCANIA_NEUTRO);
    });
  });

  // -------------------------------------------------------------------------
  // Issue 5.16: test.each — los 4 escenarios obligatorios del plan maestro §1.1
  // (sin paralelas, mismo piso, piso adyacente, piso no adyacente) × 2 tipos
  // -------------------------------------------------------------------------
  describe('Issue 5.16: test.each — escenarios obligatorios para aulas y laboratorios', () => {
    interface CasoCercania {
      descripcion: string;
      tipo: TipoEspacio;
      paralelas: AsignacionParalelaUbicacion[];
      puntuacionEsperada: number;
    }

    const bloquePiso1Aula = crearBloqueAula(1);
    const bloquePiso1Lab = crearBloqueLab(1);

    const casos: CasoCercania[] = [
      // AULAS
      {
        descripcion: 'AULA — sin secciones paralelas → puntuación neutra (50 pts)',
        tipo: TipoEspacio.AULA_TEORICA,
        paralelas: [],
        puntuacionEsperada: PUNTAJE_CERCANIA_NEUTRO,
      },
      {
        descripcion: 'AULA — sección paralela en mismo piso → 100 pts',
        tipo: TipoEspacio.AULA_TEORICA,
        paralelas: [crearParalela('sec-a', 'Pabellon A', 1)],
        puntuacionEsperada: 100,
      },
      {
        descripcion: 'AULA — sección paralela en piso adyacente → 70 pts',
        tipo: TipoEspacio.AULA_TEORICA,
        paralelas: [crearParalela('sec-a', 'Pabellon A', 2)],
        puntuacionEsperada: 70,
      },
      {
        descripcion: 'AULA — sección paralela en piso no adyacente → 30 pts',
        tipo: TipoEspacio.AULA_TEORICA,
        paralelas: [crearParalela('sec-a', 'Pabellon A', 3)],
        puntuacionEsperada: 30,
      },
      // LABORATORIOS
      {
        descripcion: 'LAB — sin secciones paralelas → puntuación neutra (50 pts)',
        tipo: TipoEspacio.LABORATORIO,
        paralelas: [],
        puntuacionEsperada: PUNTAJE_CERCANIA_NEUTRO,
      },
      {
        descripcion: 'LAB — sección paralela en mismo piso → 100 pts',
        tipo: TipoEspacio.LABORATORIO,
        paralelas: [crearParalela('sec-b', 'Pabellon A', 1)],
        puntuacionEsperada: 100,
      },
      {
        descripcion: 'LAB — sección paralela en piso adyacente → 70 pts',
        tipo: TipoEspacio.LABORATORIO,
        paralelas: [crearParalela('sec-b', 'Pabellon A', 2)],
        puntuacionEsperada: 70,
      },
      {
        descripcion: 'LAB — sección paralela en piso no adyacente → 30 pts',
        tipo: TipoEspacio.LABORATORIO,
        paralelas: [crearParalela('sec-b', 'Pabellon A', 3)],
        puntuacionEsperada: 30,
      },
    ];

    test.each(casos)('$descripcion', ({ tipo, paralelas, puntuacionEsperada }) => {
      const bloque = tipo === TipoEspacio.AULA_TEORICA ? bloquePiso1Aula : bloquePiso1Lab;
      expect(evaluarCercaniaParalelas(bloque, paralelas)).toBe(puntuacionEsperada);
    });
  });

  // -------------------------------------------------------------------------
  // Consulta en Prisma: consultarUbicacionesSeccionesParalelas
  // -------------------------------------------------------------------------
  describe('Consulta en Prisma: consultarUbicacionesSeccionesParalelas', () => {
    test('consulta asignaciones vigentes de otras secciones del mismo curso en el periodo', async () => {
      const mockPrisma = {
        asignacion: {
          findMany: jest.fn().mockResolvedValue([
            {
              seccionId: 'sec-paralela',
              seccion: { codigoSeccion: '2' },
              espacios: [
                {
                  espacio: { pabellon: 'Pabellon A', piso: 1 },
                },
              ],
            },
          ]),
        },
      };

      const resultado = await consultarUbicacionesSeccionesParalelas(
        'curso-mat',
        'sec-1',
        '2026-1',
        mockPrisma as any,
      );

      expect(resultado).toHaveLength(1);
      expect(resultado[0]).toEqual({
        seccionId: 'sec-paralela',
        codigoSeccion: '2',
        espacios: [{ pabellon: 'Pabellon A', piso: 1 }],
      });
      expect(mockPrisma.asignacion.findMany).toHaveBeenCalled();
    });

    test('retorna lista vacía cuando no hay secciones paralelas con asignaciones vigentes', async () => {
      const mockPrisma = {
        asignacion: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      };

      const resultado = await consultarUbicacionesSeccionesParalelas(
        'curso-xyz',
        'sec-unica',
        '2026-1',
        mockPrisma as any,
      );

      expect(resultado).toHaveLength(0);
      expect(mockPrisma.asignacion.findMany).toHaveBeenCalled();
    });
  });
});

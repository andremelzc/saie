import { TipoEspacio } from '@prisma/client';
import {
  detectarMovilidadReducida,
  consultarMovilidadReducidaPorSeccionId,
  priorizarBloquesPiso1,
} from '../../../src/rules/accesibilidad';
import { BloqueCandidato, EspacioConexo } from '../../../src/rules/buscarBloqueContiguo';

// ---------------------------------------------------------------------------
// Helpers de fixtures
// ---------------------------------------------------------------------------

function crearEspacioAula(id: string, identificador: string, piso: number): EspacioConexo {
  return {
    id,
    identificador,
    tipo: TipoEspacio.AULA_TEORICA,
    pabellon: 'Pab A',
    piso,
    aforoNominal: 40,
  };
}

function crearEspacioLab(id: string, identificador: string, piso: number): EspacioConexo {
  return {
    id,
    identificador,
    tipo: TipoEspacio.LABORATORIO,
    pabellon: 'Pab A',
    piso,
    aforoNominal: 30,
    softwareInstalado: ['VS Code'],
  };
}

function crearBloqueAula(espacio: EspacioConexo, desperdicio = 0): BloqueCandidato {
  return {
    espacios: [espacio],
    espacioIds: [espacio.id],
    capacidadTotal: espacio.aforoNominal,
    desperdicio,
    piso: espacio.piso,
    pabellon: espacio.pabellon,
    tipo: TipoEspacio.AULA_TEORICA,
  };
}

function crearBloqueLab(espacio: EspacioConexo, desperdicio = 0): BloqueCandidato {
  return {
    espacios: [espacio],
    espacioIds: [espacio.id],
    capacidadTotal: espacio.aforoNominal,
    desperdicio,
    piso: espacio.piso,
    pabellon: espacio.pabellon,
    tipo: TipoEspacio.LABORATORIO,
  };
}

// ---------------------------------------------------------------------------
// Suite principal
// ---------------------------------------------------------------------------

describe('Issue 2.8, 2.9 / 5.6 — Accesibilidad y Priorización de Piso 1', () => {
  // -------------------------------------------------------------------------
  // Issue 2.8: detectarMovilidadReducida
  // -------------------------------------------------------------------------
  describe('Issue 2.8: detectarMovilidadReducida', () => {
    test('devuelve true si al menos un alumno del grupo tiene el flag activo en su matrícula', () => {
      const matriculas = [
        { movilidadReducida: false },
        { movilidadReducida: true },
        { movilidadReducida: false },
      ];

      expect(detectarMovilidadReducida(matriculas)).toBe(true);
    });

    test('devuelve false si ningún alumno del grupo tiene el flag activo', () => {
      const matriculas = [{ movilidadReducida: false }, { movilidadReducida: false }];

      expect(detectarMovilidadReducida(matriculas)).toBe(false);
    });

    test('devuelve false con lista vacía, nula o indefinida', () => {
      expect(detectarMovilidadReducida([])).toBe(false);
      expect(detectarMovilidadReducida(null)).toBe(false);
      expect(detectarMovilidadReducida(undefined)).toBe(false);
    });

    test('consultarMovilidadReducidaPorSeccionId consulta Prisma correctamente', async () => {
      const mockPrisma = {
        matricula: {
          findFirst: jest.fn().mockResolvedValue({ id: 'mat-1', movilidadReducida: true }),
        },
      };

      const resultado = await consultarMovilidadReducidaPorSeccionId('sec-123', mockPrisma as any);
      expect(resultado).toBe(true);
      expect(mockPrisma.matricula.findFirst).toHaveBeenCalledWith({
        where: { seccionId: 'sec-123', movilidadReducida: true },
      });
    });

    test('consultarMovilidadReducidaPorSeccionId retorna false si Prisma no encuentra registros', async () => {
      const mockPrisma = {
        matricula: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      };

      const resultado = await consultarMovilidadReducidaPorSeccionId('sec-456', mockPrisma as any);
      expect(resultado).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Issue 2.9: priorizarBloquesPiso1 — AULAS TEÓRICAS
  // Plan maestro §1.1: los 3 escenarios obligatorios para aulas
  // -------------------------------------------------------------------------
  describe('Issue 2.9 / 5.6: priorizarBloquesPiso1 — Aulas Teóricas', () => {
    // Fixtures de aulas
    const aulaPiso2 = crearBloqueAula(crearEspacioAula('a201', 'Aula 201', 2));
    const aulaPiso3 = crearBloqueAula(crearEspacioAula('a301', 'Aula 301', 3));
    const aulaPiso1A = crearBloqueAula(crearEspacioAula('a101', 'Aula 101', 1), 2);
    const aulaPiso1B = crearBloqueAula(crearEspacioAula('a102', 'Aula 102', 1), 5);

    test('sin flag de movilidad reducida no altera el orden de los bloques candidatos de aulas', () => {
      const bloquesOriginales = [aulaPiso2, aulaPiso1A, aulaPiso3];
      const resultado = priorizarBloquesPiso1(bloquesOriginales, false);

      expect(resultado.bloques).toEqual(bloquesOriginales);
      expect(resultado.fallbackAplicado).toBe(false);
    });

    test('con flag de movilidad reducida, los bloques de Piso 1 pasan al inicio (aulas)', () => {
      const bloquesOriginales = [aulaPiso2, aulaPiso1A, aulaPiso3, aulaPiso1B];
      const resultado = priorizarBloquesPiso1(bloquesOriginales, true);

      // Los dos de Piso 1 deben quedar primeros
      expect(resultado.bloques[0].piso).toBe(1);
      expect(resultado.bloques[1].piso).toBe(1);
      expect(resultado.bloques[2].piso).toBe(2);
      expect(resultado.bloques[3].piso).toBe(3);
      expect(resultado.fallbackAplicado).toBe(false);
    });

    test('preserva el orden relativo original entre bloques del mismo nivel (aulas)', () => {
      const bloquesOriginales = [aulaPiso2, aulaPiso1A, aulaPiso1B, aulaPiso3];
      const resultado = priorizarBloquesPiso1(bloquesOriginales, true);

      // aulaPiso1A estaba antes que aulaPiso1B
      expect(resultado.bloques[0].espacioIds).toEqual(['a101']);
      expect(resultado.bloques[1].espacioIds).toEqual(['a102']);
      // aulaPiso2 estaba antes que aulaPiso3
      expect(resultado.bloques[2].espacioIds).toEqual(['a201']);
      expect(resultado.bloques[3].espacioIds).toEqual(['a301']);
    });

    test('si no hay ningún bloque de aulas en Piso 1, aplica fallback y documenta el motivo', () => {
      const bloquesSinPiso1 = [aulaPiso2, aulaPiso3];
      const resultado = priorizarBloquesPiso1(bloquesSinPiso1, true);

      expect(resultado.fallbackAplicado).toBe(true);
      expect(resultado.motivoFallback).toBeDefined();
      expect(resultado.motivoFallback).toContain('Piso 1');
      expect(resultado.bloques).toEqual([aulaPiso2, aulaPiso3]);
    });

    test('lista vacía de bloques con flag activo: no falla y retorna lista vacía sin fallback', () => {
      const resultado = priorizarBloquesPiso1([], true);

      expect(resultado.bloques).toHaveLength(0);
      expect(resultado.fallbackAplicado).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Issue 2.9 / 5.6: priorizarBloquesPiso1 — LABORATORIOS
  // Plan maestro §1.1: los 3 escenarios obligatorios deben repetirse para labs
  // -------------------------------------------------------------------------
  describe('Issue 2.9 / 5.6: priorizarBloquesPiso1 — Laboratorios', () => {
    // Fixtures de laboratorios
    const labPiso2 = crearBloqueLab(crearEspacioLab('l201', 'Lab 201', 2));
    const labPiso3 = crearBloqueLab(crearEspacioLab('l301', 'Lab 301', 3));
    const labPiso1A = crearBloqueLab(crearEspacioLab('l101', 'Lab 101', 1), 2);
    const labPiso1B = crearBloqueLab(crearEspacioLab('l102', 'Lab 102', 1), 5);

    test('sin flag de movilidad reducida no altera el orden de bloques candidatos de laboratorios', () => {
      const bloquesOriginales = [labPiso2, labPiso1A, labPiso3];
      const resultado = priorizarBloquesPiso1(bloquesOriginales, false);

      expect(resultado.bloques).toEqual(bloquesOriginales);
      expect(resultado.fallbackAplicado).toBe(false);
    });

    test('con flag de movilidad reducida, los laboratorios de Piso 1 pasan al inicio', () => {
      const bloquesOriginales = [labPiso2, labPiso1A, labPiso3, labPiso1B];
      const resultado = priorizarBloquesPiso1(bloquesOriginales, true);

      expect(resultado.bloques[0].piso).toBe(1);
      expect(resultado.bloques[1].piso).toBe(1);
      expect(resultado.bloques[2].piso).toBe(2);
      expect(resultado.bloques[3].piso).toBe(3);
      expect(resultado.fallbackAplicado).toBe(false);
    });

    test('si no hay laboratorios en Piso 1, aplica fallback con movilidad reducida activa', () => {
      const bloquesSinPiso1 = [labPiso2, labPiso3];
      const resultado = priorizarBloquesPiso1(bloquesSinPiso1, true);

      expect(resultado.fallbackAplicado).toBe(true);
      expect(resultado.motivoFallback).toBeDefined();
      expect(resultado.motivoFallback).toContain('Piso 1');
      expect(resultado.bloques).toEqual([labPiso2, labPiso3]);
    });

    test('lista vacía de laboratorios con flag activo: no falla y retorna lista vacía sin fallback', () => {
      const resultado = priorizarBloquesPiso1([], true);

      expect(resultado.bloques).toHaveLength(0);
      expect(resultado.fallbackAplicado).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Issue 5.6: test.each — 3 escenarios obligatorios del plan maestro §1.1,
  // verificados para aulas y laboratorios en una sola tabla parametrizada
  // -------------------------------------------------------------------------
  describe('Issue 5.6: test.each — escenarios obligatorios para aulas y laboratorios', () => {
    interface CasoAccesibilidad {
      descripcion: string;
      pisosBloques: number[];
      tipo: TipoEspacio;
      tieneMovilidadReducida: boolean;
      primerPisoEsperado: number | null; // null = lista vacía
      fallbackEsperado: boolean;
    }

    const casos: CasoAccesibilidad[] = [
      {
        descripcion: 'AULA — movilidad reducida, Piso 1 disponible: bloque de Piso 1 queda primero',
        pisosBloques: [2, 1, 3],
        tipo: TipoEspacio.AULA_TEORICA,
        tieneMovilidadReducida: true,
        primerPisoEsperado: 1,
        fallbackEsperado: false,
      },
      {
        descripcion: 'AULA — movilidad reducida, Piso 1 no disponible: aplica fallback',
        pisosBloques: [2, 3],
        tipo: TipoEspacio.AULA_TEORICA,
        tieneMovilidadReducida: true,
        primerPisoEsperado: 2,
        fallbackEsperado: true,
      },
      {
        descripcion: 'AULA — sin movilidad reducida: el orden no se altera',
        pisosBloques: [3, 2, 1],
        tipo: TipoEspacio.AULA_TEORICA,
        tieneMovilidadReducida: false,
        primerPisoEsperado: 3,
        fallbackEsperado: false,
      },
      {
        descripcion:
          'LAB — movilidad reducida, Piso 1 disponible: laboratorio de Piso 1 queda primero',
        pisosBloques: [2, 1, 3],
        tipo: TipoEspacio.LABORATORIO,
        tieneMovilidadReducida: true,
        primerPisoEsperado: 1,
        fallbackEsperado: false,
      },
      {
        descripcion: 'LAB — movilidad reducida, Piso 1 no disponible: aplica fallback',
        pisosBloques: [2, 3],
        tipo: TipoEspacio.LABORATORIO,
        tieneMovilidadReducida: true,
        primerPisoEsperado: 2,
        fallbackEsperado: true,
      },
      {
        descripcion: 'LAB — sin movilidad reducida: el orden no se altera',
        pisosBloques: [3, 2, 1],
        tipo: TipoEspacio.LABORATORIO,
        tieneMovilidadReducida: false,
        primerPisoEsperado: 3,
        fallbackEsperado: false,
      },
    ];

    test.each(casos)(
      '$descripcion',
      ({ pisosBloques, tipo, tieneMovilidadReducida, primerPisoEsperado, fallbackEsperado }) => {
        const esTipoAula = tipo === TipoEspacio.AULA_TEORICA;

        const bloques: BloqueCandidato[] = pisosBloques.map((piso, i) => {
          const espacio = esTipoAula
            ? crearEspacioAula(`esp-${i}`, `Espacio ${i}`, piso)
            : crearEspacioLab(`esp-${i}`, `Espacio ${i}`, piso);
          return esTipoAula ? crearBloqueAula(espacio) : crearBloqueLab(espacio);
        });

        const resultado = priorizarBloquesPiso1(bloques, tieneMovilidadReducida);

        if (primerPisoEsperado !== null) {
          expect(resultado.bloques[0].piso).toBe(primerPisoEsperado);
        }
        expect(resultado.fallbackAplicado).toBe(fallbackEsperado);
      },
    );
  });
});

import { TipoEspacio } from '@prisma/client';
import {
  detectarMovilidadReducida,
  consultarMovilidadReducidaPorSeccionId,
  priorizarBloquesPiso1,
} from '../../../src/rules/accesibilidad';
import { BloqueCandidato, EspacioConexo } from '../../../src/rules/buscarBloqueContiguo';

describe('Issue 2.8, 2.9 / 5.6 - Accesibilidad y Priorización de Piso 1', () => {
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

  describe('Issue 2.9: priorizarBloquesPiso1', () => {
    const crearEspacio = (id: string, identificador: string, piso: number): EspacioConexo => ({
      id,
      identificador,
      tipo: TipoEspacio.AULA_TEORICA,
      pabellon: 'Pab A',
      piso,
      aforoNominal: 40,
    });

    const bloquePiso2: BloqueCandidato = {
      espacios: [crearEspacio('a201', 'Aula 201', 2)],
      espacioIds: ['a201'],
      capacidadTotal: 40,
      desperdicio: 0,
      piso: 2,
      pabellon: 'Pab A',
      tipo: TipoEspacio.AULA_TEORICA,
    };

    const bloquePiso3: BloqueCandidato = {
      espacios: [crearEspacio('a301', 'Aula 301', 3)],
      espacioIds: ['a301'],
      capacidadTotal: 40,
      desperdicio: 0,
      piso: 3,
      pabellon: 'Pab A',
      tipo: TipoEspacio.AULA_TEORICA,
    };

    const bloquePiso1A: BloqueCandidato = {
      espacios: [crearEspacio('a101', 'Aula 101', 1)],
      espacioIds: ['a101'],
      capacidadTotal: 40,
      desperdicio: 2,
      piso: 1,
      pabellon: 'Pab A',
      tipo: TipoEspacio.AULA_TEORICA,
    };

    const bloquePiso1B: BloqueCandidato = {
      espacios: [crearEspacio('a102', 'Aula 102', 1)],
      espacioIds: ['a102'],
      capacidadTotal: 40,
      desperdicio: 5,
      piso: 1,
      pabellon: 'Pab A',
      tipo: TipoEspacio.AULA_TEORICA,
    };

    test('sin flag de movilidad reducida no altera el orden de los bloques candidatos', () => {
      const bloquesOriginales = [bloquePiso2, bloquePiso1A, bloquePiso3];
      const resultado = priorizarBloquesPiso1(bloquesOriginales, false);

      expect(resultado.bloques).toEqual(bloquesOriginales);
      expect(resultado.fallbackAplicado).toBe(false);
    });

    test('con flag de movilidad reducida, los bloques de Piso 1 pasan al inicio', () => {
      const bloquesOriginales = [bloquePiso2, bloquePiso1A, bloquePiso3, bloquePiso1B];
      const resultado = priorizarBloquesPiso1(bloquesOriginales, true);

      // Los dos de Piso 1 deben quedar primeros
      expect(resultado.bloques[0].piso).toBe(1);
      expect(resultado.bloques[1].piso).toBe(1);
      expect(resultado.bloques[2].piso).toBe(2);
      expect(resultado.bloques[3].piso).toBe(3);
      expect(resultado.fallbackAplicado).toBe(false);
    });

    test('preserva el orden relativo original entre bloques del mismo nivel', () => {
      const bloquesOriginales = [bloquePiso2, bloquePiso1A, bloquePiso1B, bloquePiso3];
      const resultado = priorizarBloquesPiso1(bloquesOriginales, true);

      // bloquePiso1A estaba antes que bloquePiso1B
      expect(resultado.bloques[0].espacioIds).toEqual(['a101']);
      expect(resultado.bloques[1].espacioIds).toEqual(['a102']);
      // bloquePiso2 estaba antes que bloquePiso3
      expect(resultado.bloques[2].espacioIds).toEqual(['a201']);
      expect(resultado.bloques[3].espacioIds).toEqual(['a301']);
    });

    test('si no hay ningún bloque en Piso 1, aplica fallback y documenta el motivo', () => {
      const bloquesSinPiso1 = [bloquePiso2, bloquePiso3];
      const resultado = priorizarBloquesPiso1(bloquesSinPiso1, true);

      expect(resultado.fallbackAplicado).toBe(true);
      expect(resultado.motivoFallback).toBeDefined();
      expect(resultado.motivoFallback).toContain('Piso 1');
      expect(resultado.bloques).toEqual([bloquePiso2, bloquePiso3]);
    });
  });
});

import { TipoEspacio } from '@prisma/client';
import {
  calcularPuntajeDistancia,
  evaluarCercaniaParalelas,
  consultarUbicacionesSeccionesParalelas,
  PUNTAJE_CERCANIA_NEUTRO,
  AsignacionParalelaUbicacion,
} from '../../../src/rules/cercaniaParalelas';
import { BloqueCandidato, EspacioConexo } from '../../../src/rules/buscarBloqueContiguo';

describe('Issue 2.13 / 5.16 - Evaluación de Cercanía entre Secciones Paralelas', () => {
  describe('Función auxiliar: calcularPuntajeDistancia', () => {
    test('mismo pabellón y mismo piso otorga la máxima puntuación (100 pts)', () => {
      expect(calcularPuntajeDistancia('Pabellon A', 1, 'Pabellon A', 1)).toBe(100);
      expect(calcularPuntajeDistancia('Pab A', 2, 'pab a ', 2)).toBe(100);
    });

    test('mismo pabellón y piso adyacente otorga puntuación intermedia (70 pts)', () => {
      expect(calcularPuntajeDistancia('Pabellon A', 1, 'Pabellon A', 2)).toBe(70);
      expect(calcularPuntajeDistancia('Pabellon A', 3, 'Pabellon A', 2)).toBe(70);
    });

    test('mismo pabellón y piso distante otorga baja puntuación (30 pts)', () => {
      expect(calcularPuntajeDistancia('Pabellon A', 1, 'Pabellon A', 3)).toBe(30);
    });

    test('distinto pabellón otorga la mínima puntuación (10 pts)', () => {
      expect(calcularPuntajeDistancia('Pabellon A', 1, 'Pabellon B', 1)).toBe(10);
    });
  });

  describe('Función pura: evaluarCercaniaParalelas', () => {
    const espacioBase: EspacioConexo = {
      id: 'a101',
      identificador: 'Aula 101',
      tipo: TipoEspacio.AULA_TEORICA,
      pabellon: 'Pabellon A',
      piso: 1,
      aforoNominal: 40,
    };

    const bloqueCandidatoPiso1: BloqueCandidato = {
      espacios: [espacioBase],
      espacioIds: ['a101'],
      capacidadTotal: 40,
      desperdicio: 0,
      piso: 1,
      pabellon: 'Pabellon A',
      tipo: TipoEspacio.AULA_TEORICA,
    };

    test('sin secciones paralelas asignadas previamente, retorna puntuación neutra (50 pts)', () => {
      expect(evaluarCercaniaParalelas(bloqueCandidatoPiso1, [])).toBe(PUNTAJE_CERCANIA_NEUTRO);
      expect(evaluarCercaniaParalelas(bloqueCandidatoPiso1, null as any)).toBe(
        PUNTAJE_CERCANIA_NEUTRO,
      );
    });

    test('con una sección paralela en el mismo pabellón y piso, retorna 100 pts', () => {
      const paralelas: AsignacionParalelaUbicacion[] = [
        {
          seccionId: 'sec-2',
          codigoSeccion: '2',
          espacios: [{ pabellon: 'Pabellon A', piso: 1 }],
        },
      ];

      expect(evaluarCercaniaParalelas(bloqueCandidatoPiso1, paralelas)).toBe(100);
    });

    test('con una sección paralela en piso adyacente, retorna 70 pts', () => {
      const paralelas: AsignacionParalelaUbicacion[] = [
        {
          seccionId: 'sec-2',
          codigoSeccion: '2',
          espacios: [{ pabellon: 'Pabellon A', piso: 2 }],
        },
      ];

      expect(evaluarCercaniaParalelas(bloqueCandidatoPiso1, paralelas)).toBe(70);
    });

    test('con múltiples secciones paralelas, retorna el promedio de cercanía', () => {
      const paralelas: AsignacionParalelaUbicacion[] = [
        {
          seccionId: 'sec-2',
          codigoSeccion: '2',
          espacios: [{ pabellon: 'Pabellon A', piso: 1 }], // 100 pts
        },
        {
          seccionId: 'sec-3',
          codigoSeccion: '3',
          espacios: [{ pabellon: 'Pabellon A', piso: 2 }], // 70 pts
        },
      ];

      // Promedio: (100 + 70) / 2 = 85
      expect(evaluarCercaniaParalelas(bloqueCandidatoPiso1, paralelas)).toBe(85);
    });

    test('funciona igual para bloques de laboratorios', () => {
      const bloqueLab: BloqueCandidato = {
        espacios: [
          {
            ...espacioBase,
            id: 'lab-1',
            identificador: 'Lab 101',
            tipo: TipoEspacio.LABORATORIO,
          },
        ],
        espacioIds: ['lab-1'],
        capacidadTotal: 30,
        desperdicio: 0,
        piso: 2,
        pabellon: 'Pabellon A',
        tipo: TipoEspacio.LABORATORIO,
      };

      const paralelas: AsignacionParalelaUbicacion[] = [
        {
          seccionId: 'sec-lab-2',
          codigoSeccion: '2',
          espacios: [{ pabellon: 'Pabellon A', piso: 2 }],
        },
      ];

      expect(evaluarCercaniaParalelas(bloqueLab, paralelas)).toBe(100);
    });
  });

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
  });
});

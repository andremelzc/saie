import { TipoEspacio } from '@prisma/client';
import {
  construirGrafoContiguedad,
  obtenerEspaciosContiguos,
  obtenerEspaciosContiguosPorId,
} from '../../../src/services/contiguedad.service';
import { EspacioNoEncontradoError } from '../../../src/services/espacio.service';

describe('Issue 2.3 / 5.2 - Consulta de Espacios Contiguos', () => {
  const espacios = [
    { id: 'aula-1', tipo: TipoEspacio.AULA_TEORICA, identificador: 'Aula 101' },
    { id: 'aula-2', tipo: TipoEspacio.AULA_TEORICA, identificador: 'Aula 102' },
    { id: 'aula-3', tipo: TipoEspacio.AULA_TEORICA, identificador: 'Aula 103' },
    { id: 'aula-aislada', tipo: TipoEspacio.AULA_TEORICA, identificador: 'Aula 104' },
    { id: 'lab-1', tipo: TipoEspacio.LABORATORIO, identificador: 'Lab 101' },
    { id: 'lab-2', tipo: TipoEspacio.LABORATORIO, identificador: 'Lab 102' },
  ];

  const relaciones = [
    { idA: 'aula-1', idB: 'aula-2' },
    { idA: 'aula-2', idB: 'aula-3' },
    { idA: 'lab-1', idB: 'lab-2' },
  ];

  const grafo = construirGrafoContiguedad(espacios, relaciones);

  describe('Función pura: obtenerEspaciosContiguos', () => {
    test('debe retornar los vecinos contiguos de un aula teórica', () => {
      // aula-2 tiene como vecinos a aula-1 y aula-3
      const vecinosAula2 = obtenerEspaciosContiguos('aula-2', grafo);
      expect(vecinosAula2).toEqual(['aula-1', 'aula-3']);

      // aula-1 solo tiene como vecino a aula-2
      const vecinosAula1 = obtenerEspaciosContiguos('aula-1', grafo);
      expect(vecinosAula1).toEqual(['aula-2']);
    });

    test('debe funcionar igual para laboratorios', () => {
      const vecinosLab1 = obtenerEspaciosContiguos('lab-1', grafo);
      expect(vecinosLab1).toEqual(['lab-2']);

      const vecinosLab2 = obtenerEspaciosContiguos('lab-2', grafo);
      expect(vecinosLab2).toEqual(['lab-1']);
    });

    test('debe retornar lista vacía [] si el espacio no tiene contiguos registrados (caso aula aislada)', () => {
      const vecinos = obtenerEspaciosContiguos('aula-aislada', grafo);
      expect(vecinos).toEqual([]);
    });

    test('debe lanzar EspacioNoEncontradoError si el ID de espacio no existe', () => {
      expect(() => {
        obtenerEspaciosContiguos('id-inexistente', grafo);
      }).toThrow(EspacioNoEncontradoError);
    });
  });

  describe('Consulta con Prisma: obtenerEspaciosContiguosPorId', () => {
    test('debe consultar prisma y retornar los IDs de espacios contiguos del mismo tipo', async () => {
      const mockPrisma = {
        espacio: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'aula-1',
            tipo: TipoEspacio.AULA_TEORICA,
            espaciosContiguosA: [
              {
                espacioB: { id: 'aula-2', tipo: TipoEspacio.AULA_TEORICA },
              },
            ],
          }),
        },
      };

      const contiguos = await obtenerEspaciosContiguosPorId('aula-1', mockPrisma as any);
      expect(contiguos).toEqual(['aula-2']);
    });

    test('debe retornar [] si no tiene relaciones en base de datos', async () => {
      const mockPrisma = {
        espacio: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'aula-sola',
            tipo: TipoEspacio.AULA_TEORICA,
            espaciosContiguosA: [],
          }),
        },
      };

      const contiguos = await obtenerEspaciosContiguosPorId('aula-sola', mockPrisma as any);
      expect(contiguos).toEqual([]);
    });

    test('debe lanzar EspacioNoEncontradoError si el espacio no existe en base de datos', async () => {
      const mockPrisma = {
        espacio: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      };

      await expect(obtenerEspaciosContiguosPorId('no-existe', mockPrisma as any)).rejects.toThrow(
        EspacioNoEncontradoError,
      );
    });
  });
});

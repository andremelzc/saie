import { TipoEspacio } from '@prisma/client';
import { calcularCapacidadReal } from '../../../src/rules/calcularCapacidadReal';
import {
  obtenerCapacidadRealPorEspacioId,
  EspacioNoEncontradoError,
} from '../../../src/services/espacio.service';

describe('Issue 2.1 / 5.1 - Cálculo de Capacidad Real de un Espacio', () => {
  describe('Regla Pura: calcularCapacidadReal', () => {
    test('AULA_TEORICA: debe retornar directamente el aforo nominal propio', () => {
      const aula = {
        id: 'aula-101',
        identificador: 'Aula 101',
        tipo: TipoEspacio.AULA_TEORICA,
        aforoNominal: 45,
      };

      expect(calcularCapacidadReal(aula)).toBe(45);
    });

    test('AULA_TEORICA: nunca debe descontar pcsMalogradas aunque el campo esté presente', () => {
      const aula = {
        id: 'aula-102',
        identificador: 'Aula 102',
        tipo: TipoEspacio.AULA_TEORICA,
        aforoNominal: 50,
        pcsMalogradas: 10,
      };

      expect(calcularCapacidadReal(aula)).toBe(50);
    });

    test('LABORATORIO: con 0 PCs malogradas retorna el aforo nominal completo', () => {
      const lab = {
        id: 'lab-01',
        identificador: 'Lab 01',
        tipo: TipoEspacio.LABORATORIO,
        aforoNominal: 30,
        pcsMalogradas: 0,
      };

      expect(calcularCapacidadReal(lab)).toBe(30);
    });

    test('LABORATORIO: con pcsMalogradas en null o undefined retorna el aforo nominal', () => {
      const lab = {
        id: 'lab-01',
        identificador: 'Lab 01',
        tipo: TipoEspacio.LABORATORIO,
        aforoNominal: 28,
        pcsMalogradas: null,
      };

      expect(calcularCapacidadReal(lab)).toBe(28);
    });

    test('LABORATORIO: descuenta correctamente las PCs malogradas', () => {
      const lab = {
        id: 'lab-02',
        identificador: 'Lab 02',
        tipo: TipoEspacio.LABORATORIO,
        aforoNominal: 35,
        pcsMalogradas: 7,
      };

      expect(calcularCapacidadReal(lab)).toBe(28);
    });

    test('LABORATORIO: caso borde donde todas las PCs están malogradas debe dar 0', () => {
      const lab = {
        id: 'lab-03',
        identificador: 'Lab 03',
        tipo: TipoEspacio.LABORATORIO,
        aforoNominal: 25,
        pcsMalogradas: 25,
      };

      expect(calcularCapacidadReal(lab)).toBe(0);
    });

    test('LABORATORIO: caso borde donde pcsMalogradas supera el aforo nominal debe retornar 0 y nunca un número negativo', () => {
      const lab = {
        id: 'lab-04',
        identificador: 'Lab 04',
        tipo: TipoEspacio.LABORATORIO,
        aforoNominal: 20,
        pcsMalogradas: 30,
      };

      expect(calcularCapacidadReal(lab)).toBe(0);
    });
  });

  describe('Pruebas parametrizadas: distintos aforos nominales de laboratorio', () => {
    test.each([
      // [identificador, aforoNominal, pcsMalogradas, capacidadEsperada]
      ['Lab pequeño',   20,  0,  20],
      ['Lab mediano',   30,  5,  25],
      ['Lab grande',    40, 10,  30],
      ['Lab XL',        50, 50,   0],
      ['Lab 1 PC sana',  1,  0,   1],
      ['Lab 1 PC mala',  1,  1,   0],
      ['Lab aforo 0',    0,  0,   0],
    ])(
      'LABORATORIO "%s": nominal=%i, malogradas=%i → capacidad real=%i',
      (identificador, aforoNominal, pcsMalogradas, capacidadEsperada) => {
        const lab = {
          id: `lab-param-${identificador}`,
          identificador,
          tipo: TipoEspacio.LABORATORIO,
          aforoNominal,
          pcsMalogradas,
        };
        expect(calcularCapacidadReal(lab)).toBe(capacidadEsperada);
      },
    );

    test.each([
      // [identificador, aforoNominal, capacidadEsperada]
      ['Aula pequeña',  20,  20],
      ['Aula mediana',  40,  40],
      ['Aula grande',   60,  60],
      ['Aula aforo 0',   0,   0],
    ])(
      'AULA_TEORICA "%s": nominal=%i → capacidad real=%i (nunca descuenta PCs)',
      (identificador, aforoNominal, capacidadEsperada) => {
        const aula = {
          id: `aula-param-${identificador}`,
          identificador,
          tipo: TipoEspacio.AULA_TEORICA,
          aforoNominal,
          pcsMalogradas: 99, // campo ignorado para aulas
        };
        expect(calcularCapacidadReal(aula)).toBe(capacidadEsperada);
      },
    );
  });

  describe('Servicio: obtenerCapacidadRealPorEspacioId', () => {
    test('debe consultar el espacio en base de datos y calcular su capacidad real', async () => {
      const mockPrisma = {
        espacio: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'lab-bd',
            identificador: 'Lab 101',
            tipo: TipoEspacio.LABORATORIO,
            aforoNominal: 40,
            pcsMalogradas: 4,
          }),
        },
      };

      const capacidad = await obtenerCapacidadRealPorEspacioId('lab-bd', mockPrisma as any);
      expect(capacidad).toBe(36);
      expect(mockPrisma.espacio.findUnique).toHaveBeenCalledWith({ where: { id: 'lab-bd' } });
    });

    test('debe lanzar EspacioNoEncontradoError si el espacio no existe', async () => {
      const mockPrisma = {
        espacio: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      };

      await expect(
        obtenerCapacidadRealPorEspacioId('inexistente', mockPrisma as any),
      ).rejects.toThrow(EspacioNoEncontradoError);
    });
  });
});

import { TipoEspacio } from '@prisma/client';
import {
  calcularRutaReferencia,
  ordenarEspaciosPorContiguedad,
  TIEMPO_CAMINATA_CONFIG,
} from '../../../src/services/rutaReferencia.service';
import { construirGrafoContiguedad } from '../../../src/services/contiguedad.service';

describe('Algoritmo de Ruta de Referencia (Issue 3.14)', () => {
  const grafoMock = construirGrafoContiguedad(
    [
      { id: 'aula-101', tipo: TipoEspacio.AULA_TEORICA, identificador: 'Aula 101' },
      { id: 'aula-102', tipo: TipoEspacio.AULA_TEORICA, identificador: 'Aula 102' },
      { id: 'aula-103', tipo: TipoEspacio.AULA_TEORICA, identificador: 'Aula 103' },
      { id: 'lab-201', tipo: TipoEspacio.LABORATORIO, identificador: 'Lab 201' },
      { id: 'lab-202', tipo: TipoEspacio.LABORATORIO, identificador: 'Lab 202' },
      { id: 'lab-301', tipo: TipoEspacio.LABORATORIO, identificador: 'Lab 301' },
    ],
    [
      { idA: 'aula-101', idB: 'aula-102' },
      { idA: 'aula-102', idB: 'aula-103' },
      { idA: 'lab-201', idB: 'lab-202' },
    ],
  );

  describe('Criterio: Secuencia de tramos y estimación de tiempo', () => {
    it('debe generar los 3 tramos (entrada, cambio de piso, espacio) para piso superior a 1', () => {
      const ruta = calcularRutaReferencia({
        asignacionId: 'asig-1',
        espacios: [
          {
            id: 'lab-201',
            identificador: 'Lab 201',
            pabellon: 'Pabellon A',
            piso: 2,
            tipo: TipoEspacio.LABORATORIO,
          },
        ],
        grafoContiguedad: grafoMock,
        movilidadReducida: false,
      });

      expect(ruta.estado).toBe('DISPONIBLE');
      expect(ruta.pabellon).toBe('Pabellon A');
      expect(ruta.pisoDestino).toBe(2);
      expect(ruta.tramos).toHaveLength(3);

      // Tramo 1: Entrada
      expect(ruta.tramos[0].tipo).toBe('ENTRADA_PABELLON');
      expect(ruta.tramos[0].tiempoEstimadoSegundos).toBe(
        TIEMPO_CAMINATA_CONFIG.TIEMPO_BASE_ENTRADA_SEGUNDOS,
      );

      // Tramo 2: Cambio de piso por escalera
      expect(ruta.tramos[1].tipo).toBe('CAMBIO_PISO');
      expect(ruta.tramos[1].descripcion).toContain('escaleras principales');
      expect(ruta.tramos[1].tiempoEstimadoSegundos).toBe(
        TIEMPO_CAMINATA_CONFIG.TIEMPO_POR_PISO_ESCALERA_SEGUNDOS * (2 - 1),
      );

      // Tramo 3: Espacio
      expect(ruta.tramos[2].tipo).toBe('ESPACIO_ASIGNADO');
      expect(ruta.tramos[2].identificador).toBe('Lab 201');
      expect(ruta.tramos[2].tiempoEstimadoSegundos).toBe(
        TIEMPO_CAMINATA_CONFIG.TIEMPO_TRANSITO_PISO_SEGUNDOS,
      );

      // Tiempo total
      const tiempoEsperado =
        TIEMPO_CAMINATA_CONFIG.TIEMPO_BASE_ENTRADA_SEGUNDOS +
        TIEMPO_CAMINATA_CONFIG.TIEMPO_POR_PISO_ESCALERA_SEGUNDOS +
        TIEMPO_CAMINATA_CONFIG.TIEMPO_TRANSITO_PISO_SEGUNDOS;
      expect(ruta.tiempoEstimadoTotalSegundos).toBe(tiempoEsperado);
    });

    it('debe utilizar ascensor accesible y calcular tiempos correspondientes si hay movilidad reducida', () => {
      const ruta = calcularRutaReferencia({
        asignacionId: 'asig-2',
        espacios: [
          {
            id: 'lab-301',
            identificador: 'Lab 301',
            pabellon: 'Pabellon B',
            piso: 3,
            tipo: TipoEspacio.LABORATORIO,
          },
        ],
        grafoContiguedad: grafoMock,
        movilidadReducida: true,
      });

      expect(ruta.estado).toBe('DISPONIBLE');
      expect(ruta.movilidadReducida).toBe(true);

      const tramoPiso = ruta.tramos.find((t) => t.tipo === 'CAMBIO_PISO');
      expect(tramoPiso).toBeDefined();
      expect(tramoPiso?.descripcion).toContain('ascensor accesible');
      expect(tramoPiso?.esAccesible).toBe(true);
      // 2 pisos de diferencia (Piso 3 - 1 = 2)
      expect(tramoPiso?.tiempoEstimadoSegundos).toBe(
        TIEMPO_CAMINATA_CONFIG.TIEMPO_POR_PISO_ASCENSOR_SEGUNDOS * 2,
      );
    });
  });

  describe('Casos borde especificados en el issue', () => {
    it('Caso borde: Espacio en Piso 1 omite el tramo de cambio de piso', () => {
      const ruta = calcularRutaReferencia({
        asignacionId: 'asig-piso-1',
        espacios: [
          {
            id: 'aula-101',
            identificador: 'Aula 101',
            pabellon: 'Pabellon A',
            piso: 1,
            tipo: TipoEspacio.AULA_TEORICA,
          },
        ],
        grafoContiguedad: grafoMock,
      });

      expect(ruta.estado).toBe('DISPONIBLE');
      expect(ruta.pisoDestino).toBe(1);
      // Solo 2 tramos: Entrada y Espacio asignado (sin cambio de piso)
      expect(ruta.tramos).toHaveLength(2);
      expect(ruta.tramos[0].tipo).toBe('ENTRADA_PABELLON');
      expect(ruta.tramos[1].tipo).toBe('ESPACIO_ASIGNADO');
      expect(ruta.tramos.some((t) => t.tipo === 'CAMBIO_PISO')).toBe(false);
    });

    it('Caso borde: Espacio sin pabellón o piso registrado devuelve estado explícito RUTA_NO_DISPONIBLE', () => {
      const sinPabellon = calcularRutaReferencia({
        espacios: [{ id: 'esp-x', identificador: 'Aula X', pabellon: null, piso: 1 }],
      });
      expect(sinPabellon.estado).toBe('RUTA_NO_DISPONIBLE');
      expect(sinPabellon.tramos).toHaveLength(0);

      const sinPiso = calcularRutaReferencia({
        espacios: [{ id: 'esp-y', identificador: 'Aula Y', pabellon: 'Pabellon A', piso: null }],
      });
      expect(sinPiso.estado).toBe('RUTA_NO_DISPONIBLE');
      expect(sinPiso.tramos).toHaveLength(0);

      const listaVacia = calcularRutaReferencia({
        espacios: [],
      });
      expect(listaVacia.estado).toBe('RUTA_NO_DISPONIBLE');
    });

    it('Caso borde: Bloque de varios espacios usa la contigüidad del Issue 2.3 para ordenarlos', () => {
      // Bloque de 3 aulas contiguas pasadas en orden desordenado
      const espaciosDesordenados = [
        {
          id: 'aula-103',
          identificador: 'Aula 103',
          pabellon: 'Pab A',
          piso: 1,
          tipo: TipoEspacio.AULA_TEORICA,
        },
        {
          id: 'aula-101',
          identificador: 'Aula 101',
          pabellon: 'Pab A',
          piso: 1,
          tipo: TipoEspacio.AULA_TEORICA,
        },
        {
          id: 'aula-102',
          identificador: 'Aula 102',
          pabellon: 'Pab A',
          piso: 1,
          tipo: TipoEspacio.AULA_TEORICA,
        },
      ];

      const ordenados = ordenarEspaciosPorContiguedad(espaciosDesordenados, grafoMock);
      expect(ordenados.map((e) => e.identificador)).toEqual(['Aula 101', 'Aula 102', 'Aula 103']);

      const ruta = calcularRutaReferencia({
        asignacionId: 'asig-bloque',
        espacios: espaciosDesordenados,
        grafoContiguedad: grafoMock,
      });

      expect(ruta.estado).toBe('DISPONIBLE');
      // 1 tramo de entrada + 3 tramos de espacios del bloque
      expect(ruta.tramos).toHaveLength(4);
      expect(ruta.tramos[1].identificador).toBe('Aula 101');
      expect(ruta.tramos[2].identificador).toBe('Aula 102');
      expect(ruta.tramos[3].identificador).toBe('Aula 103');
    });

    it('Caso borde: ordenarEspaciosPorContiguedad con lista de 1 o sin grafo', () => {
      const unico = [{ id: 'esp-1', identificador: 'A1' }];
      expect(ordenarEspaciosPorContiguedad(unico, grafoMock)).toHaveLength(1);

      const sinGrafo = [
        { id: 'esp-2', identificador: 'B1' },
        { id: 'esp-1', identificador: 'A1' },
      ];
      const res = ordenarEspaciosPorContiguedad(sinGrafo);
      expect(res[0].identificador).toBe('A1');
      expect(res[1].identificador).toBe('B1');
    });

    it('Caso borde: espacio sin identificador usa fallback Espacio <id>', () => {
      const ruta = calcularRutaReferencia({
        espacios: [{ id: 'uuid-1', identificador: null, pabellon: 'Pab 1', piso: 1 }],
      });
      expect(ruta.estado).toBe('DISPONIBLE');
      expect(ruta.tramos[1].titulo).toContain('Espacio uuid-1');
    });

    it('Caso borde: espacio no encontrado en grafo o con vecinos no contiguos en el bloque', () => {
      const espaciosConDesconectado = [
        {
          id: 'esp-no-en-grafo',
          identificador: 'Z9',
          pabellon: 'Pab 1',
          piso: 1,
          tipo: TipoEspacio.AULA_TEORICA,
        },
        {
          id: 'aula-101',
          identificador: 'Aula 101',
          pabellon: 'Pab 1',
          piso: 1,
          tipo: TipoEspacio.AULA_TEORICA,
        },
      ];
      const ordenados = ordenarEspaciosPorContiguedad(espaciosConDesconectado, grafoMock);
      expect(ordenados).toHaveLength(2);
    });
  });
});

import { TipoEspacio } from '@prisma/client';
import {
  validarYConstruirContiguedadesSimetricas,
  sembrarEspaciosYContiguedades,
  ContiguedadInvalidaError,
  ESPACIOS_EDIFICIO_SEED,
  CONTIGUEDADES_SEED,
} from '../../../src/services/contiguedad.seed';

describe('Issue 2.2 - Definir esquema y sembrar datos de contigüidad entre espacios', () => {
  const espaciosMock = [
    {
      id: '1',
      identificador: 'Aula 101',
      tipo: TipoEspacio.AULA_TEORICA,
      pabellon: 'Pabellon A',
      piso: 1,
      aforoNominal: 40,
    },
    {
      id: '2',
      identificador: 'Aula 102',
      tipo: TipoEspacio.AULA_TEORICA,
      pabellon: 'Pabellon A',
      piso: 1,
      aforoNominal: 40,
    },
    {
      id: '3',
      identificador: 'Lab 101',
      tipo: TipoEspacio.LABORATORIO,
      pabellon: 'Pabellon A',
      piso: 1,
      aforoNominal: 30,
    },
    {
      id: '4',
      identificador: 'Aula 201',
      tipo: TipoEspacio.AULA_TEORICA,
      pabellon: 'Pabellon A',
      piso: 2,
      aforoNominal: 40,
    },
  ];

  test('debe construir relaciones simétricas bidireccionales (si A-B entonces genera A-B y B-A)', () => {
    const pares = [{ identificadorA: 'Aula 101', identificadorB: 'Aula 102' }];
    const resultado = validarYConstruirContiguedadesSimetricas(espaciosMock, pares);

    expect(resultado).toHaveLength(2);
    expect(resultado).toEqual(
      expect.arrayContaining([
        { idA: '1', idB: '2' },
        { idA: '2', idB: '1' },
      ]),
    );
  });

  test('debe rechazar contigüidad entre espacios de diferente tipo (AULA_TEORICA con LABORATORIO)', () => {
    const pares = [{ identificadorA: 'Aula 101', identificadorB: 'Lab 101' }];

    expect(() => {
      validarYConstruirContiguedadesSimetricas(espaciosMock, pares);
    }).toThrow(ContiguedadInvalidaError);
  });

  test('debe rechazar contigüidad entre espacios de diferente piso', () => {
    const pares = [{ identificadorA: 'Aula 101', identificadorB: 'Aula 201' }];

    expect(() => {
      validarYConstruirContiguedadesSimetricas(espaciosMock, pares);
    }).toThrow(ContiguedadInvalidaError);
  });

  test('debe rechazar contigüidad de un espacio consigo mismo', () => {
    const pares = [{ identificadorA: 'Aula 101', identificadorB: 'Aula 101' }];

    expect(() => {
      validarYConstruirContiguedadesSimetricas(espaciosMock, pares);
    }).toThrow(ContiguedadInvalidaError);
  });

  test('debe rechazar contigüidad si alguno de los espacios no existe', () => {
    const pares = [{ identificadorA: 'Aula 101', identificadorB: 'Aula Fantasma' }];

    expect(() => {
      validarYConstruirContiguedadesSimetricas(espaciosMock, pares);
    }).toThrow(ContiguedadInvalidaError);
  });

  test('el catálogo de seed oficial del edificio debe validar al 100% sin inconsistencias', () => {
    const espaciosConId = ESPACIOS_EDIFICIO_SEED.map((e, idx) => ({
      ...e,
      id: `uuid-${idx + 1}`,
    }));

    const relaciones = validarYConstruirContiguedadesSimetricas(espaciosConId, CONTIGUEDADES_SEED);

    // Debe contener exactamente el doble de relaciones simétricas
    expect(relaciones.length).toBe(CONTIGUEDADES_SEED.length * 2);

    // El aula aislada 'Aula 304 (Aislada)' no debe tener contiguos
    const idAulaAislada = espaciosConId.find((e) => e.identificador.includes('Aislada'))?.id;
    const relacionesAislada = relaciones.filter(
      (r) => r.idA === idAulaAislada || r.idB === idAulaAislada,
    );
    expect(relacionesAislada).toHaveLength(0);
  });

  test('sembrarEspaciosYContiguedades debe ser idempotente usando upsert en Prisma', async () => {
    const mockPrisma = {
      espacio: {
        upsert: jest.fn().mockImplementation((args) =>
          Promise.resolve({
            id: `uuid-${args.create.identificador}`,
            ...args.create,
          }),
        ),
      },
      espacioContiguo: {
        upsert: jest.fn().mockResolvedValue({}),
      },
    };

    const resultado = await sembrarEspaciosYContiguedades(mockPrisma as any);

    expect(resultado.espaciosSembrados).toBe(ESPACIOS_EDIFICIO_SEED.length);
    expect(resultado.contiguedadesSembradas).toBe(CONTIGUEDADES_SEED.length * 2);
    expect(mockPrisma.espacio.upsert).toHaveBeenCalledTimes(ESPACIOS_EDIFICIO_SEED.length);
    expect(mockPrisma.espacioContiguo.upsert).toHaveBeenCalledTimes(CONTIGUEDADES_SEED.length * 2);
  });
});

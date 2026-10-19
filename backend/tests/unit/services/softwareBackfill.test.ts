import { PrismaClient } from '@prisma/client';
import {
  columnasLegadoDisponibles,
  ejecutarBackfillSoftware,
} from '../../../src/services/softwareBackfill.service';

interface EspacioFalso {
  id: string;
  tipo: 'AULA_TEORICA' | 'LABORATORIO';
  identificador: string;
  softwareInstalado: string[];
}

interface SeccionFalsa {
  id: string;
  tipoEspacioRequerido: 'AULA_TEORICA' | 'LABORATORIO';
  stackSoftwareRequerido: string[];
}

interface FilaSoftware {
  id: string;
  nombre: string;
  nombreNormalizado: string;
  version: string;
}

/**
 * Prisma en memoria con la forma mínima que usa el backfill. Permite verificar de verdad la
 * idempotencia (correr dos veces y comprobar que las tablas no crecen).
 */
function crearPrismaFalso(opciones: {
  espacios?: EspacioFalso[];
  secciones?: SeccionFalsa[];
  software?: FilaSoftware[];
  legado?: boolean;
}) {
  const softwareFilas: FilaSoftware[] = [...(opciones.software ?? [])];
  const instalaciones = new Set<string>();
  const requerimientos = new Map<string, unknown>();
  let siguienteId = softwareFilas.length + 1;

  const prisma = {
    // El servicio lee las columnas antiguas con `$queryRaw`: ya no forman parte del esquema.
    $queryRaw: jest.fn(async (strings: TemplateStringsArray) => {
      const sql = strings.join('?');
      if (sql.includes('information_schema')) return [{ existe: opciones.legado !== false }];
      if (sql.includes('"espacios"')) return opciones.espacios ?? [];
      if (sql.includes('"secciones"')) return opciones.secciones ?? [];
      return [];
    }),
    software: {
      count: jest.fn(async () => softwareFilas.length),
      upsert: jest.fn(async ({ where, create }: any) => {
        const { nombreNormalizado, version } = where.nombreNormalizado_version;
        const existente = softwareFilas.find(
          (fila) => fila.nombreNormalizado === nombreNormalizado && fila.version === version,
        );
        if (existente) return { id: existente.id };

        const fila: FilaSoftware = { id: `sw-${siguienteId++}`, ...create };
        softwareFilas.push(fila);
        return { id: fila.id };
      }),
    },
    espacioSoftware: {
      createMany: jest.fn(async ({ data }: any) => {
        let creadas = 0;
        for (const fila of data) {
          const clave = `${fila.espacioId}|${fila.softwareId}`;
          if (!instalaciones.has(clave)) {
            instalaciones.add(clave);
            creadas++;
          }
        }
        return { count: creadas };
      }),
    },
    seccionSoftware: {
      createMany: jest.fn(async ({ data }: any) => {
        let creadas = 0;
        for (const fila of data) {
          const clave = `${fila.seccionId}|${fila.softwareId}`;
          if (!requerimientos.has(clave)) {
            requerimientos.set(clave, fila);
            creadas++;
          }
        }
        return { count: creadas };
      }),
    },
  };

  return {
    prisma: prisma as unknown as PrismaClient,
    mock: prisma,
    estado: { softwareFilas, instalaciones, requerimientos },
  };
}

describe('ejecutarBackfillSoftware (#4.27)', () => {
  it('migra espacios y secciones separando nombre y versión', async () => {
    const { prisma, mock } = crearPrismaFalso({
      espacios: [
        {
          id: 'e1',
          tipo: 'LABORATORIO',
          identificador: 'Lab 1',
          softwareInstalado: ['Python 3.12', 'Ubuntu 22.04'],
        },
      ],
      secciones: [
        {
          id: 's1',
          tipoEspacioRequerido: 'LABORATORIO',
          stackSoftwareRequerido: ['Python 3.12'],
        },
      ],
    });

    const reporte = await ejecutarBackfillSoftware(prisma);

    expect(reporte).toMatchObject({
      textosAnalizados: 2,
      softwareCreados: 2,
      softwareExistentes: 0,
      instalacionesCreadas: 2,
      requerimientosCreados: 1,
      textosVacios: 0,
      ambiguos: [],
      omitidos: [],
    });

    const filas = mock.software.upsert.mock.calls.map(([args]: any[]) => args.create);
    expect(filas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nombre: 'Python', version: '3.12', nombreNormalizado: 'python' }),
        expect.objectContaining({ nombre: 'Ubuntu', version: '22.04' }),
      ]),
    );

    // Un requerimiento con versión conserva la comparación exacta que exigía el texto libre.
    const requerimientos = mock.seccionSoftware.createMany.mock.calls[0][0].data;
    expect(requerimientos).toEqual([
      { seccionId: 's1', softwareId: expect.any(String), comparacionVersion: 'EXACTA' },
    ]);
  });

  it('usa CUALQUIERA cuando el requerimiento no declara versión', async () => {
    const { prisma, mock } = crearPrismaFalso({
      espacios: [
        { id: 'e1', tipo: 'LABORATORIO', identificador: 'Lab 1', softwareInstalado: ['Python'] },
      ],
      secciones: [
        { id: 's1', tipoEspacioRequerido: 'LABORATORIO', stackSoftwareRequerido: ['Python'] },
      ],
    });

    await ejecutarBackfillSoftware(prisma);

    const requerimientos = mock.seccionSoftware.createMany.mock.calls[0][0].data;
    expect(requerimientos[0].comparacionVersion).toBe('CUALQUIERA');
  });

  it('es idempotente: la segunda corrida no duplica filas', async () => {
    const { prisma, estado } = crearPrismaFalso({
      espacios: [
        {
          id: 'e1',
          tipo: 'LABORATORIO',
          identificador: 'Lab 1',
          softwareInstalado: ['Python 3.12', 'Python 3.12', 'Ubuntu 22.04'],
        },
      ],
      secciones: [
        { id: 's1', tipoEspacioRequerido: 'LABORATORIO', stackSoftwareRequerido: ['Python 3.12'] },
      ],
    });

    const primera = await ejecutarBackfillSoftware(prisma);
    expect(primera.softwareCreados).toBe(2);
    expect(primera.instalacionesCreadas).toBe(2); // el duplicado dentro del mismo espacio se deduplica
    expect(primera.requerimientosCreados).toBe(1);

    const segunda = await ejecutarBackfillSoftware(prisma);
    expect(segunda).toMatchObject({
      textosAnalizados: 2,
      softwareCreados: 0,
      softwareExistentes: 2,
      instalacionesCreadas: 0,
      requerimientosCreados: 0,
    });

    expect(estado.softwareFilas).toHaveLength(2);
    expect(estado.instalaciones.size).toBe(2);
    expect(estado.requerimientos.size).toBe(1);
  });

  it('reutiliza el software que ya existe en el catálogo', async () => {
    const { prisma, estado } = crearPrismaFalso({
      espacios: [
        {
          id: 'e1',
          tipo: 'LABORATORIO',
          identificador: 'Lab 1',
          softwareInstalado: ['Python 3.12'],
        },
      ],
      software: [
        { id: 'sw-existente', nombre: 'Python', nombreNormalizado: 'python', version: '3.12' },
      ],
    });

    const reporte = await ejecutarBackfillSoftware(prisma);

    expect(reporte.softwareCreados).toBe(0);
    expect(reporte.softwareExistentes).toBe(1);
    expect([...estado.instalaciones]).toEqual(['e1|sw-existente']);
  });

  it('reporta textos ambiguos, grafías duplicadas y textos vacíos', async () => {
    const { prisma } = crearPrismaFalso({
      espacios: [
        {
          id: 'e1',
          tipo: 'LABORATORIO',
          identificador: 'Lab 1',
          softwareInstalado: ['MATLAB R2023b', 'Python 3.12 LTS', 'Python 3.12', 'python 3.12', ''],
        },
      ],
    });

    const reporte = await ejecutarBackfillSoftware(prisma);

    expect(reporte.textosVacios).toBe(1);
    expect(reporte.textosAnalizados).toBe(4);
    expect(reporte.ambiguos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          texto: 'MATLAB R2023b',
          nombre: 'MATLAB',
          version: 'R2023b',
          motivos: ['VERSION_NO_NUMERICA'],
          origenes: ['ESPACIO'],
          ids: ['e1'],
        }),
        expect.objectContaining({
          texto: 'Python 3.12 LTS',
          motivos: ['DIGITOS_SIN_VERSION'],
        }),
      ]),
    );
    expect(reporte.grafiasDuplicadas).toHaveLength(1);
    expect(reporte.grafiasDuplicadas[0]).toMatchObject({
      nombreNormalizado: 'python',
      version: '3.12',
    });
    expect(reporte.grafiasDuplicadas[0].textos).toEqual(
      expect.arrayContaining(['Python 3.12', 'python 3.12']),
    );
  });

  it('omite filas que violan las reglas de integridad y las reporta', async () => {
    const { prisma } = crearPrismaFalso({
      espacios: [
        {
          id: 'aula-1',
          tipo: 'AULA_TEORICA',
          identificador: 'Aula 201',
          softwareInstalado: ['Python 3.12'],
        },
      ],
      secciones: [
        { id: 's1', tipoEspacioRequerido: 'AULA_TEORICA', stackSoftwareRequerido: ['Python'] },
      ],
    });

    const reporte = await ejecutarBackfillSoftware(prisma);

    expect(reporte.softwareCreados).toBe(0);
    expect(reporte.instalacionesCreadas).toBe(0);
    expect(reporte.requerimientosCreados).toBe(0);
    expect(reporte.omitidos).toHaveLength(2);
    expect(reporte.omitidos[0]).toContain('Aula 201');
    expect(reporte.omitidos[1]).toContain('s1');
  });

  it('detecta si las columnas antiguas ya fueron eliminadas por la migración de limpieza', async () => {
    const conLegado = crearPrismaFalso({ legado: true });
    const sinLegado = crearPrismaFalso({ legado: false });

    expect(await columnasLegadoDisponibles(conLegado.prisma)).toBe(true);
    expect(await columnasLegadoDisponibles(sinLegado.prisma)).toBe(false);
  });
});

import { PrismaClient, TipoEspacio } from '@prisma/client';

export interface EspacioSeedData {
  identificador: string;
  tipo: TipoEspacio;
  pabellon: string;
  piso: number;
  aforoNominal: number;
  softwareInstalado?: string[];
  pcsMalogradas?: number | null;
}

export interface ParContiguoSeed {
  identificadorA: string;
  identificadorB: string;
  pabellon?: string;
}

export class ContiguedadInvalidaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContiguedadInvalidaError';
  }
}

/**
 * Catálogo base de espacios físicos del edificio de 3 pisos (Pabellón A)
 */
export const ESPACIOS_EDIFICIO_SEED: EspacioSeedData[] = [
  // Piso 1: 3 Aulas Teóricas contiguas y 2 Laboratorios contiguos
  {
    identificador: 'Aula 101',
    tipo: TipoEspacio.AULA_TEORICA,
    pabellon: 'Pabellon A',
    piso: 1,
    aforoNominal: 40,
  },
  {
    identificador: 'Aula 102',
    tipo: TipoEspacio.AULA_TEORICA,
    pabellon: 'Pabellon A',
    piso: 1,
    aforoNominal: 40,
  },
  {
    identificador: 'Aula 103',
    tipo: TipoEspacio.AULA_TEORICA,
    pabellon: 'Pabellon A',
    piso: 1,
    aforoNominal: 35,
  },
  {
    identificador: 'Lab 101',
    tipo: TipoEspacio.LABORATORIO,
    pabellon: 'Pabellon A',
    piso: 1,
    aforoNominal: 30,
    pcsMalogradas: 2,
    softwareInstalado: ['VS Code', 'Node.js', 'PostgreSQL'],
  },
  {
    identificador: 'Lab 102',
    tipo: TipoEspacio.LABORATORIO,
    pabellon: 'Pabellon A',
    piso: 1,
    aforoNominal: 30,
    pcsMalogradas: 0,
    softwareInstalado: ['VS Code', 'Node.js', 'Docker', 'PostgreSQL'],
  },

  // Piso 2: 4 Aulas Teóricas en línea y 2 Laboratorios contiguos
  {
    identificador: 'Aula 201',
    tipo: TipoEspacio.AULA_TEORICA,
    pabellon: 'Pabellon A',
    piso: 2,
    aforoNominal: 45,
  },
  {
    identificador: 'Aula 202',
    tipo: TipoEspacio.AULA_TEORICA,
    pabellon: 'Pabellon A',
    piso: 2,
    aforoNominal: 45,
  },
  {
    identificador: 'Aula 203',
    tipo: TipoEspacio.AULA_TEORICA,
    pabellon: 'Pabellon A',
    piso: 2,
    aforoNominal: 40,
  },
  {
    identificador: 'Aula 204',
    tipo: TipoEspacio.AULA_TEORICA,
    pabellon: 'Pabellon A',
    piso: 2,
    aforoNominal: 40,
  },
  {
    identificador: 'Lab 201',
    tipo: TipoEspacio.LABORATORIO,
    pabellon: 'Pabellon A',
    piso: 2,
    aforoNominal: 35,
    pcsMalogradas: 3,
    softwareInstalado: ['IntelliJ IDEA', 'JDK 21', 'Maven'],
  },
  {
    identificador: 'Lab 202',
    tipo: TipoEspacio.LABORATORIO,
    pabellon: 'Pabellon A',
    piso: 2,
    aforoNominal: 35,
    pcsMalogradas: 1,
    softwareInstalado: ['IntelliJ IDEA', 'JDK 21', 'Python', 'PyCharm'],
  },

  // Piso 3: 3 Aulas Teóricas y 1 Aula aislada (sin contiguos)
  {
    identificador: 'Aula 301',
    tipo: TipoEspacio.AULA_TEORICA,
    pabellon: 'Pabellon A',
    piso: 3,
    aforoNominal: 50,
  },
  {
    identificador: 'Aula 302',
    tipo: TipoEspacio.AULA_TEORICA,
    pabellon: 'Pabellon A',
    piso: 3,
    aforoNominal: 50,
  },
  {
    identificador: 'Aula 303',
    tipo: TipoEspacio.AULA_TEORICA,
    pabellon: 'Pabellon A',
    piso: 3,
    aforoNominal: 45,
  },
  {
    identificador: 'Aula 304 (Aislada)',
    tipo: TipoEspacio.AULA_TEORICA,
    pabellon: 'Pabellon A',
    piso: 3,
    aforoNominal: 30,
  },
];

/**
 * Pares de contigüidad física puerta a puerta en el edificio.
 */
export const CONTIGUEDADES_SEED: ParContiguoSeed[] = [
  // Piso 1: Aula 101 - Aula 102 - Aula 103
  { identificadorA: 'Aula 101', identificadorB: 'Aula 102' },
  { identificadorA: 'Aula 102', identificadorB: 'Aula 103' },
  // Piso 1: Lab 101 - Lab 102
  { identificadorA: 'Lab 101', identificadorB: 'Lab 102' },

  // Piso 2: Aula 201 - Aula 202 - Aula 203 - Aula 204
  { identificadorA: 'Aula 201', identificadorB: 'Aula 202' },
  { identificadorA: 'Aula 202', identificadorB: 'Aula 203' },
  { identificadorA: 'Aula 203', identificadorB: 'Aula 204' },
  // Piso 2: Lab 201 - Lab 202
  { identificadorA: 'Lab 201', identificadorB: 'Lab 202' },

  // Piso 3: Aula 301 - Aula 302 - Aula 303 (Aula 304 aislada)
  { identificadorA: 'Aula 301', identificadorB: 'Aula 302' },
  { identificadorA: 'Aula 302', identificadorB: 'Aula 303' },
];

export interface RelacionSimetrica {
  idA: string;
  idB: string;
}

/**
 * Valida la consistencia de las contigüidades:
 * 1. Ambos espacios deben existir en la lista.
 * 2. Ambos espacios deben ser estrictamente del mismo tipo (rechaza aula-laboratorio).
 * 3. Ambos espacios deben estar en el mismo pabellón y piso.
 * 4. No se permite auto-contigüidad (A con A).
 * 5. Construye y retorna las relaciones simétricas bidireccionales (A-B y B-A) deduplicadas.
 */
export function validarYConstruirContiguedadesSimetricas(
  espacios: Array<EspacioSeedData & { id: string }>,
  pares: ParContiguoSeed[],
): RelacionSimetrica[] {
  const mapaEspacios = new Map<string, EspacioSeedData & { id: string }>();
  for (const esp of espacios) {
    const clave = `${esp.pabellon}::${esp.identificador}`;
    mapaEspacios.set(clave, esp);
  }

  const relacionesMap = new Map<string, RelacionSimetrica>();

  for (const par of pares) {
    const pabellon = par.pabellon ?? 'Pabellon A';
    const espA = mapaEspacios.get(`${pabellon}::${par.identificadorA}`);
    const espB = mapaEspacios.get(`${pabellon}::${par.identificadorB}`);

    if (!espA) {
      throw new ContiguedadInvalidaError(
        `El espacio '${par.identificadorA}' en '${pabellon}' no existe.`,
      );
    }
    if (!espB) {
      throw new ContiguedadInvalidaError(
        `El espacio '${par.identificadorB}' en '${pabellon}' no existe.`,
      );
    }

    if (espA.id === espB.id) {
      throw new ContiguedadInvalidaError(
        `Un espacio no puede ser contiguo a sí mismo: '${espA.identificador}'.`,
      );
    }

    if (espA.tipo !== espB.tipo) {
      throw new ContiguedadInvalidaError(
        `Contigüidad no permitida entre tipos diferentes: '${espA.identificador}' (${espA.tipo}) y '${espB.identificador}' (${espB.tipo}).`,
      );
    }

    if (espA.piso !== espB.piso) {
      throw new ContiguedadInvalidaError(
        `Contigüidad no permitida entre pisos diferentes: '${espA.identificador}' (Piso ${espA.piso}) y '${espB.identificador}' (Piso ${espB.piso}).`,
      );
    }

    // Asegurar bidireccionalidad simétrica: A -> B y B -> A
    const claveAB = `${espA.id}::${espB.id}`;
    const claveBA = `${espB.id}::${espA.id}`;

    relacionesMap.set(claveAB, { idA: espA.id, idB: espB.id });
    relacionesMap.set(claveBA, { idA: espB.id, idB: espA.id });
  }

  return Array.from(relacionesMap.values());
}

/**
 * Siembra de forma idempotente los espacios físicos y sus relaciones de contigüidad.
 */
export async function sembrarEspaciosYContiguedades(prisma: PrismaClient) {
  // 1. Sembrar espacios
  const espaciosCreados: Array<EspacioSeedData & { id: string }> = [];

  for (const esp of ESPACIOS_EDIFICIO_SEED) {
    const registro = await prisma.espacio.upsert({
      where: {
        pabellon_identificador: {
          pabellon: esp.pabellon,
          identificador: esp.identificador,
        },
      },
      update: {
        tipo: esp.tipo,
        piso: esp.piso,
        aforoNominal: esp.aforoNominal,
        softwareInstalado: esp.softwareInstalado ?? [],
        pcsMalogradas: esp.pcsMalogradas ?? null,
      },
      create: {
        identificador: esp.identificador,
        tipo: esp.tipo,
        pabellon: esp.pabellon,
        piso: esp.piso,
        aforoNominal: esp.aforoNominal,
        softwareInstalado: esp.softwareInstalado ?? [],
        pcsMalogradas: esp.pcsMalogradas ?? null,
      },
    });

    espaciosCreados.push({
      ...esp,
      id: registro.id,
    });
  }

  // 2. Validar y construir relaciones simétricas
  const relaciones = validarYConstruirContiguedadesSimetricas(espaciosCreados, CONTIGUEDADES_SEED);

  // 3. Sembrar contigüidades simétricas de forma idempotente
  for (const rel of relaciones) {
    await prisma.espacioContiguo.upsert({
      where: {
        espacioIdA_espacioIdB: {
          espacioIdA: rel.idA,
          espacioIdB: rel.idB,
        },
      },
      update: {},
      create: {
        espacioIdA: rel.idA,
        espacioIdB: rel.idB,
      },
    });
  }

  return {
    espaciosSembrados: espaciosCreados.length,
    contiguedadesSembradas: relaciones.length,
  };
}

/**
 * Backfill del catálogo de software (Spec 08, §6 / Issue 4.27).
 *
 * Lee los textos libres que hoy viven en `Espacio.softwareInstalado` y
 * `Seccion.stackSoftwareRequerido`, los resuelve contra el catálogo `Software` y crea las
 * relaciones `EspacioSoftware` / `SeccionSoftware`.
 *
 * Garantías:
 * - **Idempotente:** usa `upsert` sobre `(nombreNormalizado, version)` y `createMany` con
 *   `skipDuplicates`, así que correrlo dos veces no duplica filas.
 * - **Aditivo:** nunca escribe ni borra las columnas antiguas; solo agrega filas nuevas.
 * - **No adivina:** los textos dudosos se reportan para revisión manual en lugar de inventar
 *   un nombre o una versión.
 */

import { CategoriaSoftware, ComparacionVersion, PrismaClient } from '@prisma/client';
import { MotivoAmbiguedad, SoftwareParseado, parsearNombreVersion } from '../lib/software';

export type OrigenSoftware = 'ESPACIO' | 'SECCION';

export interface CasoAmbiguedad {
  texto: string;
  origenes: OrigenSoftware[];
  /** Ids de los espacios o secciones donde aparece el texto. */
  ids: string[];
  nombre: string;
  version: string;
  motivos: MotivoAmbiguedad[];
}

export interface ReporteBackfillSoftware {
  /** Textos distintos encontrados en ambas columnas (excluye cadenas vacías). */
  textosAnalizados: number;
  /** Filas de `Software` que no existían antes de esta corrida. */
  softwareCreados: number;
  /** Filas de `Software` que ya existían y se reutilizaron. */
  softwareExistentes: number;
  instalacionesCreadas: number;
  requerimientosCreados: number;
  /** Cadenas vacías encontradas en las columnas antiguas. */
  textosVacios: number;
  /** Textos que conviene revisar a mano antes de cerrar el Issue 4.28. */
  ambiguos: CasoAmbiguedad[];
  /** Mismo `(nombre, versión)` escrito de varias formas (p. ej. "Python 3.12" y "python 3.12"). */
  grafiasDuplicadas: Array<{ nombreNormalizado: string; version: string; textos: string[] }>;
  /** Filas que no se migraron porque violan una regla de integridad (Spec 08, §2.4). */
  omitidos: string[];
}

interface TextoEncontrado {
  texto: string;
  origen: OrigenSoftware;
  /** `espacioId` o `seccionId` según el origen. */
  id: string;
  parseado: SoftwareParseado;
}

function claveSoftware(nombreNormalizado: string, version: string): string {
  return `${nombreNormalizado}\u0000${version}`;
}

/**
 * Ejecuta el backfill completo. Pensado para correr contra una base ya migrada con
 * `20261020000000_catalogo_software`. No abre una transacción global para poder reanudarse
 * si falla a mitad de camino (las filas ya creadas se reutilizan en la siguiente corrida).
 */
export async function ejecutarBackfillSoftware(
  prisma: PrismaClient,
): Promise<ReporteBackfillSoftware> {
  const [espacios, secciones, softwareAntes] = await Promise.all([
    prisma.espacio.findMany({
      where: { softwareInstalado: { isEmpty: false } },
      select: { id: true, tipo: true, identificador: true, softwareInstalado: true },
      orderBy: { id: 'asc' },
    }),
    prisma.seccion.findMany({
      where: { stackSoftwareRequerido: { isEmpty: false } },
      select: { id: true, tipoEspacioRequerido: true, stackSoftwareRequerido: true },
      orderBy: { id: 'asc' },
    }),
    prisma.software.count(),
  ]);

  const omitidos: string[] = [];
  const encontrados: TextoEncontrado[] = [];
  const textosVaciosPorOrigen = { ESPACIO: 0, SECCION: 0 } as Record<OrigenSoftware, number>;

  const acumular = (origen: OrigenSoftware, id: string, valores: string[]): void => {
    for (const valor of valores) {
      const texto = valor.trim();
      if (texto === '') {
        textosVaciosPorOrigen[origen]++;
        continue;
      }
      encontrados.push({ texto, origen, id, parseado: parsearNombreVersion(texto) });
    }
  };

  for (const espacio of espacios) {
    if (espacio.tipo !== 'LABORATORIO') {
      omitidos.push(
        `Espacio ${espacio.identificador} (${espacio.id}): es ${espacio.tipo} y tiene software instalado; no se migró (Spec 08, §2.4).`,
      );
      continue;
    }
    acumular('ESPACIO', espacio.id, espacio.softwareInstalado);
  }

  for (const seccion of secciones) {
    if (seccion.tipoEspacioRequerido !== 'LABORATORIO') {
      omitidos.push(
        `Sección ${seccion.id}: requiere ${seccion.tipoEspacioRequerido} y declara software; no se migró (Spec 08, §2.4).`,
      );
      continue;
    }
    acumular('SECCION', seccion.id, seccion.stackSoftwareRequerido);
  }

  // Una fila de catálogo por (nombre normalizado, versión). La primera grafía encontrada define
  // el nombre visible; el resto se lista en `grafiasDuplicadas`.
  const filas = new Map<
    string,
    { nombre: string; nombreNormalizado: string; version: string; textos: Set<string> }
  >();

  for (const { texto, parseado } of encontrados) {
    const clave = claveSoftware(parseado.nombreNormalizado, parseado.version);
    const fila = filas.get(clave);
    if (fila) {
      fila.textos.add(texto);
    } else {
      filas.set(clave, {
        nombre: parseado.nombre,
        nombreNormalizado: parseado.nombreNormalizado,
        version: parseado.version,
        textos: new Set([texto]),
      });
    }
  }

  const resueltos = new Map<string, string>();
  for (const clave of [...filas.keys()].sort((a, b) => a.localeCompare(b))) {
    const fila = filas.get(clave)!;
    const creada = await prisma.software.upsert({
      where: {
        nombreNormalizado_version: {
          nombreNormalizado: fila.nombreNormalizado,
          version: fila.version,
        },
      },
      update: {},
      create: {
        nombre: fila.nombre,
        nombreNormalizado: fila.nombreNormalizado,
        version: fila.version,
        categoria: CategoriaSoftware.OTRO,
      },
      select: { id: true },
    });
    resueltos.set(clave, creada.id);
  }

  const instalaciones = new Map<string, { espacioId: string; softwareId: string }>();
  const requerimientos = new Map<
    string,
    { seccionId: string; softwareId: string; comparacionVersion: ComparacionVersion }
  >();

  for (const { origen, id, parseado } of encontrados) {
    const softwareId = resueltos.get(claveSoftware(parseado.nombreNormalizado, parseado.version));
    if (!softwareId) continue;

    if (origen === 'ESPACIO') {
      instalaciones.set(`${id}\u0000${softwareId}`, { espacioId: id, softwareId });
    } else {
      requerimientos.set(`${id}\u0000${softwareId}`, {
        seccionId: id,
        softwareId,
        // Antes se exigía que el texto coincidiera completo (nombre + versión). `EXACTA`
        // conserva ese comportamiento y `CUALQUIERA` aplica solo cuando no hay versión.
        comparacionVersion:
          parseado.version === '' ? ComparacionVersion.CUALQUIERA : ComparacionVersion.EXACTA,
      });
    }
  }

  const [instalacionesCreadas, requerimientosCreados, softwareDespues] = await Promise.all([
    instalaciones.size > 0
      ? prisma.espacioSoftware
          .createMany({ data: [...instalaciones.values()], skipDuplicates: true })
          .then((r) => r.count)
      : Promise.resolve(0),
    requerimientos.size > 0
      ? prisma.seccionSoftware
          .createMany({ data: [...requerimientos.values()], skipDuplicates: true })
          .then((r) => r.count)
      : Promise.resolve(0),
    prisma.software.count(),
  ]);

  const textos = new Set(encontrados.map((e) => e.texto));

  // Un texto puede aparecer en varios espacios/secciones: se agrupa por texto.
  const ambiguos = new Map<string, CasoAmbiguedad>();
  for (const { texto, origen, id, parseado } of encontrados) {
    if (parseado.motivos.length === 0) continue;
    const caso = ambiguos.get(texto) ?? {
      texto,
      origenes: [],
      ids: [],
      nombre: parseado.nombre,
      version: parseado.version,
      motivos: parseado.motivos,
    };
    if (!caso.origenes.includes(origen)) caso.origenes.push(origen);
    if (!caso.ids.includes(id)) caso.ids.push(id);
    ambiguos.set(texto, caso);
  }

  const softwareCreados = softwareDespues - softwareAntes;

  return {
    textosAnalizados: textos.size,
    softwareCreados,
    softwareExistentes: resueltos.size - softwareCreados,
    instalacionesCreadas,
    requerimientosCreados,
    textosVacios: textosVaciosPorOrigen.ESPACIO + textosVaciosPorOrigen.SECCION,
    ambiguos: [...ambiguos.values()]
      .map((caso) => ({ ...caso, ids: [...caso.ids].sort((a, b) => a.localeCompare(b)) }))
      .sort((a, b) => a.texto.localeCompare(b.texto)),
    grafiasDuplicadas: [...filas.values()]
      .filter((fila) => fila.textos.size > 1)
      .map((fila) => ({
        nombreNormalizado: fila.nombreNormalizado,
        version: fila.version,
        textos: [...fila.textos].sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) =>
        `${a.nombreNormalizado} ${a.version}`.localeCompare(`${b.nombreNormalizado} ${b.version}`),
      ),
    omitidos: omitidos.sort((a, b) => a.localeCompare(b)),
  };
}

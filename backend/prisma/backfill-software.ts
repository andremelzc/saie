/**
 * backfill-software.ts — Issue 4.27 (Spec 08, §6)
 *
 * Migra los textos libres de `Espacio.softwareInstalado` y `Seccion.stackSoftwareRequerido`
 * al catálogo `Software` y a sus relaciones. Es idempotente y no modifica las columnas
 * antiguas (su borrado es la segunda migración del Issue 4.28).
 *
 * Uso:
 *   npm run prisma:backfill-software
 *
 * Variables de entorno opcionales:
 *   BACKFILL_REPORTE=ruta/al/reporte.json   → dónde escribir el reporte (por defecto
 *                                             `prisma/backfill-software-reporte.json`)
 *
 * Códigos de salida: 0 si todo se migró; 1 si hubo espacios/secciones omitidos por integridad.
 * Los textos ambiguos NO hacen fallar el script: quedan en el reporte para revisión manual.
 */

import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { ejecutarBackfillSoftware } from '../src/services/softwareBackfill.service';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('=========================================');
  console.log('  SAIE — Backfill del catálogo de software');
  console.log('=========================================');

  const reporte = await ejecutarBackfillSoftware(prisma);

  const destino = process.env.BACKFILL_REPORTE
    ? path.resolve(process.env.BACKFILL_REPORTE)
    : path.resolve(__dirname, 'backfill-software-reporte.json');

  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, `${JSON.stringify(reporte, null, 2)}\n`, 'utf8');

  console.log('');
  console.log(`  Textos analizados:        ${reporte.textosAnalizados}`);
  console.log(`  Software creado:          ${reporte.softwareCreados}`);
  console.log(`  Software reutilizado:     ${reporte.softwareExistentes}`);
  console.log(`  Instalaciones creadas:    ${reporte.instalacionesCreadas}`);
  console.log(`  Requerimientos creados:   ${reporte.requerimientosCreados}`);
  console.log(`  Textos vacíos ignorados:  ${reporte.textosVacios}`);

  if (reporte.ambiguos.length > 0) {
    console.log('');
    console.log(`  ATENCIÓN: ${reporte.ambiguos.length} texto(s) ambiguo(s) para revisión manual:`);
    for (const caso of reporte.ambiguos) {
      console.log(
        `    - "${caso.texto}" → nombre "${caso.nombre}", versión "${caso.version}" [${caso.motivos.join(', ')}]`,
      );
    }
  }

  if (reporte.grafiasDuplicadas.length > 0) {
    console.log('');
    console.log(`  Se unificaron ${reporte.grafiasDuplicadas.length} software con varias grafías.`);
  }

  if (reporte.omitidos.length > 0) {
    console.log('');
    console.log(`  ATENCIÓN: ${reporte.omitidos.length} fila(s) omitida(s) por reglas de integridad:`);
    for (const aviso of reporte.omitidos) console.log(`    - ${aviso}`);
  }

  console.log('');
  console.log(`  Reporte escrito en: ${destino}`);
  console.log('=========================================');

  if (reporte.omitidos.length > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error('Error durante el backfill del catálogo de software:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/**
 * vincular-jefatura.ts — Issue 4.59 (riesgo R17 de la auditoría)
 *
 * Deja a toda cuenta de Jefatura a cargo de todos los laboratorios (tabla `EspacioResponsable`).
 * Es el mismo paso que ahora hace el seed, pero sin recargar el Excel: sirve para corregir una
 * base que ya tiene datos.
 *
 * Idempotente: correrlo dos veces no duplica vínculos.
 *
 * Uso:
 *   npm run prisma:vincular-jefatura
 */

import { PrismaClient } from '@prisma/client';
import { vincularJefaturaConLaboratorios } from '../src/services/responsables.service';

const prisma = new PrismaClient();

async function main() {
  const vinculos = await vincularJefaturaConLaboratorios(prisma);
  const total = await prisma.espacioResponsable.count();
  console.log(`✅ ${vinculos} vínculo(s) nuevo(s). Total de vínculos Jefatura–laboratorio: ${total}.`);
}

main()
  .catch((e) => {
    console.error('❌ Error al vincular Jefatura con los laboratorios:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

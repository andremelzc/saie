/**
 * cargar-catalogo-software.ts — Issue 6.14 (riesgo R41 de la auditoría)
 *
 * Carga el catálogo de software aprobado por el equipo (Anexo B de `docs/riesgos_y_brechas.md`,
 * datos en `src/data/catalogoSoftwareAprobado.ts`): los programas del catálogo, el software de
 * cada laboratorio (imagen base y general en todos, el especializado según B.4) y los requisitos
 * de las secciones de laboratorio activas de los periodos que no están cerrados.
 *
 * Es aditivo e idempotente: no borra ni cambia lo que ya existe y correrlo dos veces no duplica.
 * Después hay que correr la asignación para que el motor tenga en cuenta los requisitos.
 *
 * Uso:
 *   CATALOGO_SIMULAR=1 npm run prisma:cargar-catalogo-software   → muestra el plan, no escribe
 *   npm run prisma:cargar-catalogo-software                       → aplica el plan
 */

import { PrismaClient } from '@prisma/client';
import {
  aplicarCargaCatalogo,
  leerDatosParaCatalogo,
  planificarCargaCatalogo,
  resumirPlan,
} from '../src/services/catalogoSoftwareAprobado.service';

const prisma = new PrismaClient();
const SIMULAR = process.env.CATALOGO_SIMULAR === '1';

async function main() {
  const { laboratorios, secciones } = await leerDatosParaCatalogo(prisma);
  const plan = planificarCargaCatalogo(laboratorios, secciones);

  console.log('💾 Catálogo de software aprobado (Anexo B)');
  for (const linea of resumirPlan(plan)) console.log(linea);

  if (SIMULAR) {
    console.log('\nSimulación: no se escribió nada. Quita CATALOGO_SIMULAR para aplicarlo.');
    return;
  }

  const r = await aplicarCargaCatalogo(prisma, plan);
  console.log(
    `\n✅ ${r.programasNuevos} programa(s), ${r.instalacionesNuevas} instalación(es) y ` +
      `${r.requisitosNuevos} requisito(s) nuevos.`,
  );
  console.log('Siguiente paso: correr la asignación desde el inicio de Coordinación.');
}

main()
  .catch((e) => {
    console.error('❌ Error al cargar el catálogo de software:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

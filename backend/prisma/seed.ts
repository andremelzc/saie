/**
 * seed.ts — Issue #219: Script de seed
 *
 * Carga la base desde el Excel `prisma/data/seed-plantilla.xlsx` (espacios, contigüidades,
 * docentes, cursos, secciones, horarios, alumnos y matrículas). No hay datos sintéticos:
 * lo que no esté en el Excel no existe en la base.
 *
 * - Valida TODO el archivo antes de tocar la base; si hay errores los lista (hoja y fila) y sale.
 * - Es idempotente (upsert): correrlo dos veces no duplica registros.
 * - Las cuentas de alumnos y docentes usan el código como usuario y como clave inicial.
 *
 * Uso:
 *   npm run prisma:seed
 *
 * Variables de entorno opcionales:
 *   SEED_ARCHIVO=ruta/al/archivo.xlsx   → usa otro Excel
 *   SEED_SOLO_VALIDAR=1                 → lee y valida el Excel sin conectarse a la base
 */

import path from 'path';
import bcrypt from 'bcrypt';
import { PrismaClient, RolCuenta } from '@prisma/client';
import {
  calcularAnonimos,
  cargarPlantilla,
  leerPlantilla,
} from '../src/services/plantilla.seed';

const prisma = new PrismaClient();

const RUTA_EXCEL = process.env.SEED_ARCHIVO
  ? path.resolve(process.env.SEED_ARCHIVO)
  : path.resolve(__dirname, 'data', 'seed-plantilla.xlsx');
const SOLO_VALIDAR = process.env.SEED_SOLO_VALIDAR === '1';

// ============================================================
// CUENTAS DE SISTEMA
// ============================================================

const CUENTAS_SISTEMA = [
  {
    usuarioLogin: 'coordinacion',
    clave: 'saie-coord-2026',
    rol: RolCuenta.COORDINACION_ACADEMICA,
  },
  {
    usuarioLogin: 'jefatura',
    clave: 'saie-jef-2026',
    rol: RolCuenta.JEFATURA_LABORATORIOS,
  },
] as const;

async function main() {
  console.log('🌱 SAIE Seed');
  console.log('=========================================');
  console.log(`Archivo: ${RUTA_EXCEL}`);
  console.log('');

  // PASO 0: leer y validar el Excel (no toca la base)
  const { datos, errores, avisos } = await leerPlantilla(RUTA_EXCEL);

  for (const a of avisos) console.warn(`  ⚠️  ${a}`);
  if (avisos.length > 0) console.log('');

  if (errores.length > 0) {
    console.error(`❌ El Excel tiene ${errores.length} error(es). No se cargó nada:`);
    for (const e of errores.slice(0, 50)) console.error(`   • ${e}`);
    if (errores.length > 50) console.error(`   … y ${errores.length - 50} más`);
    process.exit(1);
  }

  const anonimos = calcularAnonimos(datos).reduce((suma, g) => suma + g.cantidad, 0);
  console.log('📄 Contenido del Excel (validado):');
  console.log(`   Espacios:     ${datos.espacios.length} (${datos.espacios.filter((e) => e.habilitado === false).length} deshabilitados)`);
  console.log(`   Contiguos:    ${datos.contiguos.length} pares`);
  console.log(`   Docentes:     ${datos.docentes.length}`);
  console.log(`   Secciones:    ${datos.secciones.length}`);
  console.log(`   Horarios:     ${datos.horarios.length}`);
  console.log(`   Alumnos reales: ${datos.alumnos.length} (${datos.matriculas.length} matrículas)`);
  console.log(`   Matriculados anónimos a generar: ${anonimos}`);
  console.log('');

  if (SOLO_VALIDAR) {
    console.log('✅ Validación correcta (SEED_SOLO_VALIDAR=1: no se tocó la base).');
    return;
  }

  // PASO 1: cuentas de sistema
  console.log('[0/6] Cuentas de sistema...');
  for (const c of CUENTAS_SISTEMA) {
    const claveHash = await bcrypt.hash(c.clave, 10);
    await prisma.cuenta.upsert({
      where: { usuarioLogin: c.usuarioLogin },
      update: {},
      create: { rol: c.rol, usuarioLogin: c.usuarioLogin, claveHash, debeCambiarClave: false },
    });
    console.log(`     ✅ ${c.usuarioLogin} (${c.rol})`);
  }

  // PASOS 2-6: todo lo que viene del Excel
  const resumen = await cargarPlantilla(prisma, datos, (m) => console.log(m));

  if (resumen.erroresImportadores.length > 0) {
    console.warn(`  ⚠️  ${resumen.erroresImportadores.length} error(es) al importar:`);
    for (const e of resumen.erroresImportadores.slice(0, 30)) console.warn(`     • ${e}`);
  }

  console.log('');
  console.log('  📋 CARGADO');
  console.log('  ─────────────────────────────────────────');
  console.log(`  Espacios: ${resumen.espacios} · Contigüidades: ${resumen.contiguedades}`);
  console.log(`  Docentes: ${resumen.docentes} · Secciones: ${resumen.secciones} · Horarios: ${resumen.horarios}`);
  console.log(`  Alumnos reales: ${resumen.alumnosReales} (${resumen.matriculasReales} matrículas)`);
  console.log(`  Anónimos: ${resumen.alumnosAnonimos} alumnos (${resumen.matriculasAnonimas} matrículas)`);
  console.log('');
  console.log('  🔑 Credenciales (usuario / clave):');
  console.log('     coordinacion / saie-coord-2026   (administrador)');
  console.log('     Docentes y alumnos reales: código / código');
  console.log('');
  console.log('  ▶ Siguiente paso: POST /api/v1/asignaciones/batch { "periodo": "2026-2" }');
  console.log('=========================================');
  console.log('✅ Seed completado.');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

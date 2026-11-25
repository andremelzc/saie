/**
 * restablecer-sistema.ts — Issue 4.61 (riesgo R20 de la auditoría)
 *
 * Restablece la clave de una cuenta de sistema (Coordinación Académica o Jefatura de Laboratorios)
 * a una clave inicial aleatoria y exige su cambio en el próximo ingreso.
 *
 * Uso:
 *   npx tsx prisma/restablecer-sistema.ts <usuarioLogin>
 */

import { PrismaClient, RolCuenta } from '@prisma/client';
import bcrypt from 'bcrypt';
import { generarClaveInicial } from '../src/lib/claves';

const prisma = new PrismaClient();
const RONDAS_BCRYPT = 10;

export async function restablecerClaveSistema(
  usuarioLogin: string,
  db: Pick<PrismaClient, 'cuenta'> = prisma,
): Promise<{ usuarioLogin: string; rol: RolCuenta; claveInicial: string }> {
  const cuenta = await db.cuenta.findUnique({
    where: { usuarioLogin },
  });

  if (!cuenta) {
    throw new Error(`No existe ninguna cuenta con el usuario login '${usuarioLogin}'`);
  }

  if (
    cuenta.rol !== RolCuenta.COORDINACION_ACADEMICA &&
    cuenta.rol !== RolCuenta.JEFATURA_LABORATORIOS
  ) {
    throw new Error(
      `La cuenta '${usuarioLogin}' tiene rol ${cuenta.rol}. Este procedimiento solo aplica a cuentas de sistema (COORDINACION_ACADEMICA o JEFATURA_LABORATORIOS).`,
    );
  }

  const claveInicial = generarClaveInicial();
  const claveHash = await bcrypt.hash(claveInicial, RONDAS_BCRYPT);

  await db.cuenta.update({
    where: { id: cuenta.id },
    data: {
      claveHash,
      debeCambiarClave: true,
    },
  });

  return {
    usuarioLogin: cuenta.usuarioLogin,
    rol: cuenta.rol,
    claveInicial,
  };
}

async function main() {
  const usuario = process.argv[2];
  if (!usuario) {
    console.error('Uso: npx tsx prisma/restablecer-sistema.ts <usuarioLogin>');
    process.exit(1);
  }

  const res = await restablecerClaveSistema(usuario);
  console.log(`✅ Clave restablecida para ${res.usuarioLogin} (${res.rol})`);
  console.log(`🔑 Clave temporal: ${res.claveInicial}`);
  console.log(`⚠️  El usuario deberá cambiar la clave en el primer inicio de sesión.`);
}

if (typeof require !== 'undefined' && require.main === module) {
  main()
    .catch((e) => {
      console.error('❌ Error al restablecer la clave:', e.message);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

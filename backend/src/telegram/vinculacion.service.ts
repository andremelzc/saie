import { PrismaClient, RolCuenta } from '@prisma/client';
import { verificarCredenciales } from '../services/auth.service';

export type ResultadoVinculacion =
  | { resultado: 'VINCULADO'; nombre: string }
  | { resultado: 'CREDENCIALES_INVALIDAS' }
  | { resultado: 'CHAT_EN_USO' };

/**
 * Issue 3.25: vincula un chat de Telegram con un alumno, verificando su código y su clave de
 * SAIE igual que el login. Todo fallo de credenciales responde lo mismo (no se revela si el
 * código existe).
 *
 * - Un chat activo de otro alumno no se pisa: devuelve `CHAT_EN_USO` (debe darse de baja antes).
 * - Un chat que quedó inactivo de otro alumno se libera, porque `chat_id` es único.
 * - Si el alumno ya tenía una fila (activa o de baja) se reutiliza y se reactiva: `alumno_id`
 *   es único, así nunca hay dos vinculaciones activas del mismo alumno.
 */
export async function vincularChat(
  chatId: string,
  codigoAlumno: string,
  clave: string,
  prisma: PrismaClient,
): Promise<ResultadoVinculacion> {
  const cuenta = await verificarCredenciales(codigoAlumno, clave, [RolCuenta.ALUMNO], prisma);
  const alumno = cuenta ? await prisma.alumno.findUnique({ where: { cuentaId: cuenta.id } }) : null;
  if (!alumno) {
    return { resultado: 'CREDENCIALES_INVALIDAS' };
  }

  return prisma.$transaction(async (tx) => {
    const enElChat = await tx.vinculacionTelegram.findUnique({ where: { chatId } });
    if (enElChat && enElChat.alumnoId !== alumno.id) {
      if (enElChat.activo) {
        return { resultado: 'CHAT_EN_USO' as const };
      }
      await tx.vinculacionTelegram.delete({ where: { id: enElChat.id } });
    }

    await tx.vinculacionTelegram.upsert({
      where: { alumnoId: alumno.id },
      create: { alumnoId: alumno.id, chatId },
      update: { chatId, activo: true, fechaVinculacion: new Date(), fechaBaja: null },
    });
    return { resultado: 'VINCULADO' as const, nombre: alumno.nombre };
  });
}

/** Da de baja la vinculación activa de un chat. `false` si no había ninguna activa. */
export async function desvincularChat(
  chatId: string,
  prisma: Pick<PrismaClient, 'vinculacionTelegram'>,
): Promise<boolean> {
  const { count } = await prisma.vinculacionTelegram.updateMany({
    where: { chatId, activo: true },
    data: { activo: false, fechaBaja: new Date() },
  });
  return count > 0;
}

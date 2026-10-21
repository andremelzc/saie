import { Prisma, RolCuenta } from '@prisma/client';
import { HttpError } from '../lib/http';
import { TokenPayload } from '../types/auth';

/**
 * Issue 4.8: Coordinación Académica opera sobre cualquier espacio; Jefatura de Laboratorios
 * solo sobre los que tiene a su cargo (tabla EspacioResponsable). Cualquier otro rol, 403.
 */
export async function verificarAccesoEspacio(
  auth: TokenPayload,
  espacioId: string,
  db: Pick<Prisma.TransactionClient, 'espacioResponsable'>,
): Promise<void> {
  if (auth.rol === RolCuenta.COORDINACION_ACADEMICA) {
    return;
  }

  if (auth.rol === RolCuenta.JEFATURA_LABORATORIOS) {
    const responsable = await db.espacioResponsable.findUnique({
      where: { cuentaId_espacioId: { cuentaId: auth.sub, espacioId } },
    });
    if (responsable) {
      return;
    }
  }

  throw new HttpError(403, 'No tienes asignado este laboratorio');
}

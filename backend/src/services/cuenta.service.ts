import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { HttpError } from '../lib/http';

const RONDAS_BCRYPT = 10;
export const LONGITUD_MINIMA_CLAVE = 8;

export const CambiarClaveSchema = z
  .object({
    claveActual: z.string().min(1, 'La clave actual es requerida'),
    claveNueva: z
      .string()
      .min(
        LONGITUD_MINIMA_CLAVE,
        `La clave nueva debe tener al menos ${LONGITUD_MINIMA_CLAVE} caracteres`,
      )
      .max(72, 'La clave nueva no puede superar los 72 caracteres'),
  })
  .strict();

export type CambiarClaveInput = z.infer<typeof CambiarClaveSchema>;

/**
 * Issue 4.21: cualquier rol cambia su propia clave. Exige la clave actual, que la nueva sea
 * distinta de la actual y de la clave inicial (el código de acceso), y baja la marca
 * `debeCambiarClave`. La cuenta sale del JWT: nadie cambia la clave de otro por esta vía.
 */
export async function cambiarClave(
  cuentaId: string,
  entrada: CambiarClaveInput,
  prisma: Pick<PrismaClient, 'cuenta'>,
): Promise<{ debeCambiarClave: false }> {
  const cuenta = await prisma.cuenta.findUnique({ where: { id: cuentaId } });
  if (!cuenta) {
    throw new HttpError(404, 'La cuenta no existe');
  }

  if (!(await bcrypt.compare(entrada.claveActual, cuenta.claveHash))) {
    throw new HttpError(400, 'La clave actual es incorrecta');
  }

  if (entrada.claveNueva === entrada.claveActual) {
    throw new HttpError(400, 'La clave nueva debe ser distinta de la actual');
  }

  if (entrada.claveNueva === cuenta.usuarioLogin) {
    throw new HttpError(400, 'La clave nueva no puede ser igual al código de acceso');
  }

  await prisma.cuenta.update({
    where: { id: cuenta.id },
    data: {
      claveHash: await bcrypt.hash(entrada.claveNueva, RONDAS_BCRYPT),
      debeCambiarClave: false,
    },
  });

  return { debeCambiarClave: false };
}

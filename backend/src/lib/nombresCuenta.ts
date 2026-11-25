import { PrismaClient } from '@prisma/client';

export interface CuentaConNombreDTO {
  id: string;
  /** Nombre de la persona (alumno o docente) o, si no tiene ficha, su usuario de acceso. */
  nombre: string;
}

/**
 * Nombre legible de cada cuenta, en una sola consulta (sin consulta si no hay ids). Una cuenta
 * eliminada no aparece en el mapa: los registros que la citan conservan solo su id.
 * Lo usan la auditoría (Issues 4.48 y 4.58) y las importaciones (Issue 4.54).
 */
export async function resolverCuentas(
  ids: string[],
  prisma: Pick<PrismaClient, 'cuenta'>,
): Promise<Map<string, CuentaConNombreDTO>> {
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return new Map();
  const filas = await prisma.cuenta.findMany({
    where: { id: { in: unicos } },
    select: {
      id: true,
      usuarioLogin: true,
      alumno: { select: { nombre: true } },
      docente: { select: { nombre: true } },
    },
  });
  return new Map(
    filas.map((c) => [
      c.id,
      { id: c.id, nombre: c.docente?.nombre ?? c.alumno?.nombre ?? c.usuarioLogin },
    ]),
  );
}

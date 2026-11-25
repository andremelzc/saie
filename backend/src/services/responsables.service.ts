import { Prisma, PrismaClient, RolCuenta, TipoEspacio } from '@prisma/client';

type Db = Pick<
  PrismaClient | Prisma.TransactionClient,
  'cuenta' | 'espacio' | 'espacioResponsable'
>;

/**
 * Issue 4.59 (riesgo R17 de la auditoría): la facultad tiene una sola Jefatura, responsable de
 * todos los laboratorios. Jefatura solo opera sobre los espacios de `EspacioResponsable`, así que
 * cada cuenta de Jefatura debe quedar vinculada con cada laboratorio.
 *
 * Idempotente: los vínculos que ya existen se omiten. Devuelve cuántos vínculos nuevos creó.
 */
export async function vincularJefaturaConLaboratorios(db: Db): Promise<number> {
  const [cuentas, laboratorios] = await Promise.all([
    db.cuenta.findMany({
      where: { rol: RolCuenta.JEFATURA_LABORATORIOS },
      select: { id: true },
    }),
    db.espacio.findMany({ where: { tipo: TipoEspacio.LABORATORIO }, select: { id: true } }),
  ]);

  if (cuentas.length === 0 || laboratorios.length === 0) return 0;

  const { count } = await db.espacioResponsable.createMany({
    data: cuentas.flatMap((c) => laboratorios.map((l) => ({ cuentaId: c.id, espacioId: l.id }))),
    skipDuplicates: true,
  });
  return count;
}

/**
 * Issue 4.59: un laboratorio nuevo queda a cargo de toda cuenta de Jefatura en el mismo paso en
 * que se crea. Sin esto, Jefatura no podría verlo ni editarlo.
 */
export async function vincularLaboratorioConJefatura(espacioId: string, db: Db): Promise<void> {
  const cuentas = await db.cuenta.findMany({
    where: { rol: RolCuenta.JEFATURA_LABORATORIOS },
    select: { id: true },
  });
  if (cuentas.length === 0) return;

  await db.espacioResponsable.createMany({
    data: cuentas.map((c) => ({ cuentaId: c.id, espacioId })),
    skipDuplicates: true,
  });
}

import { PrismaClient } from '@prisma/client';

/**
 * Periodo vigente: el configurado en `PERIODO_VIGENTE` o, si no hay configuración, el más
 * reciente entre las secciones cargadas (los periodos tienen formato "2026-1"). `null` si el
 * sistema aún no tiene secciones.
 */
export async function obtenerPeriodoVigente(
  prisma: Pick<PrismaClient, 'seccion'>,
): Promise<string | null> {
  const configurado = process.env.PERIODO_VIGENTE?.trim();
  if (configurado) {
    return configurado;
  }

  const reciente = await prisma.seccion.findFirst({
    orderBy: { periodo: 'desc' },
    select: { periodo: true },
  });
  return reciente ? reciente.periodo : null;
}

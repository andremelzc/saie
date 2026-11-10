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

export interface ListadoPeriodosDTO {
  vigente: string | null;
  periodos: string[];
}

/**
 * Issue 4.42 — Periodos con secciones cargadas (del más reciente al más antiguo) y el vigente.
 * Solo lectura: sin secciones, `periodos` es `[]` y `vigente` es `null` (salvo que
 * `PERIODO_VIGENTE` esté configurado).
 */
export async function listarPeriodos(
  prisma: Pick<PrismaClient, 'seccion'>,
): Promise<ListadoPeriodosDTO> {
  const filas = await prisma.seccion.findMany({
    distinct: ['periodo'],
    orderBy: { periodo: 'desc' },
    select: { periodo: true },
  });
  return {
    vigente: await obtenerPeriodoVigente(prisma),
    periodos: filas.map((f) => f.periodo),
  };
}

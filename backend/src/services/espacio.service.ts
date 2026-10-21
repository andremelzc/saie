import { calcularCapacidadReal } from '../rules/calcularCapacidadReal';

export class EspacioNoEncontradoError extends Error {
  constructor(espacioId: string) {
    super(`El espacio con ID '${espacioId}' no fue encontrado.`);
    this.name = 'EspacioNoEncontradoError';
  }
}

/**
 * Servicio para consultar y evaluar información de Espacios físicos.
 */
export async function obtenerCapacidadRealPorEspacioId(
  espacioId: string,
  prisma: { espacio: { findUnique: (args: { where: { id: string } }) => Promise<any> } },
): Promise<number> {
  const espacio = await prisma.espacio.findUnique({
    where: { id: espacioId },
  });

  if (!espacio) {
    throw new EspacioNoEncontradoError(espacioId);
  }

  return calcularCapacidadReal(espacio);
}

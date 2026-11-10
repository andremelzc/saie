import { leerPlano2D, type FiguraPlano2D } from './plano';

export interface EntradaIndice {
  piso: number;
  figura: FiguraPlano2D;
}

/** Todas las figuras de todos los pisos por id. Las escaleras y ascensores aparecen una vez por piso; gana el primero. */
export function indiceFiguras(planos: Record<number, string>): Map<string, EntradaIndice> {
  const mapa = new Map<string, EntradaIndice>();
  for (const [piso, texto] of Object.entries(planos)) {
    try {
      for (const figura of leerPlano2D(texto).figuras) {
        if (!mapa.has(figura.id)) mapa.set(figura.id, { piso: Number(piso), figura });
      }
    } catch {
      // Un plano ilegible no impide buscar en los demás.
    }
  }
  return mapa;
}

/** Minúsculas y sin tildes, para comparar lo que escribe la persona con los nombres. */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

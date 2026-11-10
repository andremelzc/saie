import { useCallback, useState } from 'react';

export const TAMANOS_PAGINA = [25, 50, 100, 200];
export const TAMANO_POR_DEFECTO = 50;

function leerTamano(clave: string): number {
  try {
    const valor = Number(window.localStorage.getItem(clave));
    return TAMANOS_PAGINA.includes(valor) ? valor : TAMANO_POR_DEFECTO;
  } catch {
    return TAMANO_POR_DEFECTO;
  }
}

function guardarTamano(clave: string, tamano: number): void {
  try {
    window.localStorage.setItem(clave, String(tamano));
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): el tamaño vale solo en esta visita.
  }
}

export interface Paginacion {
  pagina: number;
  tamano: number;
  setPagina: (pagina: number) => void;
  cambiarTamano: (tamano: number) => void;
}

/**
 * Estado de paginación de un listado (Issue 4.39), para usarse con `Paginador`.
 *
 * - El tamaño de página se recuerda entre visitas bajo `claveTamano`.
 * - `firmaFiltros` resume los filtros activos: cuando cambia, la página vuelve a la 1 en el mismo
 *   render, sin pedir antes una página que ya no existe con los filtros nuevos.
 */
export function usePaginacion(claveTamano: string, firmaFiltros: string): Paginacion {
  const [elegida, setElegida] = useState({ pagina: 1, firma: firmaFiltros });
  const [tamano, setTamano] = useState(() => leerTamano(claveTamano));

  const pagina = elegida.firma === firmaFiltros ? elegida.pagina : 1;
  const setPagina = useCallback(
    (nueva: number) => setElegida({ pagina: nueva, firma: firmaFiltros }),
    [firmaFiltros],
  );
  const cambiarTamano = useCallback(
    (nuevo: number) => {
      setTamano(nuevo);
      guardarTamano(claveTamano, nuevo);
      setElegida({ pagina: 1, firma: firmaFiltros });
    },
    [claveTamano, firmaFiltros],
  );

  return { pagina, tamano, setPagina, cambiarTamano };
}

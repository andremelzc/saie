import { useEffect, useState } from 'react';

/**
 * ¿La pantalla es ancha enough para mostrar una tabla completa?
 *
 * El panel muestra el listado de espacios como tabla en escritorio y como tarjetas en móvil.
 * Se decide en JavaScript (y no solo con clases `hidden md:table`) para que en cada momento
 * exista **una sola** versión en el DOM: así no se duplica el contenido para el lector de
 * pantalla ni para las pruebas, y la semántica de tabla o de lista es siempre la correcta.
 *
 * Por debajo de 1024 px (el punto de corte `lg` de Tailwind) se usan las tarjetas.
 */
export const ANCHO_TABLA = 1024;

export function usePantallaAncha(ancho: number = ANCHO_TABLA): boolean {
  const [esAncha, setEsAncha] = useState(() => window.innerWidth >= ancho);

  useEffect(() => {
    const alRedimensionar = () => setEsAncha(window.innerWidth >= ancho);
    window.addEventListener('resize', alRedimensionar);
    return () => window.removeEventListener('resize', alRedimensionar);
  }, [ancho]);

  return esAncha;
}

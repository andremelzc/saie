import React from 'react';

/**
 * Ancho máximo del contenido, con las utilidades estándar de Tailwind:
 *  - `lectura` (`max-w-4xl`): formularios, perfil y ayuda;
 *  - `normal` (`max-w-6xl`): listados y horarios;
 *  - `ancho` (`max-w-7xl`): paneles y tableros.
 */
const ANCHOS = {
  lectura: 'max-w-4xl',
  normal: 'max-w-6xl',
  ancho: 'max-w-7xl',
} as const;

export type AnchoContenedor = keyof typeof ANCHOS;

type Etiqueta = 'div' | 'ul' | 'main';

export interface ContenedorProps extends React.HTMLAttributes<HTMLElement> {
  ancho?: AnchoContenedor;
  /** Elemento HTML a dibujar (por defecto `div`). */
  como?: Etiqueta;
}

/**
 * Contenedor único de cada pantalla: centrado, con un ancho máximo y márgenes laterales que
 * crecen con la pantalla (`px-4 sm:px-6 lg:px-8`). La cabecera, la barra de pestañas y el
 * contenido de una pantalla usan el MISMO `ancho`, así sus bordes calzan en cualquier tamaño de
 * ventana sin tener que ajustar valores a mano.
 */
export const Contenedor: React.FC<ContenedorProps> = ({
  ancho = 'ancho',
  como = 'div',
  className = '',
  children,
  ...resto
}) =>
  React.createElement(
    como,
    { ...resto, className: `mx-auto w-full px-4 sm:px-6 lg:px-8 ${ANCHOS[ancho]} ${className}` },
    children,
  );

export default Contenedor;

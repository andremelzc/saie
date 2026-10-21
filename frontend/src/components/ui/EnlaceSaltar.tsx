import React from 'react';

/** `id` que debe llevar el `<main>` de cada pantalla para que el enlace tenga destino. */
export const ID_CONTENIDO = 'contenido';

/**
 * «Saltar al contenido»: primer elemento enfocable de cada pantalla. Invisible hasta que recibe
 * el foco con el teclado; permite llegar al contenido sin recorrer la cabecera y las pestañas
 * en cada ruta (WCAG 2.4.1). Se maneja con JavaScript y no con el hash de la dirección para no
 * ensuciar la URL ni el historial.
 */
export const EnlaceSaltar: React.FC = () => (
  <a
    href={`#${ID_CONTENIDO}`}
    onClick={(evento) => {
      evento.preventDefault();
      const destino = document.getElementById(ID_CONTENIDO);
      destino?.focus();
      destino?.scrollIntoView?.();
    }}
    className="saie-no-imprimir sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:font-medium focus:text-saie-primary focus:shadow-saie-pop"
  >
    Saltar al contenido
  </a>
);

export default EnlaceSaltar;

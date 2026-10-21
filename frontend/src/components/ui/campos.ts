/**
 * Clases compartidas de los campos del panel. El borde `#8A8578` cumple 3.68:1 sobre blanco
 * (WCAG 1.4.11) y la altura de 48 px deja un área táctil cómoda en móvil.
 * Radio de 10 px y texto de 16 px, como pide la Guía de Estilos §4.5.
 */
export const CLASE_CAMPO =
  'min-h-12 w-full rounded-xl border border-saie-border bg-white px-4 text-base text-saie-text placeholder:text-saie-muted focus:border-saie-primary focus:outline-none focus:ring-3 focus:ring-saie-primary/20';

export const CLASE_ETIQUETA = 'text-sm font-semibold text-saie-text';

export const CLASE_AYUDA = 'm-0 text-sm text-saie-muted';

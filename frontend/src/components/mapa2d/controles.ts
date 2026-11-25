import { clasesBoton } from '../ui/clasesBoton';

/**
 * Controles del mapa: los mismos del resto de la aplicación, en su tamaño compacto de 44 px (el
 * mínimo táctil; el de 48 px sobra en una barra de herramientas). Los botones salen de
 * `clasesBoton` y los campos tienen el radio, el borde (3.68:1, WCAG 1.4.11) y el foco de
 * `CLASE_CAMPO`; así el buscador, el día y la hora, los filtros y «Ampliar mapa» se ven y se miden
 * igual que un formulario cualquiera.
 */

/** Campo de texto o lista desplegable. */
export const CLASE_CAMPO_MAPA =
  'min-h-11 rounded-xl border border-saie-border bg-white px-3 text-sm text-saie-text placeholder:text-saie-muted focus:border-saie-primary focus:outline-none focus:ring-3 focus:ring-saie-primary/20';

/**
 * Botón del mapa. `true` y `false` son un interruptor encendido o apagado (chips y «Ahora»);
 * `'accion'` es un botón de acción (p. ej. «Ampliar mapa»).
 */
export function claseBotonMapa(estado: boolean | 'accion' = false): string {
  if (estado === 'accion') return clasesBoton('secundario', 'sm');
  return clasesBoton(estado ? 'primario' : 'cancelar', 'sm');
}

/** Rótulo de un grupo de controles (el mismo para el buscador, la franja y los filtros). */
export const CLASE_ROTULO_MAPA = 'mb-1 block p-0 text-sm font-medium text-saie-text';

/**
 * Planos SVG de cada piso, tal como los deja `tools/planos` en `assets/planos/`. Se empaquetan
 * con la aplicación (como texto) para que el mapa 2D no dependa de una petición de red.
 */
const crudos = import.meta.glob('../../../../assets/planos/piso-*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** Piso -> texto del SVG. */
export const PLANOS_SVG: Record<number, string> = Object.fromEntries(
  Object.entries(crudos)
    .map(([ruta, texto]) => [Number(/piso-(\d+)\.svg$/.exec(ruta)?.[1]), texto] as const)
    .filter(([piso]) => Number.isFinite(piso))
    .sort(([a], [b]) => a - b),
);

const urls = import.meta.glob('../../../../assets/planos/piso-*.svg', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** Piso -> URL del SVG (para la maqueta 3D, que lo descarga por su cuenta). */
export const PLANOS_URL: Record<number, string> = Object.fromEntries(
  Object.entries(urls)
    .map(([ruta, url]) => [Number(/piso-(\d+)\.svg$/.exec(ruta)?.[1]), url] as const)
    .filter(([piso]) => Number.isFinite(piso))
    .sort(([a], [b]) => a - b),
);

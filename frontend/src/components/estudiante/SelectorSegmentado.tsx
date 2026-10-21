export interface OpcionSegmentada<T extends string> {
  valor: T;
  etiqueta: string;
}

export interface SelectorSegmentadoProps<T extends string> {
  opciones: OpcionSegmentada<T>[];
  valor: T;
  onCambiar: (valor: T) => void;
  /** Etiqueta accesible del grupo (p. ej. «Tipo de vista del horario»). */
  etiquetaGrupo: string;
  /** Deshabilita todas las opciones (p. ej. mientras no hay un laboratorio elegido). */
  deshabilitado?: boolean;
  className?: string;
}

/**
 * Control segmentado (Guía de diseño 2.3, «Día / Semana»). Cada opción es un botón con
 * `aria-pressed`, con área táctil de al menos 44 px. Las columnas son de igual ancho y la opción
 * activa se marca con una pastilla guinda que se desliza de una a otra.
 */
export function SelectorSegmentado<T extends string>({
  opciones,
  valor,
  onCambiar,
  etiquetaGrupo,
  deshabilitado = false,
  className = '',
}: SelectorSegmentadoProps<T>) {
  const total = Math.max(opciones.length, 1);
  const indice = Math.max(
    0,
    opciones.findIndex((o) => o.valor === valor),
  );

  return (
    <fieldset
      className={`m-0 inline-block min-w-0 rounded-xl border border-saie-divider bg-white p-1 ${className}`}
    >
      <legend className="sr-only">{etiquetaGrupo}</legend>
      <div
        className="relative grid"
        style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
      >
        <span
          aria-hidden="true"
          className="saie-selector-pulgar absolute inset-y-0 left-0 rounded-lg bg-saie-primary shadow-[0_2px_6px_rgba(123,17,19,0.35)]"
          style={{ width: `${100 / total}%`, transform: `translateX(${indice * 100}%)` }}
        />
        {opciones.map((opcion) => {
          const activa = opcion.valor === valor;
          return (
            <button
              key={opcion.valor}
              type="button"
              aria-pressed={activa}
              disabled={deshabilitado}
              onClick={() => onCambiar(opcion.valor)}
              className={`relative min-h-11 min-w-24 cursor-pointer whitespace-nowrap rounded-lg bg-transparent px-4 text-sm transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                activa
                  ? 'font-bold text-white'
                  : 'font-medium text-saie-text hover:bg-saie-primary/5'
              }`}
            >
              {opcion.etiqueta}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default SelectorSegmentado;

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
  className?: string;
}

/**
 * Control segmentado (Guía de diseño 2.3, «Día / Semana»). Cada opción es un botón con
 * `aria-pressed`, con área táctil de al menos 44 px y la opción activa en guinda.
 */
export function SelectorSegmentado<T extends string>({
  opciones,
  valor,
  onCambiar,
  etiquetaGrupo,
  className = '',
}: SelectorSegmentadoProps<T>) {
  return (
    <fieldset
      className={`m-0 inline-flex min-w-0 rounded-xl border border-saie-divider bg-white p-1 ${className}`}
    >
      <legend className="sr-only">{etiquetaGrupo}</legend>
      {opciones.map((opcion) => {
        const activa = opcion.valor === valor;
        return (
          <button
            key={opcion.valor}
            type="button"
            aria-pressed={activa}
            onClick={() => onCambiar(opcion.valor)}
            className={`min-h-11 min-w-24 flex-1 cursor-pointer rounded-lg px-4 text-sm transition-colors ${
              activa
                ? 'bg-saie-primary font-bold text-white'
                : 'font-medium text-saie-text hover:bg-saie-primary/5'
            }`}
          >
            {opcion.etiqueta}
          </button>
        );
      })}
    </fieldset>
  );
}

export default SelectorSegmentado;

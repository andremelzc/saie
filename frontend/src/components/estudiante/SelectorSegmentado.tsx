import React, { useRef } from 'react';
import { idPanelPestana, idPestana } from './idsPestanas';

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
  /**
   * Si se da, el control se anuncia como pestañas (`tablist`/`tab`) y se opera con flechas, Inicio
   * y Fin (Issue 3.46). Úsalo cuando cada opción cambia el contenido de un panel: ese panel debe
   * llevar `role="tabpanel"`, `id={idPanelPestana(idBase, valor)}` y
   * `aria-labelledby={idPestana(idBase, valor)}`. Sin `idBase` es un grupo de botones (`aria-pressed`).
   */
  idBase?: string;
  className?: string;
}

/**
 * Control segmentado (Guía de diseño 2.3, «Día / Semana»). Cada opción es un botón con
 * `aria-pressed`, con área táctil de al menos 44 px. Las columnas son de igual ancho y la opción
 * activa se marca con una pastilla guinda que se desliza de una a otra.
 *
 * Con `idBase` funciona como pestañas ARIA: solo la activa entra en el orden de tabulación y las
 * flechas mueven la selección.
 */
export function SelectorSegmentado<T extends string>({
  opciones,
  valor,
  onCambiar,
  etiquetaGrupo,
  deshabilitado = false,
  idBase,
  className = '',
}: SelectorSegmentadoProps<T>) {
  const botones = useRef<(HTMLButtonElement | null)[]>([]);
  const comoPestanas = idBase !== undefined;
  const total = Math.max(opciones.length, 1);
  const indice = Math.max(
    0,
    opciones.findIndex((o) => o.valor === valor),
  );

  const alPulsarTecla = (e: React.KeyboardEvent, posicion: number) => {
    const ultimo = opciones.length - 1;
    const destino =
      e.key === 'ArrowRight'
        ? (posicion + 1) % opciones.length
        : e.key === 'ArrowLeft'
          ? (posicion - 1 + opciones.length) % opciones.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? ultimo
              : null;
    if (destino === null) return;
    e.preventDefault();
    onCambiar(opciones[destino].valor);
    botones.current[destino]?.focus();
  };

  const contenido = (
    <>
      <div
        {...(comoPestanas
          ? { role: 'tablist', 'aria-label': etiquetaGrupo, 'aria-orientation': 'horizontal' }
          : {})}
        className="relative grid"
        style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
      >
        <span
          aria-hidden="true"
          className="saie-selector-pulgar absolute inset-y-0 left-0 rounded-lg bg-saie-primary shadow-md"
          style={{ width: `${100 / total}%`, transform: `translateX(${indice * 100}%)` }}
        />
        {opciones.map((opcion, posicion) => {
          const activa = opcion.valor === valor;
          return (
            <button
              key={opcion.valor}
              ref={(el) => {
                botones.current[posicion] = el;
              }}
              type="button"
              {...(comoPestanas
                ? {
                    role: 'tab',
                    id: idPestana(idBase as string, opcion.valor),
                    'aria-selected': activa,
                    'aria-controls': idPanelPestana(idBase as string, opcion.valor),
                    tabIndex: activa ? 0 : -1,
                    onKeyDown: (e: React.KeyboardEvent) => alPulsarTecla(e, posicion),
                  }
                : { 'aria-pressed': activa })}
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
    </>
  );

  const clases = `m-0 inline-block min-w-0 rounded-xl border border-saie-divider bg-white p-1 ${className}`;
  return comoPestanas ? (
    <div className={clases}>{contenido}</div>
  ) : (
    <fieldset className={clases}>
      <legend className="sr-only">{etiquetaGrupo}</legend>
      {contenido}
    </fieldset>
  );
}

export default SelectorSegmentado;

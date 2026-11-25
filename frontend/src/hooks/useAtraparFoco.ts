import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

const SELECTOR_ENFOCABLES =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Cuántos diálogos tienen bloqueado el scroll de la página (un drawer y su confirmación a la vez). */
let bloqueos = 0;
let desbordeOriginal = '';

function bloquearScroll(): void {
  if (bloqueos === 0) {
    desbordeOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  bloqueos += 1;
}

function liberarScroll(): void {
  bloqueos = Math.max(0, bloqueos - 1);
  if (bloqueos === 0) document.body.style.overflow = desbordeOriginal;
}

export interface OpcionesAtraparFoco {
  /** El diálogo está abierto. */
  activo: boolean;
  contenedorRef: RefObject<HTMLElement | null>;
  /** Escape. */
  alEscape: () => void;
  /** Elemento que recibe el foco al abrir; por defecto, el propio contenedor. */
  focoInicial?: () => HTMLElement | null | undefined;
  /** Mientras otro diálogo está encima, este no atrapa Tab ni responde a Escape. */
  pausado?: boolean;
}

/**
 * Comportamiento común de los diálogos modales: bloquea el scroll de la página, lleva el foco al
 * abrir, lo atrapa entre los elementos del diálogo (Tab / Mayús+Tab), cierra con Escape y
 * devuelve el foco a quien lo abrió.
 */
export function useAtraparFoco({
  activo,
  contenedorRef,
  alEscape,
  focoInicial,
  pausado = false,
}: OpcionesAtraparFoco): void {
  const alEscapeRef = useRef(alEscape);
  const focoInicialRef = useRef(focoInicial);
  const pausadoRef = useRef(pausado);

  useEffect(() => {
    alEscapeRef.current = alEscape;
    focoInicialRef.current = focoInicial;
    pausadoRef.current = pausado;
  });

  useEffect(() => {
    if (!activo) return;

    const anterior = document.activeElement as HTMLElement | null;
    bloquearScroll();
    (focoInicialRef.current?.() ?? contenedorRef.current)?.focus();

    const alTeclear = (e: KeyboardEvent) => {
      if (pausadoRef.current) return;
      if (e.key === 'Escape') {
        alEscapeRef.current();
        return;
      }
      if (e.key !== 'Tab') return;

      const enfocables = contenedorRef.current?.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLES);
      if (!enfocables || enfocables.length === 0) return;
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('keydown', alTeclear);
      liberarScroll();
      anterior?.focus?.();
    };
  }, [activo, contenedorRef]);
}

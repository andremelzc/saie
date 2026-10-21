export type VarianteBoton = 'primario' | 'secundario' | 'peligro' | 'cancelar' | 'fantasma';
export type TamanoBoton = 'md' | 'sm';

const VARIANTES: Record<VarianteBoton, string> = {
  primario: 'bg-saie-primary text-white hover:bg-saie-primary-dark active:bg-saie-primary-dark',
  secundario:
    'border border-saie-primary bg-white text-saie-primary hover:bg-saie-primary/5 active:bg-saie-primary/10',
  peligro: 'bg-saie-danger text-white hover:bg-saie-danger-strong active:bg-saie-danger-strong',
  cancelar:
    'border border-saie-border bg-white text-saie-text hover:bg-saie-text/5 active:bg-saie-text/10',
  fantasma: 'bg-transparent text-saie-primary hover:bg-saie-primary/5 active:bg-saie-primary/10',
};

/** Guía §4.6: 48 px como altura de referencia; 44 px es el mínimo absoluto. */
const TAMANOS: Record<TamanoBoton, string> = {
  md: 'min-h-12 px-5 text-base',
  sm: 'min-h-11 px-4 text-sm',
};

/**
 * Clases de un botón del sistema. Las comparten `Boton` y `BotonEnlace` para que un enlace con
 * aspecto de botón (por ejemplo «Cargar horario») sea idéntico a un botón.
 */
export function clasesBoton(
  variante: VarianteBoton = 'primario',
  tamano: TamanoBoton = 'md',
  anchoCompleto = false,
): string {
  return `inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-medium no-underline transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-saie-text disabled:cursor-not-allowed disabled:opacity-50 ${
    anchoCompleto ? 'w-full' : ''
  } ${TAMANOS[tamano]} ${VARIANTES[variante]}`;
}

import React, { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAtraparFoco } from '../../hooks/useAtraparFoco';
import { Boton } from './Boton';

export interface DialogoConfirmacionProps {
  abierto: boolean;
  titulo: string;
  /** Qué va a pasar al confirmar, en una o dos frases. */
  descripcion: React.ReactNode;
  textoConfirmar: string;
  textoCancelar?: string;
  /** `peligro` para acciones destructivas o difíciles de revertir. */
  variante?: 'primario' | 'peligro';
  cargando?: boolean;
  textoCargando?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}

/**
 * Confirmación modal única del sistema (acciones destructivas o que cambian muchos datos).
 * Sustituye a las confirmaciones en línea que cada pantalla armaba a su manera. El foco entra en
 * «Cancelar» cuando la acción es peligrosa, Escape cancela y el foco vuelve a quien la abrió.
 */
export const DialogoConfirmacion: React.FC<DialogoConfirmacionProps> = ({
  abierto,
  titulo,
  descripcion,
  textoConfirmar,
  textoCancelar = 'Cancelar',
  variante = 'primario',
  cargando = false,
  textoCargando,
  onConfirmar,
  onCancelar,
}) => {
  const idTitulo = useId();
  const idDescripcion = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const confirmarRef = useRef<HTMLButtonElement>(null);

  useAtraparFoco({
    activo: abierto,
    contenedorRef: panelRef,
    alEscape: () => {
      if (!cargando) onCancelar();
    },
    focoInicial: () => (variante === 'peligro' ? cancelarRef.current : confirmarRef.current),
  });

  if (!abierto) return null;

  return createPortal(
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="saie-velo absolute inset-0 bg-saie-text/50" aria-hidden="true" />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={idDescripcion}
        className="saie-deslizar relative flex w-full max-w-md flex-col gap-4 rounded-2xl bg-white p-6 shadow-lg"
      >
        <h2 id={idTitulo} className="m-0 text-lg font-bold text-saie-text">
          {titulo}
        </h2>
        <div id={idDescripcion} className="text-sm text-saie-text">
          {descripcion}
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Boton
            ref={cancelarRef}
            variante="cancelar"
            tamano="sm"
            onClick={onCancelar}
            disabled={cargando}
          >
            {textoCancelar}
          </Boton>
          <Boton
            ref={confirmarRef}
            variante={variante}
            tamano="sm"
            onClick={onConfirmar}
            cargando={cargando}
            textoCargando={textoCargando}
          >
            {textoConfirmar}
          </Boton>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default DialogoConfirmacion;

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useAtraparFoco } from '../../hooks/useAtraparFoco';
import { DialogoConfirmacion } from './DialogoConfirmacion';

export type TamanoDrawer = 'sm' | 'md' | 'lg';

/** Ancho según el contenido: detalle corto, formulario, o lectura larga con tablas. */
const ANCHOS: Record<TamanoDrawer, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
};

/**
 * Pie fijo para las acciones de un formulario dentro del drawer: se queda pegado al borde
 * inferior mientras el contenido se desplaza, así «Guardar» y el estado de los cambios no
 * quedan escondidos al final de un formulario largo.
 */
export const CLASE_PIE_DRAWER =
  'sticky bottom-0 z-10 -mx-5 -mb-5 mt-6 border-t border-saie-divider bg-white px-5 py-4';

export interface DrawerProps {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  /** Segunda línea del encabezado: tipo, ubicación u otro dato que da contexto. */
  subtitulo?: string;
  /** Insignia de estado bajo el título (p. ej. «En servicio»). */
  insignia?: React.ReactNode;
  tamano?: TamanoDrawer;
  /** Con `true`, cerrar (×, Escape o clic en el fondo) pide confirmar que se descartan cambios. */
  hayCambios?: boolean;
  /**
   * Identifica la vista actual (detalle, edición…). Cuando cambia, el foco vuelve al primer
   * campo del formulario o, si no hay, al título; así no se pierde al cambiar el contenido.
   */
  vista?: string;
  children: React.ReactNode;
}

const SELECTOR_CAMPOS =
  'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])';

/**
 * Panel lateral accesible: diálogo modal que entra desde la derecha, con encabezado de contexto,
 * cierre con Escape, con el fondo o con «×» (pidiendo confirmación si hay cambios sin guardar),
 * foco atrapado y devuelto a quien lo abrió.
 */
export const Drawer: React.FC<DrawerProps> = ({
  abierto,
  onCerrar,
  titulo,
  subtitulo,
  insignia,
  tamano = 'md',
  hayCambios = false,
  vista,
  children,
}) => {
  const idTitulo = useId();
  const idSubtitulo = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const cuerpoRef = useRef<HTMLDivElement>(null);
  const [confirmando, setConfirmando] = useState(false);
  // Si el drawer se cierra desde fuera con la confirmación abierta, no debe reaparecer al reabrirlo.
  const [abiertoPrevio, setAbiertoPrevio] = useState(abierto);
  if (abierto !== abiertoPrevio) {
    setAbiertoPrevio(abierto);
    if (!abierto) setConfirmando(false);
  }

  const solicitarCierre = useCallback(() => {
    if (hayCambios) setConfirmando(true);
    else onCerrar();
  }, [hayCambios, onCerrar]);

  /** Primer campo del contenido (formulario) o, si no hay, el título del drawer. */
  const focoUtil = useCallback(
    () => cuerpoRef.current?.querySelector<HTMLElement>(SELECTOR_CAMPOS) ?? tituloRef.current,
    [],
  );

  useAtraparFoco({
    activo: abierto,
    contenedorRef: panelRef,
    alEscape: solicitarCierre,
    focoInicial: focoUtil,
    pausado: confirmando,
  });

  // Al cambiar de vista (de detalle a edición y al revés) el foco no se queda en un botón que
  // desaparece: pasa al primer campo o al título.
  const vistaAnterior = useRef(vista);
  useEffect(() => {
    if (!abierto || vistaAnterior.current === vista) return;
    vistaAnterior.current = vista;
    focoUtil()?.focus();
  }, [abierto, vista, focoUtil]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="saie-velo absolute inset-0 bg-saie-text/40"
        onClick={solicitarCierre}
        aria-hidden="true"
      />
      {/*
        Se usa `role="dialog"` en un div y no el elemento `<dialog>`: el nativo exige
        `showModal()` (que jsdom no implementa) y reimplementa el foco, lo que rompería el
        cierre con Escape y la devolución del foco al elemento que lo abrió. La excepción
        está documentada en `sonar-project.properties` (regla typescript:S6819).
      */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={subtitulo ? `${idTitulo} ${idSubtitulo}` : idTitulo}
        className={`saie-deslizar relative flex h-full w-full ${ANCHOS[tamano]} flex-col bg-saie-canvas shadow-lg`}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-saie-divider bg-white px-5 py-4">
          <div className="min-w-0">
            <h2
              id={idTitulo}
              ref={tituloRef}
              tabIndex={-1}
              className="m-0 text-lg font-bold text-saie-text focus:outline-none"
            >
              {titulo}
            </h2>
            {subtitulo && (
              <p id={idSubtitulo} className="m-0 mt-0.5 text-sm text-saie-muted">
                {subtitulo}
              </p>
            )}
            {insignia && <div className="mt-2">{insignia}</div>}
          </div>
          <button
            type="button"
            onClick={solicitarCierre}
            aria-label="Cerrar"
            className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-saie-border bg-white text-xl text-saie-text hover:bg-saie-canvas"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div ref={cuerpoRef} className="min-h-0 flex-1 overflow-y-auto p-5">
          {children}
        </div>
      </div>

      <DialogoConfirmacion
        abierto={confirmando}
        titulo="¿Descartar los cambios?"
        descripcion="Si cierras ahora, se perderán los cambios que no guardaste."
        textoConfirmar="Descartar cambios"
        textoCancelar="Seguir editando"
        variante="peligro"
        onConfirmar={() => {
          setConfirmando(false);
          onCerrar();
        }}
        onCancelar={() => setConfirmando(false)}
      />
    </div>
  );
};

export default Drawer;

import React from 'react';

/** Mensaje de error uniforme con botón de reintento. Se usa en todas las áreas. */
export const AvisoError: React.FC<{ mensaje: string; onReintentar?: () => void }> = ({
  mensaje,
  onReintentar,
}) => (
  <div
    role="alert"
    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-saie-danger/30 bg-saie-danger-soft px-4 py-3 text-sm text-saie-danger-strong"
  >
    <span className="min-w-0 flex-1">{mensaje}</span>
    {onReintentar && (
      <button
        type="button"
        onClick={onReintentar}
        className="min-h-11 cursor-pointer rounded-lg border border-saie-danger/40 bg-white/60 px-4 font-semibold hover:bg-white"
      >
        Reintentar
      </button>
    )}
  </div>
);

export default AvisoError;

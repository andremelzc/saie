import React from 'react';

export type TonoAviso = 'exito' | 'error' | 'info' | 'advertencia';

const ESTILOS: Record<TonoAviso, string> = {
  exito: 'border-saie-success/30 bg-saie-success-soft text-saie-success-strong',
  error: 'border-saie-danger/30 bg-saie-danger-soft text-saie-danger-strong',
  info: 'border-saie-divider bg-white text-saie-text',
  advertencia: 'border-saie-warning-strong/30 bg-saie-warning-soft text-saie-warning-strong',
};

export interface AvisoProps {
  tono?: TonoAviso;
  children: React.ReactNode;
  className?: string;
  /** Por defecto: `alert` para error y `status` para éxito; el resto, sin rol. */
  role?: 'alert' | 'status';
}

/** Rol por defecto del aviso: `alert` para error, `status` para éxito y ninguno para el resto. */
function rolPorDefecto(tono: TonoAviso): 'alert' | 'status' | undefined {
  if (tono === 'error') return 'alert';
  if (tono === 'exito') return 'status';
  return undefined;
}

/** Mensaje inline uniforme. Los errores que exigen corregir algo van junto al control. */
export const Aviso: React.FC<AvisoProps> = ({ tono = 'info', children, className = '', role }) => (
  <div
    role={role ?? rolPorDefecto(tono)}
    className={`rounded-xl border px-4 py-3 text-sm ${ESTILOS[tono]} ${className}`}
  >
    {children}
  </div>
);

export default Aviso;

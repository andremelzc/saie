import React from 'react';
import { CLASE_AYUDA, CLASE_ETIQUETA } from './campos';

export interface CampoProps {
  etiqueta: string;
  /** El control (`input`, `select`…): queda dentro del `<label>`, así que el clic en la etiqueta lo enfoca. */
  children: React.ReactNode;
  /** Texto de ayuda bajo el control (qué escribir y en qué formato). */
  ayuda?: string;
  className?: string;
}

/**
 * Etiqueta + control + ayuda: el patrón que antes se repetía a mano en cada filtro y formulario
 * (`<label><span>…</span><input/></label>`). La etiqueta siempre es visible, nunca solo un
 * `placeholder`.
 */
export const Campo: React.FC<CampoProps> = ({ etiqueta, children, ayuda, className = '' }) => (
  <label className={`flex flex-col gap-1 ${className}`}>
    <span className={CLASE_ETIQUETA}>{etiqueta}</span>
    {children}
    {ayuda && <span className={CLASE_AYUDA}>{ayuda}</span>}
  </label>
);

export default Campo;

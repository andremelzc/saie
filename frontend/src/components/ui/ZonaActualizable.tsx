import React from 'react';

/**
 * Envuelve un listado que se vuelve a pedir al cambiar un filtro (Issue 4.41). Mientras se
 * recarga con los datos anteriores a la vista, los atenúa, marca la zona como ocupada
 * (`aria-busy`) y muestra «Actualizando…», que además se anuncia: sin esto la lista parece
 * definitiva aunque vaya a cambiar.
 *
 * La región de estado vive siempre en el DOM: si se montara con el mensaje, el lector de
 * pantalla no lo anunciaría.
 */
export const ZonaActualizable: React.FC<{
  actualizando: boolean;
  /**
   * La lista a la vista es de OTRA consulta (cambió un filtro): se deja ver, atenuada, pero sin
   * que se pueda pulsar nada hasta que lleguen los datos que corresponden.
   */
  inerte?: boolean;
  children: React.ReactNode;
}> = ({ actualizando, inerte = false, children }) => (
  <div
    aria-busy={actualizando}
    inert={inerte || undefined}
    className={`flex flex-col gap-2 transition-opacity ${actualizando ? 'opacity-60' : ''}`}
  >
    <p role="status" className={actualizando ? 'm-0 text-sm text-saie-muted' : 'sr-only'}>
      {actualizando ? 'Actualizando…' : ''}
    </p>
    {children}
  </div>
);

export default ZonaActualizable;

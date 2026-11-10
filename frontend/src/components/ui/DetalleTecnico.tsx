import React from 'react';

/**
 * Bloque plegable «Detalle técnico» (Issues 4.49 y 3.52): el texto del motor tal cual, para
 * soporte. La interfaz muestra la frase legible; esto solo aparece si alguien lo despliega.
 */
export const DetalleTecnico: React.FC<{ texto: string; className?: string }> = ({
  texto,
  className = '',
}) => (
  <details className={`text-xs text-saie-muted ${className}`}>
    <summary className="inline-flex min-h-6 cursor-pointer items-center font-medium">
      Detalle técnico
    </summary>
    <p className="m-0 mt-1 break-all rounded-md bg-saie-canvas px-2 py-1 font-mono">{texto}</p>
  </details>
);

export default DetalleTecnico;

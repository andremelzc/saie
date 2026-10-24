import React from 'react';

export interface TablaDatosProps {
  /** Nombre accesible de la tabla (también el de su región desplazable). */
  etiqueta: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Contenedor único de las tablas del panel. Cuando la tabla es más ancha que la pantalla se
 * desplaza en horizontal, y la región es enfocable y tiene nombre: así quien usa solo el
 * teclado puede desplazarla (WCAG 2.1.1; antes el contenedor no se podía alcanzar con Tab).
 */
export const TablaDatos: React.FC<TablaDatosProps> = ({ etiqueta, children, className = '' }) => (
  <div
    role="region"
    aria-label={etiqueta}
    tabIndex={0}
    className={`overflow-x-auto rounded-xl border border-saie-divider bg-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-saie-text ${className}`}
  >
    <table className="w-full text-left text-sm">{children}</table>
  </div>
);

export interface CabeceraTablaProps {
  columnas: string[];
  /** Compacta el relleno de las celdas (tablas con muchas columnas). */
  compacta?: boolean;
}

/** `thead` común: mismo aspecto y `scope="col"` en todas las tablas. */
export const CabeceraTabla: React.FC<CabeceraTablaProps> = ({ columnas, compacta = false }) => (
  <thead className="bg-saie-canvas text-xs uppercase tracking-wide text-saie-muted">
    <tr>
      {columnas.map((columna) => (
        <th key={columna} scope="col" className={compacta ? 'px-3 py-2' : 'px-4 py-3'}>
          {columna}
        </th>
      ))}
    </tr>
  </thead>
);

export default TablaDatos;

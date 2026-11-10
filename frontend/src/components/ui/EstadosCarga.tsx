import React from 'react';
import { Icono } from './Icono';

const TRAZO_CALENDARIO =
  'M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z';

export interface EstadoVacioProps {
  titulo: string;
  /** Trazo del ícono (por defecto un calendario); usa uno que diga de qué es el vacío. */
  icono?: string;
  descripcion: string;
  /** Acción que resuelve el vacío (p. ej. «Limpiar filtros» o «Ir a Carga de datos»). */
  accion?: React.ReactNode;
  /**
   * Variante en una fila, sin animación de entrada, para paneles de altura fija (los tableros del
   * inicio): el vacío grande no cabe ahí y haría scroll dentro del panel.
   */
  compacto?: boolean;
}

/** Estado vacío uniforme (Guía de diseño 1.7): título breve, explicación y salida. */
export const EstadoVacio: React.FC<EstadoVacioProps> = ({
  titulo,
  descripcion,
  accion,
  icono = TRAZO_CALENDARIO,
  compacto = false,
}) =>
  compacto ? (
    <div
      role="status"
      className="flex items-center gap-3 rounded-xl border border-dashed border-saie-divider bg-white px-4 py-3"
    >
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-saie-canvas text-saie-primary"
      >
        <Icono trazo={icono} className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <h3 className="m-0 text-sm font-bold text-saie-text">{titulo}</h3>
        <p className="m-0 text-sm text-saie-muted">{descripcion}</p>
        {accion && <div className="mt-1">{accion}</div>}
      </div>
    </div>
  ) : (
    <div
      role="status"
      className="saie-fundido flex flex-col items-center gap-2 rounded-2xl border border-dashed border-saie-divider bg-white px-6 py-10 text-center"
    >
      <span
        aria-hidden="true"
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-saie-canvas text-saie-primary"
      >
        <Icono trazo={icono} className="h-8 w-8" />
      </span>
      <h3 className="m-0 text-xl font-bold text-saie-text">{titulo}</h3>
      <p className="m-0 max-w-sm text-sm text-saie-muted">{descripcion}</p>
      {accion && <div className="mt-2">{accion}</div>}
    </div>
  );

export type FormaEsqueleto = 'lista' | 'tabla' | 'tarjeta' | 'texto';

const BARRA = 'saie-esqueleto block rounded-md';

/** Una fila de lista: título y una línea secundaria, con la altura de las tarjetas reales. */
const FilaLista: React.FC = () => (
  <div className="flex min-h-24 flex-col justify-center gap-2 rounded-xl border border-saie-divider bg-white p-4">
    <span className={`${BARRA} h-4 w-2/5`} />
    <span className={`${BARRA} h-3.5 w-3/5`} />
    <span className={`${BARRA} h-3.5 w-1/4`} />
  </div>
);

/**
 * Esqueleto de carga con la forma del contenido (Issue 3.48): `lista` (tarjetas apiladas),
 * `tabla` (cabecera y filas desde `lg`, tarjetas por debajo, igual que las tablas reales, así no
 * hay salto al llegar los datos), `tarjeta` (rejilla) y `texto` (párrafo). El brillo se detiene
 * con «Reducir movimiento».
 */
export const EsqueletoCarga: React.FC<{
  texto?: string;
  forma?: FormaEsqueleto;
  filas?: number;
}> = ({ texto = 'Cargando tu horario…', forma = 'lista', filas }) => {
  const n = filas ?? (forma === 'tabla' ? 6 : 3);
  const indices = Array.from({ length: n }, (_, i) => i);
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-3">
      <span className="sr-only">{texto}</span>
      {forma === 'tabla' && (
        <>
          <div
            aria-hidden="true"
            className="hidden overflow-hidden rounded-xl border border-saie-divider bg-white lg:block"
          >
            <div className="flex gap-6 bg-saie-canvas px-4 py-3">
              {[0, 1, 2, 3].map((c) => (
                <span key={c} className={`${BARRA} h-3 w-20`} />
              ))}
            </div>
            {indices.map((fila) => (
              <div
                key={fila}
                className="flex h-14 items-center gap-6 border-t border-saie-divider px-4"
              >
                <span className={`${BARRA} h-4 w-1/5`} />
                <span className={`${BARRA} h-4 w-1/4`} />
                <span className={`${BARRA} h-6 w-24 rounded-full`} />
                <span className={`${BARRA} h-4 w-1/6`} />
              </div>
            ))}
          </div>
          <div aria-hidden="true" className="flex flex-col gap-2 lg:hidden">
            {indices.slice(0, 3).map((i) => (
              <FilaLista key={i} />
            ))}
          </div>
        </>
      )}
      {forma === 'lista' && (
        <div aria-hidden="true" className="flex flex-col gap-3">
          {indices.map((i) => (
            <FilaLista key={i} />
          ))}
        </div>
      )}
      {forma === 'tarjeta' && (
        <div aria-hidden="true" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {indices.map((i) => (
            <div
              key={i}
              className="flex min-h-40 flex-col gap-3 rounded-xl border border-saie-divider bg-white p-4"
            >
              <span className={`${BARRA} h-5 w-1/3`} />
              <span className={`${BARRA} h-3.5 w-1/2`} />
              <span className={`${BARRA} h-2 w-full rounded-full`} />
              <span className={`${BARRA} mt-auto h-8 w-28`} />
            </div>
          ))}
        </div>
      )}
      {forma === 'texto' && (
        <div aria-hidden="true" className="flex flex-col gap-2">
          {indices.map((i) => (
            <span key={i} className={`${BARRA} h-4 ${i === n - 1 ? 'w-2/3' : 'w-full'}`} />
          ))}
        </div>
      )}
    </div>
  );
};

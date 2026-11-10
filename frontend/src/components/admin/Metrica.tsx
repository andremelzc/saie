import React from 'react';
import { Link } from 'react-router-dom';

export type TonoMetrica = 'neutro' | 'exito' | 'advertencia' | 'peligro';

const TONOS: Record<TonoMetrica, { cifra: string; icono: string; caja: string }> = {
  neutro: {
    cifra: 'text-saie-text',
    icono: 'bg-saie-canvas text-saie-muted',
    caja: 'border-saie-divider bg-white',
  },
  exito: {
    cifra: 'text-saie-success-strong',
    icono: 'bg-saie-success-soft text-saie-success-strong',
    caja: 'border-saie-divider bg-white',
  },
  advertencia: {
    cifra: 'text-saie-warning-strong',
    icono: 'bg-saie-warning-soft text-saie-warning-strong',
    caja: 'border-saie-divider bg-white',
  },
  peligro: {
    cifra: 'text-saie-danger-strong',
    icono: 'bg-saie-danger-soft text-saie-danger-strong',
    caja: 'border-saie-divider bg-white',
  },
};

export interface MetricaProps {
  etiqueta: string;
  /** `null` cuando aún no hay dato (p. ej. no se corrió la asignación en esta sesión). */
  valor: number | string | null;
  tono?: TonoMetrica;
  /** Trazo del ícono (de `ICONOS`). */
  icono?: string;
  /** Mientras carga se muestra un esqueleto, nunca «…». */
  cargando?: boolean;
  /** Cambio respecto de la corrida anterior; se omite si no hay con qué comparar. */
  delta?: number | null;
  /** Explica un valor vacío: «Tras asignar las aulas». */
  sinDato?: string;
  /** La lista a la que lleva la cifra: toda la tarjeta es el enlace. */
  to?: string;
  /** Texto del enlace, con objeto: «Ver alertas», «Ver historial». */
  textoEnlace?: string;
  /** Indicador principal del tablero: ocupa más y destaca. */
  principal?: boolean;
  className?: string;
}

/**
 * Métrica del tablero (Issue 4.52): cifra y etiqueta asociadas como término y definición de una
 * `dl` (el lector de pantalla las lee juntas), con tono e ícono, delta opcional y enlace a su
 * lista. Va dentro de `TiraMetricas`.
 */
export const Metrica: React.FC<MetricaProps> = ({
  etiqueta,
  valor,
  tono = 'neutro',
  icono,
  cargando = false,
  delta = null,
  sinDato,
  to,
  textoEnlace = 'Ver lista',
  principal = false,
  className = '',
}) => {
  const estilo = TONOS[tono];
  const enlace = to && (
    <span className="mt-auto block pt-1 text-sm font-semibold text-saie-primary">
      {textoEnlace}
      <span aria-hidden="true">{' →'}</span>
    </span>
  );

  return (
    <div
      className={`relative flex flex-col gap-1 rounded-xl border p-3 transition-colors ${estilo.caja} ${
        principal ? 'border-saie-warning-strong/50 ring-1 ring-saie-warning-strong/30' : ''
      } ${to ? 'hover:border-saie-primary focus-within:ring-2 focus-within:ring-saie-primary' : ''} ${className}`}
    >
      <dt className="flex items-center gap-2 text-sm font-medium text-saie-muted">
        {icono && (
          <span
            aria-hidden="true"
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${estilo.icono}`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <path d={icono} />
            </svg>
          </span>
        )}
        {etiqueta}
      </dt>
      <dd className="m-0 flex flex-wrap items-baseline gap-x-2">
        {cargando ? (
          <span role="status" className="saie-esqueleto block h-8 w-14 rounded-md">
            <span className="sr-only">Cargando {etiqueta.toLowerCase()}</span>
          </span>
        ) : valor === null ? (
          <>
            <span aria-hidden="true" className="text-3xl font-bold leading-none text-saie-muted">
              —
            </span>
            <span className="text-sm text-saie-muted">{sinDato ?? 'Sin datos'}</span>
          </>
        ) : (
          <span
            className={`${principal ? 'text-4xl' : 'text-3xl'} font-bold leading-none tabular-nums ${estilo.cifra}`}
          >
            {valor}
          </span>
        )}
        {!cargando && delta !== null && delta !== 0 && (
          <span className="text-sm text-saie-muted">
            {delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`} respecto de la anterior
          </span>
        )}
      </dd>
      {to && (
        <dd className="m-0 mt-auto">
          {to.startsWith('#') ? (
            <a href={to} className="no-underline after:absolute after:inset-0 after:rounded-xl">
              {enlace}
            </a>
          ) : (
            <Link to={to} className="no-underline after:absolute after:inset-0 after:rounded-xl">
              {enlace}
            </Link>
          )}
        </dd>
      )}
    </div>
  );
};

/** Lista de definiciones que agrupa las métricas del tablero. */
export const TiraMetricas: React.FC<{
  etiqueta: string;
  children: React.ReactNode;
  className?: string;
}> = ({ etiqueta, children, className = '' }) => (
  <dl aria-label={etiqueta} className={`saie-stagger m-0 grid gap-3 ${className}`}>
    {children}
  </dl>
);

export default Metrica;

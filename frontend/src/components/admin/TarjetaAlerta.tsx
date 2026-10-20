import React from 'react';
import type { AlertaDTO, TipoAlerta } from '../../types/admin';
import { formatearFechaAlerta } from '../../utils/admin';

/** Issue 4.9 — fila/tarjeta de alerta. Cada tipo tiene color, ícono y etiqueta propios. */

const ESTILO_TIPO: Record<
  TipoAlerta,
  { etiqueta: string; borde: string; chip: string; trazo: string }
> = {
  SOFTWARE: {
    etiqueta: 'Software',
    borde: 'border-l-[#1F5FA8]',
    chip: 'bg-[#E7EFF9] text-[#1F5FA8]',
    // Monitor
    trazo:
      'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  CAPACIDAD: {
    etiqueta: 'Capacidad',
    borde: 'border-l-[#B45309]',
    chip: 'bg-[#FDF0E1] text-[#B45309]',
    // Personas
    trazo:
      'M17 20h5v-2a3 3 0 00-5.36-1.86M17 20H7m10 0v-2c0-.66-.13-1.28-.36-1.86M7 20H2v-2a3 3 0 015.36-1.86M7 20v-2c0-.66.13-1.28.36-1.86m0 0a5 5 0 019.28 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  },
};

export interface TarjetaAlertaProps {
  alerta: AlertaDTO;
  onResolver?: (id: string) => void;
  resolviendo?: boolean;
}

export const TarjetaAlerta: React.FC<TarjetaAlertaProps> = ({
  alerta,
  onResolver,
  resolviendo,
}) => {
  const estilo = ESTILO_TIPO[alerta.tipo];
  const resuelta = alerta.estado === 'RESUELTA';

  return (
    <article
      aria-label={`Alerta de ${estilo.etiqueta.toLowerCase()} en ${alerta.espacio.identificador}`}
      data-tipo={alerta.tipo}
      className={`flex flex-col gap-3 rounded-xl border border-saie-divider border-l-4 ${estilo.borde} bg-white p-4 shadow-[var(--saie-shadow-1)] ${resuelta ? 'opacity-70' : ''}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${estilo.chip}`}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
            >
              <path d={estilo.trazo} />
            </svg>
          </span>
          <div className="min-w-0">
            <h3 className="m-0 text-base font-bold text-saie-text">
              {alerta.espacio.identificador}
            </h3>
            <p className="m-0 text-xs text-saie-muted">
              {alerta.espacio.pabellon} · Piso {alerta.espacio.piso}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${estilo.chip}`}>
            {estilo.etiqueta}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              resuelta ? 'bg-[#E8F3E9] text-saie-success' : 'bg-[#FBE9E9] text-saie-danger'
            }`}
          >
            {resuelta ? 'Resuelta' : 'Pendiente'}
          </span>
        </div>
      </header>

      <p className="m-0 text-sm text-saie-text">{alerta.motivo}</p>

      <div>
        <p className="m-0 mb-1 text-xs font-semibold uppercase tracking-wide text-saie-muted">
          Cursos afectados ({alerta.asignacionesAfectadas.length})
        </p>
        {alerta.asignacionesAfectadas.length === 0 ? (
          <p className="m-0 text-sm text-saie-muted">Ninguno</p>
        ) : (
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            {alerta.asignacionesAfectadas.map((a) => (
              <li
                key={a.asignacionId}
                className="rounded-md bg-saie-canvas px-2 py-1 text-xs text-saie-text"
                title={a.nombreCurso}
              >
                {a.codigoCurso} · {a.codigoSeccion} — {a.nombreCurso}
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-saie-divider pt-3">
        <time dateTime={alerta.fechaDeteccion} className="text-xs text-saie-muted">
          Detectada el {formatearFechaAlerta(alerta.fechaDeteccion)}
        </time>
        {!resuelta && onResolver && (
          <button
            type="button"
            onClick={() => onResolver(alerta.id)}
            disabled={resolviendo}
            className="rounded-lg bg-saie-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-saie-primary-dark disabled:cursor-wait disabled:opacity-60"
          >
            {resolviendo ? 'Marcando…' : 'Marcar como resuelta'}
          </button>
        )}
      </footer>
    </article>
  );
};

export default TarjetaAlerta;

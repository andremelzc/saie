import React, { useState } from 'react';
import type { AlertaDTO, TipoAlerta } from '../../types/admin';
import { formatearFechaAlerta } from '../../utils/admin';
import { ESTADO_ALERTA, ETIQUETA_TIPO_ALERTA } from '../../utils/etiquetas';
import { BadgeEstado } from '../ui/BadgeEstado';
import { Boton } from '../ui/Boton';

/** Issue 4.9 — fila/tarjeta de alerta. Cada tipo tiene color, ícono y etiqueta propios. */

const MAX_CURSOS_VISIBLES = 2;

/** «1 curso» o «3 cursos»: el número de cursos que quedan plegados. */
function textoCursosOcultos(cantidad: number): string {
  return cantidad === 1 ? 'curso' : 'cursos';
}

const ESTILO_TIPO: Record<TipoAlerta, { borde: string; chip: string; trazo: string }> = {
  SOFTWARE: {
    borde: 'border-l-saie-info',
    chip: 'bg-saie-info-soft text-saie-info',
    // Monitor
    trazo:
      'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  CAPACIDAD: {
    borde: 'border-l-saie-warning-strong',
    chip: 'bg-saie-warning-soft text-saie-warning-strong',
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
  resolviendo = false,
}) => {
  const estilo = ESTILO_TIPO[alerta.tipo];
  const resuelta = alerta.estado === 'RESUELTA';
  const [confirmando, setConfirmando] = useState(false);
  const [mostrarTodos, setMostrarTodos] = useState(false);

  const cursos = alerta.asignacionesAfectadas;
  const visibles = mostrarTodos ? cursos : cursos.slice(0, MAX_CURSOS_VISIBLES);
  const ocultos = cursos.length - visibles.length;

  return (
    <article
      aria-label={`Alerta de ${ETIQUETA_TIPO_ALERTA[alerta.tipo].toLowerCase()} en ${alerta.espacio.identificador}`}
      data-tipo={alerta.tipo}
      className={`flex flex-col gap-3 rounded-xl border border-saie-divider border-l-4 ${estilo.borde} bg-white p-4 ${resuelta ? 'opacity-70' : ''}`}
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
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${estilo.chip}`}>
            {ETIQUETA_TIPO_ALERTA[alerta.tipo]}
          </span>
          <BadgeEstado tono={ESTADO_ALERTA[alerta.estado].tono}>
            {ESTADO_ALERTA[alerta.estado].etiqueta}
          </BadgeEstado>
        </div>
      </header>

      <p className="m-0 text-sm text-saie-text">{alerta.motivo}</p>

      <div>
        <p className="m-0 mb-1 text-xs font-semibold uppercase tracking-wide text-saie-muted">
          Cursos afectados ({cursos.length})
        </p>
        {cursos.length === 0 ? (
          <p className="m-0 text-sm text-saie-muted">Ninguno</p>
        ) : (
          <>
            <ul className="m-0 flex list-none flex-wrap items-center gap-1.5 p-0">
              {visibles.map((a) => (
                <li
                  key={a.asignacionId}
                  className="rounded-md bg-saie-canvas px-2 py-1 text-xs text-saie-text"
                >
                  {a.codigoCurso} · {a.codigoSeccion} — {a.nombreCurso}
                </li>
              ))}
              {cursos.length > MAX_CURSOS_VISIBLES && (
                <li>
                  <button
                    type="button"
                    onClick={() => setMostrarTodos((v) => !v)}
                    aria-expanded={mostrarTodos}
                    className="cursor-pointer rounded-md px-2 py-1 text-xs font-semibold text-saie-primary hover:bg-saie-primary/5"
                  >
                    {mostrarTodos ? 'Ver menos' : `+${ocultos} ${textoCursosOcultos(ocultos)} más`}
                  </button>
                </li>
              )}
            </ul>
          </>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-saie-divider pt-3">
        <time dateTime={alerta.fechaDeteccion} className="text-xs text-saie-muted">
          Detectada el {formatearFechaAlerta(alerta.fechaDeteccion)}
        </time>
        {!resuelta && onResolver && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {confirmando ? (
              <fieldset
                aria-label="Confirmar resolución"
                className="flex flex-wrap items-center justify-end gap-2 border-0 p-0"
              >
                <span className="text-sm font-semibold text-saie-text">¿Marcar como resuelta?</span>
                <Boton
                  variante="cancelar"
                  tamano="sm"
                  onClick={() => setConfirmando(false)}
                  disabled={resolviendo}
                >
                  Cancelar
                </Boton>
                <Boton
                  variante="primario"
                  tamano="sm"
                  onClick={() => {
                    setConfirmando(false);
                    onResolver(alerta.id);
                  }}
                  cargando={resolviendo}
                  textoCargando="Marcando…"
                >
                  Sí, resolver
                </Boton>
              </fieldset>
            ) : (
              <Boton
                variante="primario"
                tamano="sm"
                onClick={() => setConfirmando(true)}
                disabled={resolviendo}
                cargando={resolviendo}
                textoCargando="Marcando…"
              >
                Marcar como resuelta
              </Boton>
            )}
          </div>
        )}
      </footer>
    </article>
  );
};

export default TarjetaAlerta;

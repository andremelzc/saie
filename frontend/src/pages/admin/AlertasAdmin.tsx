import React, { useState } from 'react';
import LayoutAdmin, { AvisoError } from '../../components/admin/LayoutAdmin';
import TarjetaAlerta from '../../components/admin/TarjetaAlerta';
import { EsqueletoCarga, EstadoVacio } from '../../components/estudiante/ElementosHorario';
import { Boton } from '../../components/ui/Boton';
import { useAvisos } from '../../components/ui/useAvisos';
import { useAuth } from '../../context/useAuth';
import { useCarga } from '../../hooks/useCarga';
import { obtenerAlertas, resolverAlerta } from '../../services/admin';
import { mensajeDeError } from '../../services/estudiante';
import type { TipoAlerta } from '../../types/admin';

type Filtro = 'TODAS' | TipoAlerta;

const ETIQUETAS_FILTRO: Record<Filtro, string> = {
  TODAS: 'Todas',
  SOFTWARE: 'Software',
  CAPACIDAD: 'Capacidad',
};

/**
 * Issue 4.10 — lista real de alertas. El backend ya restringe a Jefatura a sus laboratorios.
 * Al resolver una alerta se quita de la lista local y se confirma con un aviso; no se inventa
 * un estado «Resuelta» que el backend no devuelve.
 */
export const AlertasAdmin: React.FC = () => {
  const { sesion } = useAuth();
  const { datos, cargando, error, recargar } = useCarga(obtenerAlertas);
  const { mostrar } = useAvisos();
  const [resueltasLocal, setResueltasLocal] = useState<Set<string>>(new Set());
  const [enCurso, setEnCurso] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<{
    mensaje: string;
    reintentar: () => void;
  } | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('TODAS');

  const base = (datos ?? []).filter((a) => !resueltasLocal.has(a.id));
  const alertas = base.filter((a) => filtro === 'TODAS' || a.tipo === filtro);
  const conteos: Record<Filtro, number> = {
    TODAS: base.length,
    SOFTWARE: base.filter((a) => a.tipo === 'SOFTWARE').length,
    CAPACIDAD: base.filter((a) => a.tipo === 'CAPACIDAD').length,
  };
  const pendientes = base.filter((a) => a.estado === 'PENDIENTE').length;
  const total = base.length;

  async function manejarResolver(id: string) {
    setEnCurso(id);
    setErrorAccion(null);
    try {
      await resolverAlerta(id);
      setResueltasLocal((prev) => new Set(prev).add(id));
      const espacio = datos?.find((a) => a.id === id)?.espacio.identificador;
      mostrar(
        'exito',
        espacio ? `Alerta de ${espacio} marcada como resuelta.` : 'Alerta marcada como resuelta.',
      );
    } catch (e) {
      setErrorAccion({ mensaje: mensajeDeError(e), reintentar: () => manejarResolver(id) });
    } finally {
      setEnCurso(null);
    }
  }

  const subtitulo =
    sesion?.rol === 'JEFATURA_LABORATORIOS'
      ? 'Alertas de los laboratorios bajo tu responsabilidad.'
      : 'Alertas de software y capacidad de todos los espacios.';

  return (
    <LayoutAdmin
      titulo="Centro de alertas"
      subtitulo={subtitulo}
      acciones={
        <Boton
          variante="secundario"
          onClick={recargar}
          cargando={cargando}
          textoCargando="Actualizando…"
        >
          Actualizar
        </Boton>
      }
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="group"
            aria-label="Filtrar por tipo"
            className="inline-flex flex-wrap gap-1 rounded-xl border border-saie-divider bg-white p-1"
          >
            {(['TODAS', 'SOFTWARE', 'CAPACIDAD'] as Filtro[]).map((f) => {
              const activo = filtro === f;
              return (
                <button
                  key={f}
                  type="button"
                  aria-pressed={activo}
                  aria-label={`${ETIQUETAS_FILTRO[f]} (${conteos[f]})`}
                  onClick={() => setFiltro(f)}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors ${
                    activo
                      ? 'bg-saie-primary text-white'
                      : 'text-saie-muted hover:bg-saie-primary/5 hover:text-saie-primary'
                  }`}
                >
                  <span>{ETIQUETAS_FILTRO[f]}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                      activo ? 'bg-white/20 text-white' : 'bg-saie-canvas text-saie-text'
                    }`}
                  >
                    {conteos[f]}
                  </span>
                </button>
              );
            })}
          </div>
          {datos && (
            <p className="m-0 text-sm text-saie-muted" aria-live="polite">
              <strong className="text-saie-text">{pendientes}</strong>{' '}
              {pendientes === 1 ? 'pendiente' : 'pendientes'}
              {total !== pendientes && <> de {total}</>}
            </p>
          )}
        </div>
        <p className="m-0 text-xs text-saie-muted">
          Al resolver una alerta deja de aparecer en esta lista; el historial completo llegará con
          la próxima actualización.
        </p>
      </div>

      {errorAccion && (
        <AvisoError mensaje={errorAccion.mensaje} onReintentar={errorAccion.reintentar} />
      )}
      {error && <AvisoError mensaje={error} onReintentar={recargar} />}

      {cargando && !datos ? (
        <EsqueletoCarga texto="Cargando alertas…" />
      ) : base.length === 0 && !error ? (
        <EstadoVacio
          titulo="Sin alertas pendientes"
          descripcion="No hay alertas de software ni de capacidad en este momento."
        />
      ) : alertas.length === 0 && !error ? (
        <EstadoVacio
          titulo="Sin alertas de este tipo"
          descripcion={`No hay alertas de ${ETIQUETAS_FILTRO[filtro].toLowerCase()} por ahora.`}
          accion={
            <Boton variante="secundario" tamano="sm" onClick={() => setFiltro('TODAS')}>
              Ver todas
            </Boton>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {alertas.map((a) => (
            <TarjetaAlerta
              key={a.id}
              alerta={a}
              onResolver={manejarResolver}
              resolviendo={enCurso === a.id}
            />
          ))}
        </div>
      )}
    </LayoutAdmin>
  );
};

export default AlertasAdmin;

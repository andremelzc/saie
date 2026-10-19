import React, { useState } from 'react';
import LayoutAdmin, { AvisoError } from '../../components/admin/LayoutAdmin';
import TarjetaAlerta from '../../components/admin/TarjetaAlerta';
import { EsqueletoCarga, EstadoVacio } from '../../components/estudiante/ElementosHorario';
import { useAuth } from '../../context/useAuth';
import { useCarga } from '../../hooks/useCarga';
import { obtenerAlertas, resolverAlerta } from '../../services/admin';
import { mensajeDeError } from '../../services/estudiante';
import type { TipoAlerta } from '../../types/admin';

type Filtro = 'TODAS' | TipoAlerta;

/**
 * Issue 4.10 — lista real de alertas. El backend ya restringe a Jefatura a sus laboratorios;
 * resolver una alerta actualiza la lista localmente, sin recargar la página.
 */
export const AlertasAdmin: React.FC = () => {
  const { sesion } = useAuth();
  const { datos, cargando, error, recargar } = useCarga(obtenerAlertas);
  const [resueltas, setResueltas] = useState<Set<string>>(new Set());
  const [enCurso, setEnCurso] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('TODAS');

  const alertas = (datos ?? [])
    .map((a) => (resueltas.has(a.id) ? { ...a, estado: 'RESUELTA' as const } : a))
    .filter((a) => filtro === 'TODAS' || a.tipo === filtro);

  const pendientes = alertas.filter((a) => a.estado === 'PENDIENTE').length;

  async function manejarResolver(id: string) {
    setEnCurso(id);
    setErrorAccion(null);
    try {
      await resolverAlerta(id);
      setResueltas((prev) => new Set(prev).add(id));
    } catch (e) {
      setErrorAccion(mensajeDeError(e));
    } finally {
      setEnCurso(null);
    }
  }

  const subtitulo =
    sesion?.rol === 'JEFATURA_LABORATORIOS'
      ? 'Alertas de los laboratorios bajo tu responsabilidad.'
      : 'Alertas de software y capacidad de todos los espacios.';

  return (
    <LayoutAdmin titulo="Centro de alertas" subtitulo={subtitulo}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Filtrar por tipo"
          className="inline-flex rounded-lg border border-saie-divider bg-white p-1"
        >
          {(['TODAS', 'SOFTWARE', 'CAPACIDAD'] as Filtro[]).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filtro === f}
              onClick={() => setFiltro(f)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                filtro === f
                  ? 'bg-saie-primary text-white'
                  : 'text-saie-muted hover:text-saie-primary'
              }`}
            >
              {f === 'TODAS' ? 'Todas' : f === 'SOFTWARE' ? 'Software' : 'Capacidad'}
            </button>
          ))}
        </div>
        {datos && (
          <p className="m-0 text-sm text-saie-muted">
            <strong className="text-saie-text">{pendientes}</strong> pendiente(s)
          </p>
        )}
      </div>

      {errorAccion && <AvisoError mensaje={errorAccion} />}
      {error && <AvisoError mensaje={error} onReintentar={recargar} />}

      {cargando && !datos ? (
        <EsqueletoCarga texto="Cargando alertas…" />
      ) : alertas.length === 0 && !error ? (
        <EstadoVacio titulo="Sin alertas" descripcion="No hay alertas que mostrar por ahora." />
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

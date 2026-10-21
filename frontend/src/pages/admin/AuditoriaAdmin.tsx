import React, { useCallback, useState } from 'react';
import LayoutAdmin, { AvisoError } from '../../components/admin/LayoutAdmin';
import { EsqueletoCarga, EstadoVacio } from '../../components/estudiante/ElementosHorario';
import { SelectorSegmentado } from '../../components/estudiante/SelectorSegmentado';
import { BadgeEstado } from '../../components/ui/BadgeEstado';
import { Boton } from '../../components/ui/Boton';
import { CLASE_CAMPO, CLASE_ETIQUETA } from '../../components/ui/campos';
import { useCarga } from '../../hooks/useCarga';
import { obtenerAuditoria, obtenerHistorial } from '../../services/admin';
import type { EstadoAsignacion, TipoEventoAuditoria } from '../../types/admin';
import { formatearFechaAlerta } from '../../utils/admin';

type Vista = 'historial' | 'auditoria';

const OPCIONES_VISTA: { valor: Vista; etiqueta: string }[] = [
  { valor: 'historial', etiqueta: 'Historial de asignaciones' },
  { valor: 'auditoria', etiqueta: 'Auditoría' },
];

const ETIQUETAS_EVENTO: Record<TipoEventoAuditoria, string> = {
  ASIGNACION: 'Asignación',
  ESCALAMIENTO: 'Escalamiento',
  ALERTA: 'Alerta',
  VERIFICACION: 'Verificación',
};

const TONO_EVENTO: Record<TipoEventoAuditoria, 'exito' | 'advertencia' | 'peligro' | 'info'> = {
  ASIGNACION: 'exito',
  ESCALAMIENTO: 'advertencia',
  ALERTA: 'peligro',
  VERIFICACION: 'info',
};

const ETIQUETA_ESTADO: Record<EstadoAsignacion, string> = {
  VIGENTE: 'Vigente',
  ESCALADA: 'Escalada',
  HISTORICA: 'Histórica',
};

const TONO_ESTADO: Record<EstadoAsignacion, 'exito' | 'advertencia' | 'neutro'> = {
  VIGENTE: 'exito',
  ESCALADA: 'advertencia',
  HISTORICA: 'neutro',
};

/** Tabla del historial: qué asignó el motor en cada corrida y con qué estado. */
const VistaHistorial: React.FC = () => {
  const [periodo, setPeriodo] = useState('');
  const [estado, setEstado] = useState<'TODOS' | EstadoAsignacion>('TODOS');

  const cargar = useCallback(
    () =>
      obtenerHistorial({
        periodo: periodo.trim() || undefined,
        estado: estado === 'TODOS' ? undefined : estado,
        limite: 200,
      }),
    [periodo, estado],
  );

  const { datos, cargando, error, recargar } = useCarga(cargar);
  const items = datos?.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className={CLASE_ETIQUETA}>Periodo</span>
          <input
            type="text"
            placeholder="Ej. 2026-2"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className={CLASE_CAMPO}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className={CLASE_ETIQUETA}>Estado</span>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value as 'TODOS' | EstadoAsignacion)}
            className={CLASE_CAMPO}
          >
            <option value="TODOS">Todos</option>
            <option value="VIGENTE">Vigente</option>
            <option value="ESCALADA">Escalada</option>
            <option value="HISTORICA">Histórica</option>
          </select>
        </label>
      </div>

      {error && <AvisoError mensaje={error} onReintentar={recargar} />}
      {cargando && !datos ? (
        <EsqueletoCarga texto="Cargando historial…" />
      ) : items.length === 0 ? (
        <EstadoVacio
          titulo="Sin asignaciones registradas"
          descripcion="Cuando el motor asigne aulas, aquí quedará el rastro de cada corrida."
        />
      ) : (
        <section
          aria-label="Historial de asignaciones"
          className="overflow-x-auto rounded-xl border border-saie-divider bg-white"
        >
          <table className="w-full text-left text-sm">
            <thead className="bg-saie-canvas text-xs uppercase tracking-wide text-saie-muted">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Sección
                </th>
                <th scope="col" className="px-4 py-3">
                  Aula
                </th>
                <th scope="col" className="px-4 py-3">
                  Estado
                </th>
                <th scope="col" className="px-4 py-3">
                  Fecha
                </th>
                <th scope="col" className="px-4 py-3">
                  Corrida
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-t border-saie-divider">
                  <td className="px-4 py-3">
                    <span className="block font-semibold">
                      {a.codigoCurso} · {a.codigoSeccion}
                    </span>
                    <span className="block text-xs text-saie-muted">{a.nombreCurso}</span>
                  </td>
                  <td className="px-4 py-3">
                    {a.espacios.length > 0
                      ? a.espacios.map((e) => e.identificador).join(', ')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <BadgeEstado tono={TONO_ESTADO[a.estado]}>
                      {ETIQUETA_ESTADO[a.estado]}
                    </BadgeEstado>
                  </td>
                  <td className="px-4 py-3 text-xs text-saie-muted">
                    {formatearFechaAlerta(a.fechaAsignacion)}
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-saie-muted">
                    {a.corridaId ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
};

/** Tabla de auditoría: el asiento de cada evento del motor. */
const VistaAuditoria: React.FC = () => {
  const [tipo, setTipo] = useState<'TODOS' | TipoEventoAuditoria>('TODOS');

  const cargar = useCallback(
    () =>
      obtenerAuditoria({
        tipo: tipo === 'TODOS' ? undefined : tipo,
        limite: 200,
      }),
    [tipo],
  );

  const { datos, cargando, error, recargar } = useCarga(cargar);
  const items = datos?.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      <label className="flex max-w-xs flex-col gap-1">
        <span className={CLASE_ETIQUETA}>Tipo de evento</span>
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as 'TODOS' | TipoEventoAuditoria)}
          className={CLASE_CAMPO}
        >
          <option value="TODOS">Todos</option>
          <option value="ASIGNACION">Asignación</option>
          <option value="ESCALAMIENTO">Escalamiento</option>
          <option value="ALERTA">Alerta</option>
          <option value="VERIFICACION">Verificación</option>
        </select>
      </label>

      {error && <AvisoError mensaje={error} onReintentar={recargar} />}
      {cargando && !datos ? (
        <EsqueletoCarga texto="Cargando auditoría…" />
      ) : items.length === 0 ? (
        <EstadoVacio
          titulo="Sin asientos de auditoría"
          descripcion="Cada corrida del motor deja aquí su constancia."
        />
      ) : (
        <section
          aria-label="Registros de auditoría"
          className="overflow-x-auto rounded-xl border border-saie-divider bg-white"
        >
          <table className="w-full text-left text-sm">
            <thead className="bg-saie-canvas text-xs uppercase tracking-wide text-saie-muted">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Evento
                </th>
                <th scope="col" className="px-4 py-3">
                  Sección
                </th>
                <th scope="col" className="px-4 py-3">
                  Detalle
                </th>
                <th scope="col" className="px-4 py-3">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-t border-saie-divider align-top">
                  <td className="px-4 py-3">
                    <BadgeEstado tono={TONO_EVENTO[r.tipoEvento]}>
                      {ETIQUETAS_EVENTO[r.tipoEvento]}
                    </BadgeEstado>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.seccion ? `${r.seccion.codigoCurso} · ${r.seccion.codigoSeccion}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-saie-text">{r.detalle}</td>
                  <td className="px-4 py-3 text-xs text-saie-muted">
                    {formatearFechaAlerta(r.fechaHora)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
};

/**
 * Issue 4.32 — auditoría e historial de asignaciones.
 *
 * Los datos ya estaban en la base (`RegistroAuditoria` y el estado `HISTORICA` de las
 * asignaciones); faltaba una pantalla donde Coordination pudiera verlos.
 */
export const AuditoriaAdmin: React.FC = () => {
  const [vista, setVista] = useState<Vista>('historial');

  return (
    <LayoutAdmin
      titulo="Auditoría e historial"
      subtitulo="Qué decidió el motor en cada corrida y qué dejó registrado."
      acciones={
        <Boton variante="secundario" onClick={() => window.location.reload()}>
          Actualizar
        </Boton>
      }
    >
      <SelectorSegmentado
        opciones={OPCIONES_VISTA}
        valor={vista}
        onCambiar={setVista}
        etiquetaGrupo="Vista de la auditoría"
        className="self-start"
      />
      <section aria-label="Contenido de la auditoría">
        {vista === 'historial' ? <VistaHistorial /> : <VistaAuditoria />}
      </section>
    </LayoutAdmin>
  );
};

export default AuditoriaAdmin;

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { describirEstadoAsignacion, describirEventoAuditoria } from '../../utils/diccionarios';

/** Vuelve a pedir los datos cuando cambia `version` (botón «Actualizar»), sin tocar los filtros. */
function useRecargarAl(version: number, recargar: () => void): void {
  const anterior = useRef(version);
  useEffect(() => {
    if (anterior.current === version) return;
    anterior.current = version;
    recargar();
  }, [version, recargar]);
}

type Vista = 'historial' | 'auditoria';

const OPCIONES_VISTA: { valor: Vista; etiqueta: string }[] = [
  { valor: 'historial', etiqueta: 'Asignaciones' },
  { valor: 'auditoria', etiqueta: 'Registro de actividad' },
];

/** Insignia de un evento del registro (el código se traduce en `utils/diccionarios.ts`). */
const InsigniaEvento: React.FC<{ tipo: string }> = ({ tipo }) => {
  const evento = describirEventoAuditoria(tipo);
  return <BadgeEstado tono={evento.tono}>{evento.etiqueta}</BadgeEstado>;
};

/** Insignia del estado de una asignación. */
const InsigniaEstado: React.FC<{ estado: string }> = ({ estado }) => {
  const descripcion = describirEstadoAsignacion(estado);
  return <BadgeEstado tono={descripcion.tono}>{descripcion.etiqueta}</BadgeEstado>;
};

const ESTADOS_FILTRO: EstadoAsignacion[] = ['VIGENTE', 'ESCALADA', 'HISTORICA'];
const EVENTOS_FILTRO: TipoEventoAuditoria[] = [
  'ASIGNACION',
  'ESCALAMIENTO',
  'ALERTA',
  'VERIFICACION',
];

/** `version` cambia al pulsar «Actualizar»: vuelve a pedir los datos conservando los filtros. */
const VistaHistorial: React.FC<{ version: number }> = ({ version }) => {
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
  useRecargarAl(version, recargar);
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
            {ESTADOS_FILTRO.map((e) => (
              <option key={e} value={e}>
                {describirEstadoAsignacion(e).etiqueta}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <AvisoError mensaje={error} onReintentar={recargar} />}
      {cargando && !datos ? (
        <EsqueletoCarga texto="Cargando historial…" />
      ) : items.length === 0 ? (
        <EstadoVacio
          titulo="Sin asignaciones registradas"
          descripcion="Cuando se asignen aulas, aquí quedará el registro de cada asignación."
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
                    <InsigniaEstado estado={a.estado} />
                  </td>
                  <td className="px-4 py-3 text-xs text-saie-muted">
                    {formatearFechaAlerta(a.fechaAsignacion)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-saie-muted">
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

const VistaAuditoria: React.FC<{ version: number }> = ({ version }) => {
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
  useRecargarAl(version, recargar);
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
          {EVENTOS_FILTRO.map((e) => (
            <option key={e} value={e}>
              {describirEventoAuditoria(e).etiqueta}
            </option>
          ))}
        </select>
      </label>

      {error && <AvisoError mensaje={error} onReintentar={recargar} />}
      {cargando && !datos ? (
        <EsqueletoCarga texto="Cargando auditoría…" />
      ) : items.length === 0 ? (
        <EstadoVacio
          titulo="Sin actividad registrada"
          descripcion="Cada asignación automática de aulas deja aquí su registro."
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
                    <InsigniaEvento tipo={r.tipoEvento} />
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
  // Antes «Actualizar» recargaba toda la página y se perdían la pestaña, los filtros y el scroll.
  const [version, setVersion] = useState(0);

  return (
    <LayoutAdmin
      titulo="Auditoría e historial"
      subtitulo="Qué pasó con cada sección y cuándo."
      acciones={
        <Boton variante="secundario" onClick={() => setVersion((v) => v + 1)}>
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
        {vista === 'historial' ? (
          <VistaHistorial version={version} />
        ) : (
          <VistaAuditoria version={version} />
        )}
      </section>
    </LayoutAdmin>
  );
};

export default AuditoriaAdmin;

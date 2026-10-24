import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RUTAS } from '../../config/rutas';
import { ICONOS } from '../../components/ui/iconos';
import { BotonEnlace } from '../../components/ui/BotonEnlace';
import LayoutAdmin, { AvisoError } from '../../components/admin/LayoutAdmin';
import { EsqueletoCarga, EstadoVacio } from '../../components/estudiante/ElementosHorario';
import { SelectorSegmentado } from '../../components/estudiante/SelectorSegmentado';
import { idPanelPestana, idPestana } from '../../components/estudiante/idsPestanas';
import { BadgeEstado } from '../../components/ui/BadgeEstado';
import { Boton } from '../../components/ui/Boton';
import { CabeceraTabla, TablaDatos } from '../../components/ui/TablaDatos';
import { ZonaActualizable } from '../../components/ui/ZonaActualizable';
import { Campo } from '../../components/ui/Campo';
import { CLASE_CAMPO } from '../../components/ui/campos';
import { useCarga } from '../../hooks/useCarga';
import { useValorDiferido } from '../../hooks/useValorDiferido';
import { obtenerAuditoria, obtenerHistorial } from '../../services/admin';
import type {
  EstadoAsignacion,
  HistorialAsignacionDTO,
  TipoEventoAuditoria,
} from '../../types/admin';
import { describirMotivoEscalamiento } from '../../utils/admin';
import { formatearFechaAlerta } from '../../utils/fechas';
import { agruparPorCorrida, tituloDeCorrida, ubicacionDeEspacios } from '../../utils/historial';
import type { GrupoCorrida } from '../../utils/historial';
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

/** Motivo de una escalada en lenguaje llano; null si la asignación no está en revisión. */
function motivoLlano(a: HistorialAsignacionDTO): { etiqueta: string; descripcion: string } | null {
  if (a.estado !== 'ESCALADA') return null;
  const motivo = describirMotivoEscalamiento(a.motivoEscalamiento);
  return { etiqueta: motivo.etiqueta, descripcion: motivo.descripcion };
}

const DatosSeccion: React.FC<{ a: HistorialAsignacionDTO }> = ({ a }) => (
  <>
    <span className="block font-semibold">
      {a.codigoCurso} · {a.codigoSeccion}
    </span>
    <span className="block text-xs text-saie-muted">{a.nombreCurso}</span>
  </>
);

const DatosAula: React.FC<{ a: HistorialAsignacionDTO }> = ({ a }) =>
  a.espacios.length > 0 ? (
    <>
      <span className="block">{a.espacios.map((e) => e.identificador).join(', ')}</span>
      <span className="block text-xs text-saie-muted">{ubicacionDeEspacios(a.espacios)}</span>
    </>
  ) : (
    <span>—</span>
  );

const DatosEstado: React.FC<{ a: HistorialAsignacionDTO }> = ({ a }) => {
  const motivo = motivoLlano(a);
  return (
    <>
      <InsigniaEstado estado={a.estado} />
      {motivo && <span className="mt-1 block text-xs text-saie-muted">{motivo.descripcion}</span>}
    </>
  );
};

/** Una corrida: su resumen y sus asignaciones (tabla desde `lg`, tarjetas por debajo). */
const GrupoHistorial: React.FC<{ grupo: GrupoCorrida; indice: number }> = ({ grupo, indice }) => {
  const idTitulo = `corrida-${indice}`;
  return (
    <section aria-labelledby={idTitulo} className="flex flex-col gap-2">
      <h3 id={idTitulo} className="m-0 text-sm font-bold text-saie-text">
        {tituloDeCorrida(grupo)}
      </h3>
      <div className="hidden lg:block">
        <TablaDatos etiqueta={`Asignaciones de la corrida ${indice + 1}`}>
          <CabeceraTabla columnas={['Sección', 'Aula', 'Estado', 'Fecha']} />
          <tbody>
            {grupo.items.map((a) => (
              <tr key={a.id} className="border-t border-saie-divider align-top">
                <td className="px-4 py-3">
                  <DatosSeccion a={a} />
                </td>
                <td className="px-4 py-3">
                  <DatosAula a={a} />
                </td>
                <td className="px-4 py-3">
                  <DatosEstado a={a} />
                </td>
                <td className="px-4 py-3 text-xs text-saie-muted">
                  {formatearFechaAlerta(a.fechaAsignacion)}
                </td>
              </tr>
            ))}
          </tbody>
        </TablaDatos>
      </div>
      <ul className="m-0 flex list-none flex-col gap-2 p-0 lg:hidden">
        {grupo.items.map((a) => (
          <li
            key={a.id}
            className="flex flex-col gap-2 rounded-xl border border-saie-divider bg-white p-4 text-sm"
          >
            <div>
              <DatosSeccion a={a} />
            </div>
            <div>
              <span className="block text-xs text-saie-muted">Aula</span>
              <DatosAula a={a} />
            </div>
            <div>
              <DatosEstado a={a} />
            </div>
            <p className="m-0 text-xs text-saie-muted">{formatearFechaAlerta(a.fechaAsignacion)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
};

/** `version` cambia al pulsar «Actualizar»: vuelve a pedir los datos conservando los filtros. */
const VistaHistorial: React.FC<{ version: number }> = ({ version }) => {
  const [periodo, setPeriodo] = useState('');
  const [estado, setEstado] = useState<'TODOS' | EstadoAsignacion>('TODOS');
  // Una sola petición tras una pausa al escribir el periodo (Issue 4.41).
  const periodoDiferido = useValorDiferido(periodo);

  const cargar = useCallback(
    () =>
      obtenerHistorial({
        periodo: periodoDiferido.trim() || undefined,
        estado: estado === 'TODOS' ? undefined : estado,
        limite: 200,
      }),
    [periodoDiferido, estado],
  );

  const { datos, cargando, error, recargar } = useCarga(cargar, {
    clave: `historial:${periodoDiferido.trim()}|${estado}`,
  });
  useRecargarAl(version, recargar);
  const items = useMemo(() => datos?.items ?? [], [datos]);
  const grupos = useMemo(() => agruparPorCorrida(items), [items]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo etiqueta="Periodo">
          <input
            type="text"
            placeholder="Ej. 2026-2"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className={CLASE_CAMPO}
          />
        </Campo>
        <Campo etiqueta="Estado">
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
        </Campo>
      </div>

      {error && <AvisoError mensaje={error} onReintentar={recargar} />}
      <ZonaActualizable actualizando={cargando && datos !== null}>
        {cargando && !datos ? (
          <EsqueletoCarga texto="Cargando historial…" forma="tabla" />
        ) : items.length === 0 ? (
          <EstadoVacio
            titulo="Sin asignaciones registradas"
            icono={ICONOS.portapapeles}
            descripcion="Cuando se asignen aulas, aquí quedará el registro de cada asignación."
            accion={
              <BotonEnlace to={RUTAS.inicioAdmin} variante="secundario" tamano="sm">
                Ir a Asignar aulas
              </BotonEnlace>
            }
          />
        ) : (
          <div className="flex flex-col gap-5">
            {grupos.map((grupo, i) => (
              <GrupoHistorial key={grupo.corridaId ?? 'individual'} grupo={grupo} indice={i} />
            ))}
          </div>
        )}
      </ZonaActualizable>
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

  const { datos, cargando, error, recargar } = useCarga(cargar, { clave: `auditoria:${tipo}` });
  useRecargarAl(version, recargar);
  const items = datos?.items ?? [];

  return (
    <div className="flex flex-col gap-4">
      <Campo etiqueta="Tipo de evento" className="flex max-w-xs flex-col gap-1">
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
      </Campo>

      {error && <AvisoError mensaje={error} onReintentar={recargar} />}
      <ZonaActualizable actualizando={cargando && datos !== null}>
        {cargando && !datos ? (
          <EsqueletoCarga texto="Cargando auditoría…" forma="tabla" />
        ) : items.length === 0 ? (
          <EstadoVacio
            titulo="Sin actividad registrada"
            icono={ICONOS.portapapeles}
            descripcion="Cada asignación automática de aulas deja aquí su registro."
            accion={
              <BotonEnlace to={RUTAS.inicioAdmin} variante="secundario" tamano="sm">
                Ir a Asignar aulas
              </BotonEnlace>
            }
          />
        ) : (
          <>
            <div className="hidden lg:block">
              <TablaDatos etiqueta="Registros de auditoría">
                <CabeceraTabla columnas={['Evento', 'Sección', 'Detalle', 'Fecha']} />
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
              </TablaDatos>
            </div>
            <ul className="m-0 flex list-none flex-col gap-2 p-0 lg:hidden">
              {items.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-col gap-2 rounded-xl border border-saie-divider bg-white p-4 text-sm"
                >
                  <div>
                    <InsigniaEvento tipo={r.tipoEvento} />
                  </div>
                  {r.seccion && (
                    <p className="m-0 text-xs font-semibold">
                      {r.seccion.codigoCurso} · {r.seccion.codigoSeccion}
                    </p>
                  )}
                  <p className="m-0 text-xs text-saie-text">{r.detalle}</p>
                  <p className="m-0 text-xs text-saie-muted">{formatearFechaAlerta(r.fechaHora)}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </ZonaActualizable>
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
      titulo="Historial"
      subtitulo="Qué pasó con cada sección y cuándo"
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
        idBase="auditoria"
        className="self-start"
      />
      <section
        role="tabpanel"
        id={idPanelPestana('auditoria', vista)}
        aria-labelledby={idPestana('auditoria', vista)}
      >
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

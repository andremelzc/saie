import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RUTAS } from '../../config/rutas';
import { ICONOS } from '../../components/ui/iconos';
import { BotonEnlace } from '../../components/ui/BotonEnlace';
import LayoutAdmin, { AvisoError } from '../../components/admin/LayoutAdmin';
import { EsqueletoCarga, EstadoVacio } from '../../components/ui/EstadosCarga';
import { SelectorSegmentado } from '../../components/ui/SelectorSegmentado';
import { idPanelPestana, idPestana } from '../../components/ui/idsPestanas';
import { BadgeEstado } from '../../components/ui/BadgeEstado';
import { Boton } from '../../components/ui/Boton';
import { CabeceraTabla, TablaDatos } from '../../components/ui/TablaDatos';
import { ZonaActualizable } from '../../components/ui/ZonaActualizable';
import { Campo } from '../../components/ui/Campo';
import { CLASE_CAMPO } from '../../components/ui/campos';
import { useCarga } from '../../hooks/useCarga';
import { usePaginacion } from '../../hooks/usePaginacion';
import { usePeriodoFiltro } from '../../hooks/usePeriodoFiltro';
import SelectorPeriodo from '../../components/admin/SelectorPeriodo';
import { obtenerAuditoria, obtenerEspacios, obtenerHistorial } from '../../services/admin';
import type {
  EstadoAsignacion,
  HistorialAsignacionDTO,
  RegistroAuditoriaDTO,
  TipoEventoAuditoria,
} from '../../types/admin';
import { describirMotivoEscalamiento } from '../../utils/admin';
import { formatearFechaAlerta } from '../../utils/fechas';
import { agruparPorCorrida, tituloDeCorrida, ubicacionDeEspacios } from '../../utils/historial';
import type { GrupoCorrida } from '../../utils/historial';
import { describirEstadoAsignacion, describirEventoAuditoria } from '../../utils/diccionarios';
import { FiltrosActivos } from '../../components/ui/FiltrosActivos';
import { Paginador } from '../../components/ui/Paginador';
import type { FiltroActivo } from '../../components/ui/FiltrosActivos';
import { BuscadorSeccion } from '../../components/admin/BuscadorSeccion';
import type { SeccionElegida } from '../../components/admin/BuscadorSeccion';
import { LineaTiempoSeccion } from '../../components/admin/LineaTiempoSeccion';
import { DetalleTecnico } from '../../components/ui/DetalleTecnico';
import { Drawer } from '../../components/ui/Drawer';
import { fraseDeRegistro, indexarEspacios, tieneDetalleTecnico } from '../../utils/textoMotor';
import type { EspaciosPorId } from '../../utils/textoMotor';

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

/** Filtros comunes a las dos vistas: sección elegida y rango de fechas (Issue 4.46). */
interface FiltrosComunes {
  seccion: SeccionElegida | null;
  /** Fechas `AAAA-MM-DD` del campo `date`; vacías = sin límite. */
  desde: string;
  hasta: string;
}

/** Límites del rango en ISO (todo el día de `hasta`), o `null` si el rango no es válido. */
function rangoIso(f: FiltrosComunes): { desde?: string; hasta?: string } | null {
  if (f.desde && f.hasta && f.desde > f.hasta) return null;
  return {
    ...(f.desde && { desde: new Date(`${f.desde}T00:00:00`).toISOString() }),
    ...(f.hasta && { hasta: new Date(`${f.hasta}T23:59:59.999`).toISOString() }),
  };
}

function dentroDelRango(fecha: string, rango: { desde?: string; hasta?: string }): boolean {
  const t = Date.parse(fecha);
  if (rango.desde && t < Date.parse(rango.desde)) return false;
  if (rango.hasta && t > Date.parse(rango.hasta)) return false;
  return true;
}

/** «12 oct 2026» para el chip del filtro de fechas. */
function fechaChip(valor: string): string {
  return new Date(`${valor}T12:00:00`).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const DatosSeccion: React.FC<{ a: HistorialAsignacionDTO; onAbrir: () => void }> = ({
  a,
  onAbrir,
}) => (
  <>
    <button
      type="button"
      onClick={onAbrir}
      className="block min-h-6 text-left font-semibold text-saie-primary underline-offset-2 hover:underline"
    >
      {a.codigoCurso} · {a.codigoSeccion}
      <span className="sr-only">: ver su línea de tiempo</span>
    </button>
    <span className="block text-sm text-saie-muted">{a.nombreCurso}</span>
  </>
);

const DatosAula: React.FC<{ a: HistorialAsignacionDTO }> = ({ a }) =>
  a.espacios.length > 0 ? (
    <>
      <span className="block">{a.espacios.map((e) => e.identificador).join(', ')}</span>
      <span className="block text-sm text-saie-muted">{ubicacionDeEspacios(a.espacios)}</span>
    </>
  ) : (
    <span>—</span>
  );

const DatosEstado: React.FC<{ a: HistorialAsignacionDTO }> = ({ a }) => {
  const motivo = motivoLlano(a);
  return (
    <>
      <InsigniaEstado estado={a.estado} />
      {motivo && <span className="mt-1 block text-sm text-saie-muted">{motivo.descripcion}</span>}
    </>
  );
};

/** Una corrida: su resumen y sus asignaciones (tabla desde `lg`, tarjetas por debajo). */
const GrupoHistorial: React.FC<{
  grupo: GrupoCorrida;
  indice: number;
  onAbrir: (a: HistorialAsignacionDTO) => void;
}> = ({ grupo, indice, onAbrir }) => {
  const idTitulo = `corrida-${indice}`;
  return (
    <section aria-labelledby={idTitulo} className="flex flex-col gap-2">
      <h3 id={idTitulo} className="m-0 text-sm font-bold text-saie-text">
        {tituloDeCorrida(grupo)}
      </h3>
      <div className="hidden lg:block">
        <TablaDatos etiqueta={`Asignaciones: ${tituloDeCorrida(grupo)}`}>
          <CabeceraTabla columnas={['Sección', 'Aula', 'Estado', 'Fecha']} />
          <tbody>
            {grupo.items.map((a) => (
              <tr
                key={a.id}
                onClick={(e) => {
                  // La fila entera abre la línea de tiempo; el botón de la sección es la vía del teclado.
                  if ((e.target as Element).closest('button, a, summary')) return;
                  onAbrir(a);
                }}
                className="cursor-pointer border-t border-saie-divider align-top hover:bg-saie-canvas"
              >
                <td className="px-4 py-3">
                  <DatosSeccion a={a} onAbrir={() => onAbrir(a)} />
                </td>
                <td className="px-4 py-3">
                  <DatosAula a={a} />
                </td>
                <td className="px-4 py-3">
                  <DatosEstado a={a} />
                </td>
                <td className="px-4 py-3 text-sm text-saie-muted">
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
              <DatosSeccion a={a} onAbrir={() => onAbrir(a)} />
            </div>
            <div>
              <span className="block text-sm text-saie-muted">Aula</span>
              <DatosAula a={a} />
            </div>
            <div>
              <DatosEstado a={a} />
            </div>
            <p className="m-0 text-sm text-saie-muted">{formatearFechaAlerta(a.fechaAsignacion)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
};

interface PropsVista {
  /** Cambia al pulsar «Actualizar»: vuelve a pedir los datos conservando los filtros. */
  version: number;
  comunes: FiltrosComunes;
  /** Chips de los filtros comunes, para mostrarlos junto a los de la vista. */
  chipsComunes: FiltroActivo[];
  limpiarComunes: () => void;
}

const VistaHistorial: React.FC<PropsVista & { onAbrir: (a: HistorialAsignacionDTO) => void }> = ({
  version,
  comunes,
  chipsComunes,
  limpiarComunes,
  onAbrir,
}) => {
  const filtroPeriodo = usePeriodoFiltro();
  const periodo = filtroPeriodo.periodo;
  const [estado, setEstado] = useState<'TODOS' | EstadoAsignacion>('TODOS');
  const seccionId = comunes.seccion?.id;
  const rango = rangoIso(comunes);
  const { pagina, tamano, setPagina, cambiarTamano } = usePaginacion(
    'saie:historial:tamanoPagina',
    `${filtroPeriodo.valor}|${estado}|${seccionId ?? ''}|${rango?.desde ?? ''}|${rango?.hasta ?? ''}`,
  );

  const cargar = useCallback(
    () =>
      obtenerHistorial({
        periodo: periodo || undefined,
        estado: estado === 'TODOS' ? undefined : estado,
        seccionId,
        pagina,
        limite: tamano,
      }),
    [periodo, estado, seccionId, pagina, tamano],
  );

  const {
    datos,
    cargando: cargandoDatos,
    error,
    recargar,
  } = useCarga(cargar, {
    clave: `historial:${periodo}|${estado}|${seccionId ?? ''}|${pagina}|${tamano}`,
    // Se espera a saber cuál es el vigente para no pedir el historial dos veces.
    habilitado: filtroPeriodo.listo,
  });
  // Mientras no se sabe el periodo vigente tampoco hay datos: es carga, no «sin resultados».
  const cargando = cargandoDatos || !filtroPeriodo.listo;
  useRecargarAl(version, recargar);
  // El historial no filtra por fecha en el servidor: el rango se aplica a lo recibido.
  const items = useMemo(
    () => (datos?.items ?? []).filter((a) => !rango || dentroDelRango(a.fechaAsignacion, rango)),
    [datos, rango],
  );
  const grupos = useMemo(() => agruparPorCorrida(items), [items]);
  const hayFiltros = chipsComunes.length > 0 || filtroPeriodo.cambiado || estado !== 'TODOS';
  const limpiar = () => {
    filtroPeriodo.restablecer();
    setEstado('TODOS');
    limpiarComunes();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SelectorPeriodo filtro={filtroPeriodo} permitirTodos />
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
      <FiltrosActivos
        filtros={[
          ...chipsComunes,
          ...(filtroPeriodo.cambiado
            ? [
                {
                  id: 'periodo',
                  etiqueta: 'Periodo',
                  valor: filtroPeriodo.todos ? 'Todos los periodos' : filtroPeriodo.valor,
                  onQuitar: filtroPeriodo.restablecer,
                },
              ]
            : []),
          ...(estado !== 'TODOS'
            ? [
                {
                  id: 'estado',
                  etiqueta: 'Estado',
                  valor: describirEstadoAsignacion(estado).etiqueta,
                  onQuitar: () => setEstado('TODOS'),
                },
              ]
            : []),
        ]}
        onLimpiar={limpiar}
      />

      {error && <AvisoError mensaje={error} onReintentar={recargar} />}
      <ZonaActualizable actualizando={cargando && datos !== null}>
        {cargando && !datos ? (
          <EsqueletoCarga texto="Cargando historial…" forma="tabla" />
        ) : items.length === 0 ? (
          hayFiltros ? (
            <EstadoVacio
              titulo="Sin coincidencias"
              icono={ICONOS.portapapeles}
              descripcion="Ninguna asignación coincide con los filtros. Prueba con otra sección o fechas."
              accion={
                <Boton variante="secundario" tamano="sm" onClick={limpiar}>
                  Limpiar filtros
                </Boton>
              }
            />
          ) : (
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
          )
        ) : (
          <div className="flex flex-col gap-5">
            <p className="m-0 text-sm text-saie-muted">
              Pulsa una sección para ver todo lo que pasó con ella.
            </p>
            {grupos.map((grupo, i) => (
              <GrupoHistorial
                key={grupo.corridaId ?? 'individual'}
                grupo={grupo}
                indice={i}
                onAbrir={onAbrir}
              />
            ))}
          </div>
        )}
      </ZonaActualizable>
      <Paginador
        pagina={pagina}
        tamano={tamano}
        total={datos?.total ?? 0}
        onCambiarPagina={setPagina}
        onCambiarTamano={cambiarTamano}
        etiqueta="Paginación del historial"
        nombreRegistros="asignaciones"
      />
    </div>
  );
};

/** Frase del registro con su contexto y, si difiere del texto del motor, el detalle técnico. */
const DetalleRegistro: React.FC<{ r: RegistroAuditoriaDTO; espacios: EspaciosPorId }> = ({
  r,
  espacios,
}) => {
  const { frase, contexto, tecnico } = fraseDeRegistro(r, espacios);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-saie-text">{frase}</span>
      {contexto && <span className="text-sm text-saie-muted">{contexto}</span>}
      {tieneDetalleTecnico(frase, tecnico) && <DetalleTecnico texto={tecnico} />}
    </div>
  );
};

const VistaAuditoria: React.FC<PropsVista & { espacios: EspaciosPorId }> = ({
  version,
  comunes,
  chipsComunes,
  limpiarComunes,
  espacios,
}) => {
  const [tipo, setTipo] = useState<'TODOS' | TipoEventoAuditoria>('TODOS');
  const rango = rangoIso(comunes);
  const desde = rango?.desde;
  const hasta = rango?.hasta;
  const { pagina, tamano, setPagina, cambiarTamano } = usePaginacion(
    'saie:auditoria:tamanoPagina',
    `${tipo}|${desde ?? ''}|${hasta ?? ''}|${comunes.seccion?.id ?? ''}`,
  );

  const cargar = useCallback(
    () =>
      obtenerAuditoria({
        tipo: tipo === 'TODOS' ? undefined : tipo,
        desde,
        hasta,
        pagina,
        limite: tamano,
      }),
    [tipo, desde, hasta, pagina, tamano],
  );

  const { datos, cargando, error, recargar } = useCarga(cargar, {
    clave: `auditoria:${tipo}|${desde ?? ''}|${hasta ?? ''}|${pagina}|${tamano}`,
  });
  useRecargarAl(version, recargar);
  const seccionId = comunes.seccion?.id;
  // La auditoría no filtra por sección en el servidor: se filtra lo recibido.
  const items = (datos?.items ?? []).filter((r) => !seccionId || r.seccion?.id === seccionId);
  const hayFiltros = chipsComunes.length > 0 || tipo !== 'TODOS';
  const limpiar = () => {
    setTipo('TODOS');
    limpiarComunes();
  };

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
      <FiltrosActivos
        filtros={[
          ...chipsComunes,
          ...(tipo !== 'TODOS'
            ? [
                {
                  id: 'tipo',
                  etiqueta: 'Tipo de evento',
                  valor: describirEventoAuditoria(tipo).etiqueta,
                  onQuitar: () => setTipo('TODOS'),
                },
              ]
            : []),
        ]}
        onLimpiar={limpiar}
      />

      {error && <AvisoError mensaje={error} onReintentar={recargar} />}
      <ZonaActualizable actualizando={cargando && datos !== null}>
        {cargando && !datos ? (
          <EsqueletoCarga texto="Cargando auditoría…" forma="tabla" />
        ) : items.length === 0 ? (
          hayFiltros ? (
            <EstadoVacio
              titulo="Sin coincidencias"
              icono={ICONOS.portapapeles}
              descripcion="Ningún registro coincide con los filtros. Prueba con otra sección o fechas."
              accion={
                <Boton variante="secundario" tamano="sm" onClick={limpiar}>
                  Limpiar filtros
                </Boton>
              }
            />
          ) : (
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
          )
        ) : (
          <>
            <div className="hidden lg:block">
              <TablaDatos etiqueta="Registros de auditoría">
                <CabeceraTabla columnas={['Evento', 'Sección', 'Qué pasó', 'Fecha']} />
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id} className="border-t border-saie-divider align-top">
                      <td className="px-4 py-3">
                        <InsigniaEvento tipo={r.tipoEvento} />
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {r.seccion ? `${r.seccion.codigoCurso} · ${r.seccion.codigoSeccion}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <DetalleRegistro r={r} espacios={espacios} />
                      </td>
                      <td className="px-4 py-3 text-sm text-saie-muted">
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
                    <p className="m-0 text-sm font-semibold">
                      {r.seccion.codigoCurso} · {r.seccion.codigoSeccion}
                    </p>
                  )}
                  <DetalleRegistro r={r} espacios={espacios} />
                  <p className="m-0 text-sm text-saie-muted">{formatearFechaAlerta(r.fechaHora)}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </ZonaActualizable>
      <Paginador
        pagina={pagina}
        tamano={tamano}
        total={datos?.total ?? 0}
        onCambiarPagina={setPagina}
        onCambiarTamano={cambiarTamano}
        etiqueta="Paginación del registro de actividad"
        nombreRegistros="registros"
      />
    </div>
  );
};

const cargarEspacios = () => obtenerEspacios();

/**
 * Issue 4.32 — auditoría e historial de asignaciones.
 *
 * Issue 4.46: buscador de sección o curso y rango de fechas comunes a las dos vistas; pulsar una
 * fila del historial abre la línea de tiempo de esa sección en un drawer.
 * Issue 4.49: los registros se leen como frases con el aula y su ubicación, sin UUID; el texto
 * del motor queda bajo «Detalle técnico».
 */
export const AuditoriaAdmin: React.FC = () => {
  const [vista, setVista] = useState<Vista>('historial');
  // Antes «Actualizar» recargaba toda la página y se perdían la pestaña, los filtros y el scroll.
  const [version, setVersion] = useState(0);
  const [comunes, setComunes] = useState<FiltrosComunes>({ seccion: null, desde: '', hasta: '' });
  const [abierta, setAbierta] = useState<HistorialAsignacionDTO | null>(null);
  // Para nombrar las aulas que el motor guarda como UUID (Issue 4.49).
  const { datos: listaEspacios } = useCarga(cargarEspacios, { clave: 'espacios:nombres' });
  const espacios = useMemo(() => indexarEspacios(listaEspacios), [listaEspacios]);

  const rangoInvalido = rangoIso(comunes) === null;
  const chipsComunes: FiltroActivo[] = [
    ...(comunes.seccion
      ? [
          {
            id: 'seccion',
            etiqueta: 'Sección',
            valor: comunes.seccion.nombre,
            onQuitar: () => setComunes((c) => ({ ...c, seccion: null })),
          },
        ]
      : []),
    ...(comunes.desde || comunes.hasta
      ? [
          {
            id: 'fechas',
            etiqueta: 'Fechas',
            valor: `${comunes.desde ? fechaChip(comunes.desde) : 'inicio'} – ${
              comunes.hasta ? fechaChip(comunes.hasta) : 'hoy'
            }`,
            onQuitar: () => setComunes((c) => ({ ...c, desde: '', hasta: '' })),
          },
        ]
      : []),
  ];
  const limpiarComunes = () => setComunes({ seccion: null, desde: '', hasta: '' });
  const propsVista = { version, comunes, chipsComunes, limpiarComunes };

  return (
    <LayoutAdmin
      titulo="Historial"
      subtitulo="Qué pasó con cada sección y cuándo"
      acciones={
        <Boton variante="secundario" onClick={() => setVersion((v) => v + 1)}>
          Actualizar datos
        </Boton>
      }
    >
      <section
        aria-label="Buscar en el historial"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]"
      >
        <BuscadorSeccion
          onElegir={(seccion) => setComunes((c) => ({ ...c, seccion }))}
          className="sm:col-span-2 lg:col-span-1"
        />
        <Campo etiqueta="Desde">
          <input
            type="date"
            value={comunes.desde}
            max={comunes.hasta || undefined}
            onChange={(e) => setComunes((c) => ({ ...c, desde: e.target.value }))}
            aria-invalid={rangoInvalido || undefined}
            aria-describedby={rangoInvalido ? 'error-rango-fechas' : undefined}
            className={CLASE_CAMPO}
          />
        </Campo>
        <Campo etiqueta="Hasta">
          <input
            type="date"
            value={comunes.hasta}
            min={comunes.desde || undefined}
            onChange={(e) => setComunes((c) => ({ ...c, hasta: e.target.value }))}
            aria-invalid={rangoInvalido || undefined}
            aria-describedby={rangoInvalido ? 'error-rango-fechas' : undefined}
            className={CLASE_CAMPO}
          />
        </Campo>
        {rangoInvalido && (
          <p
            id="error-rango-fechas"
            role="alert"
            className="m-0 text-sm text-saie-danger-strong sm:col-span-2 lg:col-span-3"
          >
            La fecha «Desde» es posterior a «Hasta»: corrígela para aplicar el rango.
          </p>
        )}
      </section>
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
          <VistaHistorial {...propsVista} onAbrir={setAbierta} />
        ) : (
          <VistaAuditoria {...propsVista} espacios={espacios} />
        )}
      </section>

      <Drawer
        abierto={abierta !== null}
        onCerrar={() => setAbierta(null)}
        titulo={abierta ? `${abierta.codigoCurso} · ${abierta.codigoSeccion}` : ''}
        subtitulo={abierta ? `${abierta.nombreCurso} · periodo ${abierta.periodo}` : undefined}
      >
        {abierta && <LineaTiempoSeccion seccionId={abierta.seccionId} />}
      </Drawer>
    </LayoutAdmin>
  );
};

export default AuditoriaAdmin;

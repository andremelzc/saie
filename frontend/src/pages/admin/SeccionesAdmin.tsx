import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RUTAS } from '../../config/rutas';
import { ICONOS } from '../../components/ui/iconos';
import { BotonEnlace } from '../../components/ui/BotonEnlace';
import LayoutAdmin, { AvisoError } from '../../components/admin/LayoutAdmin';
import { EsqueletoCarga, EstadoVacio } from '../../components/estudiante/ElementosHorario';
import { Aviso } from '../../components/ui/Aviso';
import { BadgeEstado } from '../../components/ui/BadgeEstado';
import { Boton } from '../../components/ui/Boton';
import { CabeceraTabla, TablaDatos } from '../../components/ui/TablaDatos';
import { CLASE_PIE_DRAWER, Drawer } from '../../components/ui/Drawer';
import { useAvisos } from '../../components/ui/useAvisos';
import { ZonaActualizable } from '../../components/ui/ZonaActualizable';
import { Campo } from '../../components/ui/Campo';
import { CLASE_CAMPO, CLASE_ETIQUETA } from '../../components/ui/campos';
import { useAccion } from '../../hooks/useAccion';
import { useDetalleEnUrl } from '../../hooks/useDetalleEnUrl';
import { useCarga } from '../../hooks/useCarga';
import { useValorDiferido } from '../../hooks/useValorDiferido';
import { usePantallaAncha } from '../../hooks/usePantallaAncha';
import {
  editarSeccion,
  obtenerCatalogoActivo,
  obtenerDocentes,
  obtenerSecciones,
} from '../../services/admin';
import type { DocenteParaAsignarDTO } from '../../services/admin';
import type {
  CambiosSeccion,
  ComparacionVersion,
  SeccionAdminDTO,
  SoftwareDTO,
  TipoEspacio,
} from '../../types/admin';
import { formatearFechaCorta } from '../../utils/fechas';
import { ETIQUETA_DIA, formatearRango } from '../../utils/horario';
import { describirEstadoAsignacion, etiquetaTipoEspacio } from '../../utils/diccionarios';
import { plural } from '../../utils/texto';

const COMPARACIONES: { valor: ComparacionVersion; etiqueta: string }[] = [
  { valor: 'CUALQUIERA', etiqueta: 'Cualquier versión' },
  { valor: 'MINIMA', etiqueta: 'Versión mínima o superior' },
  { valor: 'EXACTA', etiqueta: 'Versión exacta' },
];

/** El estado de la asignación en lenguaje llano: lo que le importa a quien coordina. */
function EtiquetaEstado({ seccion }: { seccion: SeccionAdminDTO }): React.ReactNode {
  const codigo = seccion.asignacion ? seccion.asignacion.estado : 'PENDIENTE';
  const estado = describirEstadoAsignacion(codigo);
  return <BadgeEstado tono={estado.tono}>{estado.etiqueta}</BadgeEstado>;
}

/** La fila de una sección en la tabla de escritorio. */
const FilaSeccion: React.FC<{ seccion: SeccionAdminDTO; onVer: (s: SeccionAdminDTO) => void }> = ({
  seccion,
  onVer,
}) => (
  <tr className="border-t border-saie-divider">
    <td className="px-4 py-3">
      <span className="block font-semibold text-saie-text">
        {seccion.codigoCurso} · {seccion.codigoSeccion}
      </span>
      <span className="block text-xs text-saie-muted">{seccion.nombreCurso}</span>
    </td>
    <td className="px-4 py-3">{etiquetaTipoEspacio(seccion.tipoEspacioRequerido)}</td>
    <td className="px-4 py-3">
      {seccion.asignacion?.espacios.length ? (
        <span className="font-medium text-saie-text">
          {seccion.asignacion.espacios.map((e) => e.identificador).join(', ')}
        </span>
      ) : (
        <span className="text-saie-muted">—</span>
      )}
    </td>
    <td className="px-4 py-3">
      {seccion.docente?.nombre ?? <span className="text-saie-muted">—</span>}
    </td>
    <td className="px-4 py-3 text-center tabular-nums">{seccion.alumnosMatriculados}</td>
    <td className="px-4 py-3">
      <EtiquetaEstado seccion={seccion} />
    </td>
    <td className="px-4 py-3">
      <Boton
        variante="fantasma"
        tamano="sm"
        onClick={() => onVer(seccion)}
        aria-label={`Ver detalle de ${seccion.codigoCurso} ${seccion.codigoSeccion}`}
      >
        Ver
      </Boton>
    </td>
  </tr>
);

/** La tarjeta de una sección en móvil (una tabla de siete columnas no cabe a 320 px). */
const TarjetaSeccion: React.FC<{
  seccion: SeccionAdminDTO;
  onVer: (s: SeccionAdminDTO) => void;
}> = ({ seccion, onVer }) => (
  <article
    aria-label={`${seccion.codigoCurso} · ${seccion.codigoSeccion}`}
    className="flex flex-col gap-3 rounded-xl border border-saie-divider bg-white p-4"
  >
    <header className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <h3 className="m-0 text-base font-bold text-saie-text">
          {seccion.codigoCurso} · {seccion.codigoSeccion}
        </h3>
        <p className="m-0 text-xs text-saie-muted">{seccion.nombreCurso}</p>
      </div>
      <EtiquetaEstado seccion={seccion} />
    </header>
    <dl className="m-0 grid grid-cols-2 gap-2 text-sm">
      <div>
        <dt className="text-xs text-saie-muted">Aula</dt>
        <dd className="m-0 font-medium text-saie-text">
          {seccion.asignacion?.espacios.length
            ? seccion.asignacion.espacios.map((e) => e.identificador).join(', ')
            : '—'}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-saie-muted">Alumnos</dt>
        <dd className="m-0 font-medium text-saie-text">{seccion.alumnosMatriculados}</dd>
      </div>
    </dl>
    <div className="flex justify-end">
      <Boton variante="fantasma" tamano="sm" onClick={() => onVer(seccion)}>
        Ver
      </Boton>
    </div>
  </article>
);

/** ¿El software marcado en el formulario es el mismo que ya exige la sección? */
function mismoSoftware(
  elegidos: Record<string, ComparacionVersion>,
  actuales: SeccionAdminDTO['softwareRequerido'],
): boolean {
  const ids = Object.keys(elegidos);
  return (
    ids.length === actuales.length && actuales.every((s) => elegidos[s.id] === s.comparacionVersion)
  );
}

/** Formulario de edición: tipo de aula, docente y software requerido (Issue 4.31). */
const FormularioSeccion: React.FC<{
  seccion: SeccionAdminDTO;
  docentes: DocenteParaAsignarDTO[];
  catalogo: SoftwareDTO[];
  onGuardado: (resultado: { alertas: { motivo: string }[] }) => void;
  onCancelar: () => void;
  /** Avisa al drawer si hay cambios sin guardar, para pedir confirmación al cerrarlo. */
  onCambiosPendientes?: (hay: boolean) => void;
}> = ({ seccion, docentes, catalogo, onGuardado, onCancelar, onCambiosPendientes }) => {
  const [tipo, setTipo] = useState<TipoEspacio>(seccion.tipoEspacioRequerido);
  const [docenteId, setDocenteId] = useState<string>(seccion.docente?.id ?? '');
  const [busqueda, setBusqueda] = useState('');
  const [elegidos, setElegidos] = useState<Record<string, ComparacionVersion>>(() =>
    Object.fromEntries(seccion.softwareRequerido.map((s) => [s.id, s.comparacionVersion])),
  );
  const { ejecutar } = useAccion();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hayCambios =
    tipo !== seccion.tipoEspacioRequerido ||
    docenteId !== (seccion.docente?.id ?? '') ||
    !mismoSoftware(elegidos, seccion.softwareRequerido);

  useEffect(() => {
    onCambiosPendientes?.(hayCambios);
    return () => onCambiosPendientes?.(false);
  }, [hayCambios, onCambiosPendientes]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return catalogo;
    return catalogo.filter((s) => s.nombre.toLowerCase().includes(q));
  }, [catalogo, busqueda]);

  const alternar = (id: string) => {
    setElegidos((actual) => {
      const copia = { ...actual };
      if (copia[id]) delete copia[id];
      else copia[id] = 'CUALQUIERA';
      return copia;
    });
  };

  const guardar = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (guardando) return;
    setGuardando(true);
    setError(null);
    const cambios: CambiosSeccion = {
      tipoEspacioRequerido: tipo,
      docenteId: docenteId === '' ? null : docenteId,
      softwareRequerido: Object.entries(elegidos).map(([softwareId, comparacionVersion]) => ({
        softwareId,
        comparacionVersion,
      })),
    };
    // El error se muestra en línea, dentro del formulario.
    const resultado = await ejecutar(() => editarSeccion(seccion.id, cambios), {
      avisarError: false,
    });
    setGuardando(false);
    if (resultado?.ok) onGuardado(resultado.valor);
    else if (resultado) setError(resultado.error);
  };

  return (
    <form onSubmit={guardar} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        <Campo etiqueta="Tipo de espacio que necesita">
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoEspacio)}
            className={CLASE_CAMPO}
          >
            <option value="AULA_TEORICA">Aula teórica</option>
            <option value="LABORATORIO">Laboratorio</option>
          </select>
        </Campo>

        <Campo etiqueta="Docente">
          <select
            value={docenteId}
            onChange={(e) => setDocenteId(e.target.value)}
            className={CLASE_CAMPO}
          >
            <option value="">Sin asignar</option>
            {docentes.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre} ({d.codigoDocente})
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <fieldset className="m-0 flex flex-col gap-2">
        <legend className={CLASE_ETIQUETA}>Software que exige la sección</legend>
        <p className="m-0 text-xs text-saie-muted">
          Marca lo que el laboratorio debe tener instalado. El motor solo asigna un laboratorio que
          cumpla con todo lo listado.
        </p>
        <input
          type="search"
          placeholder="Buscar software…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className={CLASE_CAMPO}
          aria-label="Buscar software del catálogo"
        />
        <ul className="m-0 max-h-64 list-none overflow-y-auto rounded-xl border border-saie-divider bg-white p-2">
          {filtrados.length === 0 && (
            <li className="p-3 text-sm text-saie-muted">No hay software que coincida.</li>
          )}
          {filtrados.map((s) => {
            const marcado = Boolean(elegidos[s.id]);
            return (
              <li
                key={s.id}
                className="flex flex-wrap items-center gap-2 border-b border-saie-divider py-1.5 last:border-b-0"
              >
                <label className="flex min-h-11 flex-1 cursor-pointer items-center gap-2 text-sm text-saie-text">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-saie-primary"
                    checked={marcado}
                    onChange={() => alternar(s.id)}
                  />
                  <span>
                    {s.nombre}
                    {s.version ? ` ${s.version}` : ''}
                  </span>
                </label>
                {marcado && (
                  <select
                    value={elegidos[s.id]}
                    aria-label={`Regla de versión para ${s.nombre}`}
                    onChange={(e) =>
                      setElegidos((actual) => ({
                        ...actual,
                        [s.id]: e.target.value as ComparacionVersion,
                      }))
                    }
                    className="rounded-lg border border-saie-divider bg-white px-2 py-1 text-xs"
                  >
                    {COMPARACIONES.map((c) => (
                      <option key={c.valor} value={c.valor}>
                        {c.etiqueta}
                      </option>
                    ))}
                  </select>
                )}
              </li>
            );
          })}
        </ul>
      </fieldset>

      {error && <Aviso tono="error">{error}</Aviso>}

      <div className={`${CLASE_PIE_DRAWER} flex flex-wrap items-center gap-3`}>
        <Boton type="submit" tamano="sm" cargando={guardando} textoCargando="Guardando…">
          Guardar cambios
        </Boton>
        <Boton variante="cancelar" tamano="sm" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </Boton>
        {hayCambios && <BadgeEstado tono="advertencia">Cambios sin guardar</BadgeEstado>}
      </div>
    </form>
  );
};

/**
 * Issue 4.31 — gestión individual de secciones.
 *
 * Hasta ahora las secciones solo se manageban por carga masiva. Aquí se ven una por una con su
 * aula, su docente y el software que exigen, y se pueden editar sin reimportar el CSV.
 */
export const SeccionesAdmin: React.FC = () => {
  const [texto, setTexto] = useState('');
  const [tipo, setTipo] = useState<'TODOS' | TipoEspacio>('TODOS');
  const [periodo, setPeriodo] = useState('');
  // El detalle abierto vive en la URL (`?seccion=<id>`): «Atrás» lo cierra y el enlace se comparte (Issue 4.51).
  const detalle = useDetalleEnUrl('seccion');
  const seleccionadaId = detalle.valor;
  const [editando, setEditando] = useState(false);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);
  const { mostrar } = useAvisos();

  // Se espera una pausa al escribir para no pedir al servidor una vez por tecla (Issue 4.41).
  const textoDiferido = useValorDiferido(texto);
  const periodoDiferido = useValorDiferido(periodo);

  const cargar = useCallback(async () => {
    const listado = await obtenerSecciones({
      q: textoDiferido.trim() || undefined,
      tipo: tipo === 'TODOS' ? undefined : tipo,
      periodo: periodoDiferido.trim() || undefined,
      limite: 200,
    });
    return listado.items;
  }, [textoDiferido, tipo, periodoDiferido]);

  const { datos, cargando, error, recargar } = useCarga(cargar);
  const docentes = useCarga(obtenerDocentes);
  const catalogo = useCarga(obtenerCatalogoActivo);

  /** El listado vacío es una referencia estable: si no, invalidaría los `useMemo` de abajo. */
  const secciones = useMemo(() => datos ?? [], [datos]);
  const esPantallaAncha = usePantallaAncha();

  /**
   * La sección abierta se deriva del listado: así siempre muestra los datos frescos de la
   * última carga, sin necesitar un efecto que sincronice estados.
   */
  const seleccionada = useMemo(
    () => secciones.find((s) => s.id === seleccionadaId) ?? null,
    [secciones, seleccionadaId],
  );

  const abrirDetalle = (seccion: SeccionAdminDTO) => {
    detalle.abrir(seccion.id);
    setEditando(false);
  };

  // Un enlace con una sección que no existe (o ya no está en el periodo) se explica, no rompe la pantalla.
  // Con filtros activos no se avisa: la sección puede existir y solo estar fuera de la búsqueda.
  const sinFiltros = texto === '' && tipo === 'TODOS' && periodo === '';
  const detalleNoEncontrado =
    seleccionadaId !== null && datos !== null && !cargando && seleccionada === null && sinFiltros;

  const manejarGuardado = (resultado: { alertas: { motivo: string }[] }) => {
    setEditando(false);
    recargar();
    if (resultado.alertas.length > 0) {
      mostrar(
        'info',
        `La sección se guardó y generó ${plural(resultado.alertas.length, 'alerta', 'alertas')} en el panel.`,
      );
    } else {
      mostrar('exito', 'Sección actualizada.');
    }
  };

  const lista =
    secciones.length === 0 ? (
      <EstadoVacio
        titulo="Sin secciones"
        icono={ICONOS.libro}
        descripcion="Cuando se carguen cursos y secciones, aparecerán aquí."
        accion={
          <BotonEnlace to={RUTAS.cargaAdmin} variante="secundario" tamano="sm">
            Ir a Carga de datos
          </BotonEnlace>
        }
      />
    ) : esPantallaAncha ? (
      <TablaDatos etiqueta="Listado de secciones">
        <CabeceraTabla
          columnas={['Sección', 'Tipo', 'Aula', 'Docente', 'Alumnos', 'Estado', 'Detalle']}
        />
        <tbody>
          {secciones.map((s) => (
            <FilaSeccion key={s.id} seccion={s} onVer={abrirDetalle} />
          ))}
        </tbody>
      </TablaDatos>
    ) : (
      <ul className="m-0 flex list-none flex-col gap-3 p-0" aria-label="Listado de secciones">
        {secciones.map((s) => (
          <li key={s.id}>
            <TarjetaSeccion seccion={s} onVer={abrirDetalle} />
          </li>
        ))}
      </ul>
    );

  return (
    <LayoutAdmin
      titulo="Secciones"
      subtitulo="Cada curso del periodo, su aula asignada y el software que exige."
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
      <section aria-label="Filtros de secciones" className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Campo etiqueta="Buscar sección">
            <input
              type="search"
              placeholder="Ej. 2020101 o Cálculo"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className={CLASE_CAMPO}
            />
          </Campo>
          <Campo etiqueta="Tipo de espacio">
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as 'TODOS' | TipoEspacio)}
              className={CLASE_CAMPO}
            >
              <option value="TODOS">Todos</option>
              <option value="AULA_TEORICA">Aulas teóricas</option>
              <option value="LABORATORIO">Laboratorios</option>
            </select>
          </Campo>
          <Campo etiqueta="Periodo">
            <input
              type="text"
              placeholder="Ej. 2026-2"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className={CLASE_CAMPO}
            />
          </Campo>
        </div>
        <p className="m-0 text-sm text-saie-muted" aria-live="polite">
          {secciones.length} {secciones.length === 1 ? 'sección' : 'secciones'}
        </p>
      </section>

      {error && <AvisoError mensaje={error} onReintentar={recargar} />}
      {detalleNoEncontrado && (
        <Aviso tono="advertencia" className="flex flex-wrap items-center justify-between gap-3">
          <span>
            No encontramos esa sección. Puede que el enlace sea antiguo o que ya no esté en el
            periodo.
          </span>
          <Boton variante="secundario" tamano="sm" onClick={detalle.cerrar}>
            Quitar del enlace
          </Boton>
        </Aviso>
      )}
      <ZonaActualizable actualizando={cargando && datos !== null}>
        {cargando && !datos ? <EsqueletoCarga texto="Cargando secciones…" forma="tabla" /> : lista}
      </ZonaActualizable>

      <Drawer
        abierto={seleccionada !== null}
        onCerrar={() => {
          detalle.cerrar();
          setEditando(false);
        }}
        titulo={
          seleccionada ? `${seleccionada.codigoCurso} · ${seleccionada.codigoSeccion}` : 'Sección'
        }
        subtitulo={seleccionada?.nombreCurso}
        insignia={seleccionada && <EtiquetaEstado seccion={seleccionada} />}
        hayCambios={editando && cambiosPendientes}
        vista={editando ? 'editar' : 'detalle'}
      >
        {seleccionada && (
          <div className="flex flex-col gap-5">
            <dl className="m-0 rounded-xl border border-saie-divider bg-white p-4 text-sm">
              <div className="border-b border-saie-divider py-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-saie-muted">
                  Aula asignada
                </dt>
                <dd className="m-0 text-saie-text">
                  {seleccionada.asignacion?.espacios.length
                    ? seleccionada.asignacion.espacios
                        .map((e) => `${e.identificador} (${e.pabellon}, piso ${e.piso})`)
                        .join(', ')
                    : 'Sin aula: esta sección espera revisión.'}
                </dd>
              </div>
              <div className="border-b border-saie-divider py-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-saie-muted">
                  Docente
                </dt>
                <dd className="m-0 text-saie-text">
                  {seleccionada.docente ? (
                    `${seleccionada.docente.nombre} (${seleccionada.docente.codigoDocente})`
                  ) : (
                    <span className="text-saie-muted">Sin asignar</span>
                  )}
                </dd>
              </div>
              <div className="border-b border-saie-divider py-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-saie-muted">
                  Horarios
                </dt>
                <dd className="m-0 text-saie-text">
                  {seleccionada.horarios.length === 0
                    ? 'Sin horarios registrados.'
                    : seleccionada.horarios
                        .map(
                          (h) =>
                            `${ETIQUETA_DIA[h.diaSemana]} ${formatearRango(h.horaInicio, h.horaFin)}`,
                        )
                        .join(' · ')}
                </dd>
              </div>
              <div className="py-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-saie-muted">
                  Software requerido
                </dt>
                <dd className="m-0 text-saie-text">
                  {seleccionada.softwareRequerido.length === 0
                    ? 'No exige software: sirve cualquier aula del tipo pedido.'
                    : seleccionada.softwareRequerido
                        .map((s) => `${s.nombre}${s.version ? ` ${s.version}` : ''}`)
                        .join(', ')}
                </dd>
              </div>
            </dl>

            {seleccionada.asignacion && (
              <p className="m-0 text-xs text-saie-muted">
                Asignada el {formatearFechaCorta(seleccionada.asignacion.fechaAsignacion)}
              </p>
            )}

            {editando ? (
              <FormularioSeccion
                seccion={seleccionada}
                docentes={docentes.datos ?? []}
                catalogo={catalogo.datos?.items ?? []}
                onGuardado={manejarGuardado}
                onCancelar={() => setEditando(false)}
                onCambiosPendientes={setCambiosPendientes}
              />
            ) : (
              <div className="flex flex-col gap-2">
                {seleccionada.camposEditables.length > 0 ? (
                  <>
                    <p className="m-0 text-sm text-saie-muted">
                      Puedes cambiar el tipo de aula, el docente y el software que exige la sección.
                    </p>
                    <div>
                      <Boton variante="primario" tamano="sm" onClick={() => setEditando(true)}>
                        Editar sección
                      </Boton>
                    </div>
                  </>
                ) : (
                  <p className="m-0 text-sm text-saie-muted">
                    Tu rol solo puede consultar las secciones: la edición es de Coordinación
                    Académica.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>
    </LayoutAdmin>
  );
};

export default SeccionesAdmin;

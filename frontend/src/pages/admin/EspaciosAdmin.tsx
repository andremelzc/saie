import React, { useState } from 'react';
import { ICONOS } from '../../components/ui/iconos';
import { BotonEnlace } from '../../components/ui/BotonEnlace';
import { Link } from 'react-router-dom';
import LayoutAdmin, { AvisoError } from '../../components/admin/LayoutAdmin';
import FormularioEspacio from '../../components/admin/FormularioEspacio';
import { EsqueletoCarga, EstadoVacio } from '../../components/estudiante/ElementosHorario';
import { Aviso } from '../../components/ui/Aviso';
import { BadgeEstado } from '../../components/ui/BadgeEstado';
import { Boton } from '../../components/ui/Boton';
import { CabeceraTabla, TablaDatos } from '../../components/ui/TablaDatos';
import { Drawer } from '../../components/ui/Drawer';
import { useAvisos } from '../../components/ui/useAvisos';
import { Campo } from '../../components/ui/Campo';
import { CLASE_CAMPO } from '../../components/ui/campos';
import { RUTAS } from '../../config/rutas';
import { useAuth } from '../../context/useAuth';
import { useCarga } from '../../hooks/useCarga';
import { useDetalleEnUrl } from '../../hooks/useDetalleEnUrl';
import { obtenerEspacios } from '../../services/admin';
import type { EspacioAdminDTO, ResultadoEdicionEspacioDTO, TipoEspacio } from '../../types/admin';
import { etiquetaCampoEspacio, etiquetaTipoEspacio } from '../../utils/diccionarios';
import { plural } from '../../utils/texto';

type Filtro = 'TODOS' | TipoEspacio;

const Dato: React.FC<{ etiqueta: string; children: React.ReactNode }> = ({
  etiqueta,
  children,
}) => (
  <div className="flex flex-col gap-0.5 border-b border-saie-divider py-2 last:border-b-0">
    <dt className="text-xs font-semibold uppercase tracking-wide text-saie-muted">{etiqueta}</dt>
    <dd className="m-0 text-sm text-saie-text">{children}</dd>
  </div>
);

/** Capacidad del espacio: el número, o un guion si no está definida. */
function celdaCapacidad(espacio: EspacioAdminDTO): React.ReactNode {
  if (espacio.aforoNominal > 0) return espacio.aforoNominal;
  return <span className="text-saie-muted">—</span>;
}

/** PCs malogradas: no aplica en un aula teórica, sin registrar o el número. */
function celdaPcs(espacio: EspacioAdminDTO): React.ReactNode {
  if (espacio.tipo === 'AULA_TEORICA') {
    return <span className="text-saie-muted">No aplica</span>;
  }
  if (espacio.pcsMalogradas == null) {
    return <BadgeEstado tono="neutro">Sin registrar</BadgeEstado>;
  }
  return espacio.pcsMalogradas;
}

/** Estado del espacio: en servicio o fuera de ella. */
function celdaEstado(espacio: EspacioAdminDTO): React.ReactNode {
  return (
    <BadgeEstado tono={espacio.habilitado ? 'exito' : 'peligro'}>
      {espacio.habilitado ? 'En servicio' : 'Fuera de servicio'}
    </BadgeEstado>
  );
}

/** PCs del laboratorio en el detalle: no aplica, sin registrar o el número. */
function detallePcs(espacio: EspacioAdminDTO): React.ReactNode {
  if (espacio.tipo === 'AULA_TEORICA') {
    return <span className="text-saie-muted">No aplica: es un aula teórica.</span>;
  }
  if (espacio.pcsMalogradas == null) {
    return <BadgeEstado tono="neutro">Sin registrar</BadgeEstado>;
  }
  return `${espacio.pcsMalogradas} PCs`;
}

/** Software del laboratorio en el detalle: no aplica o la lista instalada. */
function detalleSoftware(espacio: EspacioAdminDTO): React.ReactNode {
  if (espacio.tipo === 'AULA_TEORICA') {
    return <p className="m-0 text-sm text-saie-muted">No aplica: es un aula teórica.</p>;
  }
  if (!espacio.softwareInstalado || espacio.softwareInstalado.length === 0) {
    return <p className="m-0 text-sm text-saie-muted">Sin software registrado.</p>;
  }
  return (
    <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
      {espacio.softwareInstalado.map((s) => (
        <li key={s.id} className="rounded-full bg-saie-canvas px-3 py-1 text-sm text-saie-text">
          {s.nombre}
          {s.version ? ` ${s.version}` : ''}
        </li>
      ))}
    </ul>
  );
}

/** Título del drawer: el alta, la edición («Editar AULA-101») o el espacio que se consulta. */
function tituloDrawer(
  creando: boolean,
  editando: boolean,
  seleccionado: EspacioAdminDTO | null,
): string {
  if (creando) return 'Nuevo espacio';
  if (!seleccionado) return 'Espacio';
  return editando ? `Editar ${seleccionado.identificador}` : seleccionado.identificador;
}

/** Segunda línea del drawer: tipo y ubicación del espacio. */
function subtituloDrawer(
  creando: boolean,
  seleccionado: EspacioAdminDTO | null,
): string | undefined {
  if (creando || !seleccionado) return undefined;
  return `${etiquetaTipoEspacio(seleccionado.tipo)} · ${seleccionado.pabellon}, piso ${seleccionado.piso}`;
}

/**
 * Listado de espacios. Desde `lg` es una tabla (compara filas de un vistazo) y por debajo son
 * tarjetas: una tabla de siete columnas no cabe a 320 px y obligaría a un scroll horizontal. El
 * cambio lo hace el CSS (`hidden lg:block` / `lg:hidden`), no JavaScript, así que no hay parpadeo
 * de maquetación al cargar (Issue 3.54).
 */
const ListadoEspacios: React.FC<{
  espacios: EspacioAdminDTO[];
  onVer: (espacio: EspacioAdminDTO) => void;
}> = ({ espacios, onVer }) => {
  const tarjetas = (
    <ul
      className="m-0 flex list-none flex-col gap-3 p-0 lg:hidden"
      aria-label="Listado de espacios"
    >
      {espacios.map((e) => (
        <li key={e.id}>
          <article className="flex flex-col gap-3 rounded-xl border border-saie-divider bg-white p-4">
            <header className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="m-0 text-base font-bold text-saie-text">{e.identificador}</h3>
                <p className="m-0 text-xs text-saie-muted">
                  {etiquetaTipoEspacio(e.tipo)} · {e.pabellon} · Piso {e.piso}
                </p>
              </div>
              {celdaEstado(e)}
            </header>
            <dl className="m-0 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-xs text-saie-muted">Capacidad</dt>
                <dd className="m-0 font-medium text-saie-text">{celdaCapacidad(e)}</dd>
              </div>
              <div>
                <dt className="text-xs text-saie-muted">PCs malogradas</dt>
                <dd className="m-0 font-medium text-saie-text">{celdaPcs(e)}</dd>
              </div>
            </dl>
            <div className="flex justify-end">
              <Boton
                variante="fantasma"
                tamano="sm"
                onClick={() => onVer(e)}
                aria-label={`Ver detalle de ${e.identificador}`}
              >
                Ver
              </Boton>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );

  const tabla = (
    <div className="hidden lg:block">
      <TablaDatos etiqueta="Listado de espacios">
        <CabeceraTabla
          columnas={[
            'Espacio',
            'Tipo',
            'Ubicación',
            'Capacidad',
            'PCs malogradas',
            'Estado',
            'Detalle',
          ]}
        />
        <tbody>
          {espacios.map((e) => (
            <tr key={e.id} className="border-t border-saie-divider">
              <td className="px-4 py-3 font-semibold">{e.identificador}</td>
              <td className="px-4 py-3">{etiquetaTipoEspacio(e.tipo)}</td>
              <td className="px-4 py-3">
                {e.pabellon} · Piso {e.piso}
              </td>
              <td className="px-4 py-3 tabular-nums">{celdaCapacidad(e)}</td>
              <td className="px-4 py-3">{celdaPcs(e)}</td>
              <td className="px-4 py-3">{celdaEstado(e)}</td>
              <td className="px-4 py-3">
                <Boton
                  variante="fantasma"
                  tamano="sm"
                  onClick={() => onVer(e)}
                  aria-label={`Ver detalle de ${e.identificador}`}
                >
                  Ver
                </Boton>
              </td>
            </tr>
          ))}
        </tbody>
      </TablaDatos>
    </div>
  );

  return (
    <>
      {tarjetas}
      {tabla}
    </>
  );
};

const DetalleEspacio: React.FC<{
  espacio: EspacioAdminDTO;
  /** Espacios del panel: los contiguos llegan como ids y se muestran por su código. */
  espacios: EspacioAdminDTO[];
  onEditar: () => void;
}> = ({ espacio, espacios, onEditar }) => {
  const codigoDe = (id: string) => espacios.find((e) => e.id === id)?.identificador ?? id;
  const campos = espacio.camposEditables;

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="detalle-datos">
        <h3 id="detalle-datos" className="m-0 mb-2 text-base font-bold text-saie-text">
          Datos del espacio
        </h3>
        <dl className="m-0 rounded-xl border border-saie-divider bg-white px-4">
          <Dato etiqueta="Tipo">{etiquetaTipoEspacio(espacio.tipo)}</Dato>
          <Dato etiqueta="Ubicación">
            {espacio.pabellon} · Piso {espacio.piso}
          </Dato>
          <Dato etiqueta="Capacidad">
            {espacio.aforoNominal > 0 ? (
              `${espacio.aforoNominal} estudiantes`
            ) : (
              <span className="text-saie-muted">Sin definir</span>
            )}
          </Dato>
          <Dato etiqueta="PCs malogradas">{detallePcs(espacio)}</Dato>
          <Dato etiqueta="Estado">
            <BadgeEstado tono={espacio.habilitado ? 'exito' : 'peligro'}>
              {espacio.habilitado ? 'En servicio' : 'Fuera de servicio'}
            </BadgeEstado>
          </Dato>
          <Dato etiqueta="Uso previsto">
            {espacio.descripcionUso ?? 'Sin descripción registrada.'}
          </Dato>
        </dl>
      </section>

      <section aria-labelledby="detalle-software">
        <h3 id="detalle-software" className="m-0 mb-2 text-base font-bold text-saie-text">
          Software instalado
        </h3>
        {detalleSoftware(espacio)}
      </section>

      <section aria-labelledby="detalle-contiguos">
        <h3 id="detalle-contiguos" className="m-0 mb-2 text-base font-bold text-saie-text">
          Espacios contiguos
        </h3>
        {espacio.contiguos.length > 0 ? (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {espacio.contiguos.map((c) => (
              <li key={c} className="rounded-full bg-saie-canvas px-3 py-1 text-sm text-saie-text">
                {codigoDe(c)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-sm text-saie-muted">Ninguno registrado.</p>
        )}
      </section>

      <section
        aria-labelledby="detalle-edicion"
        className="flex flex-col gap-3 rounded-xl border border-saie-primary/25 bg-white p-4"
      >
        <h3 id="detalle-edicion" className="m-0 text-sm font-bold text-saie-text">
          Edición
        </h3>
        {campos.length > 0 ? (
          <>
            <p className="m-0 text-sm text-saie-muted">
              Puedes editar: {campos.map(etiquetaCampoEspacio).join(', ')}.
            </p>
            <div>
              <Boton variante="primario" tamano="sm" onClick={onEditar}>
                Editar espacio
              </Boton>
            </div>
          </>
        ) : (
          <>
            <p className="m-0 text-sm text-saie-muted">
              Tu rol no puede editar este espacio: solo puedes consultarlo.
            </p>
            {espacio.tipo === 'LABORATORIO' && (
              <p className="m-0 text-sm text-saie-muted">
                Si necesitas cambiar su software o sus PCs, usa{' '}
                <Link to={RUTAS.cambioLaboratorio} className="font-semibold text-saie-primary">
                  Cambio de laboratorio
                </Link>
                .
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
};

/** Listado de espacios para Coordinación (Issue 4.15). */
export const EspaciosAdmin: React.FC = () => {
  const cargar = React.useCallback(() => obtenerEspacios(), []);
  const { datos, cargando, error, recargar } = useCarga(cargar);
  const { mostrar } = useAvisos();
  const { sesion } = useAuth();
  const [filtro, setFiltro] = useState<Filtro>('TODOS');
  const [pabellon, setPabellon] = useState('TODOS');
  const [piso, setPiso] = useState('TODOS');
  const [texto, setTexto] = useState('');
  const [soloDeshabilitados, setSoloDeshabilitados] = useState(false);
  // El detalle abierto vive en la URL (`?espacio=AULA-101`): «Atrás» lo cierra y el enlace se comparte (Issue 4.51).
  const detalle = useDetalleEnUrl('espacio');
  /** El espacio recién creado o editado: el listado tarda en recargarse y no debe parecer «inexistente». */
  const [guardadoReciente, setGuardadoReciente] = useState<EspacioAdminDTO | null>(null);
  const [editando, setEditando] = useState(false);
  const [creando, setCreando] = useState(false);
  const [alertas, setAlertas] = useState<string[]>([]);
  const [cambiosPendientes, setCambiosPendientes] = useState(false);

  // El alta es solo de Coordinación Académica (así lo define el endpoint del backend).
  const esCoordinacion = sesion?.rol === 'COORDINACION_ACADEMICA';

  const base = datos ?? [];
  const seleccionado =
    detalle.valor === null
      ? null
      : (base.find((e) => e.identificador === detalle.valor) ??
        (guardadoReciente?.identificador === detalle.valor ? guardadoReciente : null));
  const detalleNoEncontrado =
    detalle.valor !== null && datos !== null && !cargando && seleccionado === null;
  const pabellones = [...new Set(base.map((e) => e.pabellon))].sort((a, b) =>
    a.localeCompare(b, 'es'),
  );
  const pisos = [...new Set(base.map((e) => e.piso))].sort((a, b) => a - b);

  const espacios = base
    .filter((e) => filtro === 'TODOS' || e.tipo === filtro)
    .filter((e) => pabellon === 'TODOS' || e.pabellon === pabellon)
    .filter((e) => piso === 'TODOS' || String(e.piso) === piso)
    .filter((e) => !soloDeshabilitados || !e.habilitado)
    .filter((e) => e.identificador.toLowerCase().includes(texto.trim().toLowerCase()))
    .sort((a, b) => a.identificador.localeCompare(b.identificador, 'es', { numeric: true }));

  const hayFiltros =
    filtro !== 'TODOS' ||
    pabellon !== 'TODOS' ||
    piso !== 'TODOS' ||
    soloDeshabilitados ||
    texto.trim() !== '';

  function limpiarFiltros() {
    setFiltro('TODOS');
    setPabellon('TODOS');
    setPiso('TODOS');
    setSoloDeshabilitados(false);
    setTexto('');
  }

  function abrirDetalle(espacio: EspacioAdminDTO) {
    detalle.abrir(espacio.identificador);
    setEditando(false);
    setCreando(false);
    setAlertas([]);
  }

  function cerrarDetalle() {
    if (detalle.valor !== null) detalle.cerrar();
    setEditando(false);
    setCreando(false);
    setAlertas([]);
  }

  function abrirAlta() {
    if (detalle.valor !== null) detalle.cerrar();
    setEditando(false);
    setCreando(true);
    setAlertas([]);
  }

  function manejarGuardado(resultado: ResultadoEdicionEspacioDTO) {
    const esNuevo = creando;
    setGuardadoReciente(resultado.espacio);
    detalle.reemplazar(resultado.espacio.identificador);
    setEditando(false);
    setCreando(false);
    setAlertas(resultado.alertas.map((a) => a.motivo));
    // Los contiguos son bidireccionales: la lista completa puede haber cambiado.
    recargar();
    mostrar(
      'exito',
      esNuevo
        ? `Espacio ${resultado.espacio.identificador} creado.`
        : `Espacio ${resultado.espacio.identificador} actualizado.`,
    );
  }

  const aulas = (datos ?? []).filter((e) => e.tipo === 'AULA_TEORICA').length;
  const laboratorios = (datos ?? []).filter((e) => e.tipo === 'LABORATORIO').length;
  const fueraDeServicio = (datos ?? []).filter((e) => !e.habilitado).length;

  // El listado tiene tres estados: cargando, sin espacios registrados y con espacios.
  const contenidoListado = (() => {
    if (cargando && !datos) return <EsqueletoCarga texto="Cargando espacios…" forma="tabla" />;
    if (base.length === 0) {
      return (
        <EstadoVacio
          titulo="Sin espacios registrados"
          icono={ICONOS.edificio}
          descripcion="Cuando se carguen los espacios, aparecerán aquí."
          accion={
            <BotonEnlace to={RUTAS.cargaAdmin} variante="secundario" tamano="sm">
              Ir a Carga de datos
            </BotonEnlace>
          }
        />
      );
    }
    if (espacios.length === 0) {
      return (
        <EstadoVacio
          titulo="Sin coincidencias"
          icono={ICONOS.edificio}
          descripcion="No hay espacios que coincidan con los filtros."
          accion={
            <Boton variante="secundario" tamano="sm" onClick={limpiarFiltros}>
              Limpiar filtros
            </Boton>
          }
        />
      );
    }
    return <ListadoEspacios espacios={espacios} onVer={abrirDetalle} />;
  })();

  // El drawer muestra una de las tres vistas posibles: el alta, la edición o la consulta.
  const contenidoDrawer = (() => {
    if (creando) {
      return (
        <FormularioEspacio
          modo="crear"
          espacios={base}
          onGuardado={manejarGuardado}
          onCancelar={cerrarDetalle}
          onCambiosPendientes={setCambiosPendientes}
        />
      );
    }
    if (editando && seleccionado) {
      return (
        <FormularioEspacio
          modo="editar"
          espacio={seleccionado}
          espacios={base}
          onGuardado={manejarGuardado}
          onCancelar={() => setEditando(false)}
          onCambiosPendientes={setCambiosPendientes}
        />
      );
    }
    if (seleccionado) {
      return (
        <DetalleEspacio
          espacio={seleccionado}
          espacios={base}
          onEditar={() => {
            setAlertas([]);
            setEditando(true);
          }}
        />
      );
    }
    return null;
  })();

  return (
    <LayoutAdmin
      titulo="Espacios"
      subtitulo="Aulas teóricas y laboratorios del pabellón."
      acciones={
        <div className="flex flex-wrap gap-2">
          {esCoordinacion && (
            <Boton variante="primario" onClick={abrirAlta}>
              Nuevo espacio
            </Boton>
          )}
          <Boton
            variante="secundario"
            onClick={recargar}
            cargando={cargando}
            textoCargando="Actualizando…"
          >
            Actualizar
          </Boton>
        </div>
      }
    >
      <section aria-label="Filtros de espacios" className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo etiqueta="Buscar espacio">
            <input
              type="search"
              placeholder="Ej. AULA-101"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className={CLASE_CAMPO}
            />
          </Campo>
          <Campo etiqueta="Tipo de espacio">
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as Filtro)}
              className={CLASE_CAMPO}
            >
              <option value="TODOS">Todos</option>
              <option value="AULA_TEORICA">Aulas teóricas</option>
              <option value="LABORATORIO">Laboratorios</option>
            </select>
          </Campo>
          <Campo etiqueta="Pabellón">
            <select
              value={pabellon}
              onChange={(e) => setPabellon(e.target.value)}
              className={CLASE_CAMPO}
            >
              <option value="TODOS">Todos</option>
              {pabellones.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Piso">
            <select value={piso} onChange={(e) => setPiso(e.target.value)} className={CLASE_CAMPO}>
              <option value="TODOS">Todos</option>
              {pisos.map((p) => (
                <option key={p} value={String(p)}>
                  Piso {p}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {datos && (
            <p className="m-0 text-sm text-saie-muted" aria-live="polite">
              <strong className="text-saie-text">{espacios.length}</strong> de {base.length}{' '}
              coinciden
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-6 w-6 accent-saie-primary"
                checked={soloDeshabilitados}
                onChange={(e) => setSoloDeshabilitados(e.target.checked)}
              />
              <span>Solo fuera de servicio</span>
            </label>
            {hayFiltros && (
              <Boton variante="secundario" tamano="sm" onClick={limpiarFiltros}>
                Limpiar filtros
              </Boton>
            )}
          </div>
        </div>
      </section>

      {datos && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-saie-divider bg-white px-2.5 py-1 font-semibold text-saie-text">
            {plural(datos.length, 'espacio', 'espacios')}
          </span>
          <span className="rounded-full border border-saie-divider bg-white px-2.5 py-1 text-saie-muted">
            {plural(aulas, 'aula teórica', 'aulas teóricas')}
          </span>
          <span className="rounded-full border border-saie-divider bg-white px-2.5 py-1 text-saie-muted">
            {plural(laboratorios, 'laboratorio', 'laboratorios')}
          </span>
          {fueraDeServicio > 0 && (
            <span className="rounded-full bg-saie-danger-soft px-2.5 py-1 font-semibold text-saie-danger-strong">
              {fueraDeServicio} fuera de servicio
            </span>
          )}
        </div>
      )}

      {error && <AvisoError mensaje={error} onReintentar={recargar} />}
      {detalleNoEncontrado && (
        <Aviso tono="advertencia" className="flex flex-wrap items-center justify-between gap-3">
          <span>
            No encontramos el espacio «{detalle.valor}». Puede que el enlace sea antiguo o que el
            código haya cambiado.
          </span>
          <Boton variante="secundario" tamano="sm" onClick={detalle.cerrar}>
            Quitar del enlace
          </Boton>
        </Aviso>
      )}

      {contenidoListado}

      <Drawer
        abierto={seleccionado !== null || creando}
        onCerrar={cerrarDetalle}
        titulo={tituloDrawer(creando, editando, seleccionado)}
        subtitulo={subtituloDrawer(creando, seleccionado)}
        insignia={seleccionado && !creando ? celdaEstado(seleccionado) : undefined}
        hayCambios={(creando || editando) && cambiosPendientes}
        vista={creando ? 'crear' : editando ? 'editar' : 'detalle'}
      >
        {(seleccionado || creando) && (
          <div className="flex flex-col gap-4">
            {alertas.length > 0 && (
              <Aviso tono="advertencia">
                <p className="m-0 font-semibold">
                  El cambio generó{' '}
                  {alertas.length === 1 ? 'una alerta' : `${alertas.length} alertas`}:
                </p>
                <ul className="m-0 mt-1 list-disc pl-5">
                  {[...new Set(alertas)].map((motivo) => (
                    <li key={motivo}>{motivo}</li>
                  ))}
                </ul>
              </Aviso>
            )}
            {contenidoDrawer}
          </div>
        )}
      </Drawer>
    </LayoutAdmin>
  );
};

export default EspaciosAdmin;

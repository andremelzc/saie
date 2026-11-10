import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RUTAS } from '../../config/rutas';
import { ICONOS } from '../../components/ui/iconos';
import { BotonEnlace } from '../../components/ui/BotonEnlace';
import LayoutAdmin, { AvisoError } from '../../components/admin/LayoutAdmin';
import { EsqueletoCarga, EstadoVacio } from '../../components/estudiante/ElementosHorario';
import { Aviso } from '../../components/ui/Aviso';
import { BadgeEstado } from '../../components/ui/BadgeEstado';
import { EstadoAsignacion } from '../../components/ui/EstadoAsignacion';
import { Paginador } from '../../components/ui/Paginador';
import { FiltrosActivos } from '../../components/ui/FiltrosActivos';
import type { FiltroActivo } from '../../components/ui/FiltrosActivos';
import { Boton } from '../../components/ui/Boton';
import { ResumenErrores } from '../../components/ui/ResumenErrores';
import { admiteVersionMinima } from '../../utils/catalogoSoftware';
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
import { formatearBloqueHorario } from '../../utils/etiquetas';
import { etiquetaTipoEspacio } from '../../utils/diccionarios';
import { plural } from '../../utils/texto';

const COMPARACIONES: { valor: ComparacionVersion; etiqueta: string }[] = [
  { valor: 'CUALQUIERA', etiqueta: 'Cualquier versión' },
  { valor: 'MINIMA', etiqueta: 'Versión mínima o superior' },
  { valor: 'EXACTA', etiqueta: 'Versión exacta' },
];

/** Tamaño de página recordado entre visitas (Issue 4.38). */
const CLAVE_TAMANO_PAGINA = 'saie:secciones:tamanoPagina';
const TAMANOS_PAGINA = [25, 50, 100, 200];
const TAMANO_POR_DEFECTO = 50;

function leerTamanoPagina(): number {
  try {
    const valor = Number(window.localStorage.getItem(CLAVE_TAMANO_PAGINA));
    return TAMANOS_PAGINA.includes(valor) ? valor : TAMANO_POR_DEFECTO;
  } catch {
    return TAMANO_POR_DEFECTO;
  }
}

function guardarTamanoPagina(tamano: number): void {
  try {
    window.localStorage.setItem(CLAVE_TAMANO_PAGINA, String(tamano));
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): se usa el tamaño solo en esta visita.
  }
}

/** El estado de la asignación en lenguaje llano: lo que le importa a quien coordina. */
function EtiquetaEstado({ seccion }: { seccion: SeccionAdminDTO }): React.ReactNode {
  return (
    <EstadoAsignacion
      estado={seccion.asignacion?.estado}
      cantidadEspacios={seccion.asignacion?.espacios.length ?? 0}
    />
  );
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
      <span className="block text-sm text-saie-muted">{seccion.nombreCurso}</span>
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
      <Boton variante="fantasma" tamano="sm" onClick={() => onVer(seccion)}>
        Ver detalle{' '}
        <span className="sr-only">de {`${seccion.codigoCurso} ${seccion.codigoSeccion}`}</span>
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
        <p className="m-0 text-sm text-saie-muted">{seccion.nombreCurso}</p>
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
      <div>
        <dt className="text-xs text-saie-muted">Docente</dt>
        <dd className="m-0 font-medium text-saie-text">{seccion.docente?.nombre ?? '—'}</dd>
      </div>
      <div>
        <dt className="text-xs text-saie-muted">Tipo</dt>
        <dd className="m-0 font-medium text-saie-text">
          {etiquetaTipoEspacio(seccion.tipoEspacioRequerido)}
        </dd>
      </div>
    </dl>
    <div className="flex justify-end">
      <Boton variante="fantasma" tamano="sm" onClick={() => onVer(seccion)}>
        Ver detalle{' '}
        <span className="sr-only">de {`${seccion.codigoCurso} ${seccion.codigoSeccion}`}</span>
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
  /** Issue 3.41: error del tipo de espacio y resumen al intentar guardar. */
  const [errorTipo, setErrorTipo] = useState<string | null>(null);
  const [resumenVisible, setResumenVisible] = useState(false);
  const validarTipo = (t: TipoEspacio, software: Record<string, ComparacionVersion>) =>
    t === 'AULA_TEORICA' && Object.keys(software).length > 0
      ? 'Un aula teórica no tiene software: elige «Laboratorio» o quita el software marcado.'
      : null;

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
    const errorEncontrado = validarTipo(tipo, elegidos);
    setErrorTipo(errorEncontrado);
    if (errorEncontrado) {
      setResumenVisible(true);
      document.getElementById(`tipo-seccion-${seccion.id}`)?.focus();
      return;
    }
    setResumenVisible(false);
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
        <div className="flex flex-col gap-1">
          <Campo etiqueta="Tipo de espacio que necesita">
            <select
              id={`tipo-seccion-${seccion.id}`}
              value={tipo}
              onChange={(e) => {
                const nuevo = e.target.value as TipoEspacio;
                setTipo(nuevo);
                if (errorTipo) setErrorTipo(validarTipo(nuevo, elegidos));
              }}
              onBlur={() => setErrorTipo(validarTipo(tipo, elegidos))}
              aria-invalid={errorTipo ? true : undefined}
              aria-describedby={errorTipo ? `tipo-seccion-${seccion.id}-error` : undefined}
              className={CLASE_CAMPO}
            >
              <option value="AULA_TEORICA">Aula teórica</option>
              <option value="LABORATORIO">Laboratorio</option>
            </select>
          </Campo>
          {errorTipo && (
            <p
              id={`tipo-seccion-${seccion.id}-error`}
              className="m-0 text-sm font-medium text-saie-danger"
            >
              {errorTipo}
            </p>
          )}
        </div>

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
          Marca lo que el laboratorio debe tener instalado. La asignación automática solo elige un
          laboratorio que cumpla con todo lo listado.
        </p>
        <input
          type="search"
          placeholder="Buscar software…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className={`${CLASE_CAMPO} sticky top-0 z-10`}
          aria-label="Buscar software del catálogo"
        />
        <ul className="m-0 list-none rounded-xl border border-saie-divider bg-white p-2">
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
                    className="min-h-11 rounded-lg border border-saie-border bg-white px-2 py-1 text-xs"
                  >
                    {COMPARACIONES.map((c) => (
                      <option
                        key={c.valor}
                        value={c.valor}
                        // Spec 08 §3: «mínima» solo con versiones numéricas (3.11, 2024.1).
                        disabled={c.valor === 'MINIMA' && !admiteVersionMinima(s.version ?? '')}
                      >
                        {c.etiqueta}
                        {c.valor === 'MINIMA' && !admiteVersionMinima(s.version ?? '')
                          ? ' (no aplica a esta versión)'
                          : ''}
                      </option>
                    ))}
                  </select>
                )}
              </li>
            );
          })}
        </ul>
      </fieldset>

      {resumenVisible && errorTipo && (
        <ResumenErrores
          errores={[
            {
              idCampo: `tipo-seccion-${seccion.id}`,
              etiqueta: 'Tipo de espacio que necesita',
              mensaje: errorTipo,
            },
          ]}
        />
      )}
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
  const [pagina, setPagina] = useState(1);
  const [tamanoPagina, setTamanoPagina] = useState(leerTamanoPagina);
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
    return obtenerSecciones({
      q: textoDiferido.trim() || undefined,
      tipo: tipo === 'TODOS' ? undefined : tipo,
      periodo: periodoDiferido.trim() || undefined,
      pagina,
      limite: tamanoPagina,
    });
  }, [textoDiferido, tipo, periodoDiferido, pagina, tamanoPagina]);

  const { datos, cargando, error, recargar } = useCarga(cargar, {
    clave: `secciones:${textoDiferido.trim()}|${tipo}|${periodoDiferido.trim()}|${pagina}|${tamanoPagina}`,
  });
  // Docentes y catálogo solo hacen falta al editar: no se piden hasta abrir la edición (Issue 3.49).
  const docentes = useCarga(obtenerDocentes, { clave: 'docentes', habilitado: editando });
  const catalogo = useCarga(obtenerCatalogoActivo, {
    clave: 'catalogo-activo',
    habilitado: editando,
  });

  /** El listado vacío es una referencia estable: si no, invalidaría los `useMemo` de abajo. */
  const secciones = useMemo(() => datos?.items ?? [], [datos]);
  /** Total real de la consulta (no solo de la página): lo devuelve el backend. */
  const total = datos?.total ?? 0;

  // Al filtrar se vuelve a la página 1: la página anterior puede no existir con el filtro nuevo.
  const cambiarTexto = (valor: string) => {
    setTexto(valor);
    setPagina(1);
  };
  const cambiarTipo = (valor: 'TODOS' | TipoEspacio) => {
    setTipo(valor);
    setPagina(1);
  };
  const cambiarPeriodo = (valor: string) => {
    setPeriodo(valor);
    setPagina(1);
  };
  const limpiarFiltros = () => {
    setTexto('');
    setTipo('TODOS');
    setPeriodo('');
    setPagina(1);
  };
  const filtrosActivos: FiltroActivo[] = [
    ...(texto.trim()
      ? [{ id: 'q', etiqueta: 'Búsqueda', valor: texto.trim(), onQuitar: () => cambiarTexto('') }]
      : []),
    ...(tipo !== 'TODOS'
      ? [
          {
            id: 'tipo',
            etiqueta: 'Tipo de espacio',
            valor: etiquetaTipoEspacio(tipo),
            onQuitar: () => cambiarTipo('TODOS'),
          },
        ]
      : []),
    ...(periodo.trim()
      ? [
          {
            id: 'periodo',
            etiqueta: 'Periodo',
            valor: periodo.trim(),
            onQuitar: () => cambiarPeriodo(''),
          },
        ]
      : []),
  ];
  const cambiarTamanoPagina = (tamano: number) => {
    setTamanoPagina(tamano);
    guardarTamanoPagina(tamano);
    setPagina(1);
  };

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
  // Solo se afirma que no existe si el listado completo cabe en la página cargada: si hay más
  // páginas, la sección puede estar en otra.
  const detalleNoEncontrado =
    seleccionadaId !== null &&
    datos !== null &&
    !cargando &&
    seleccionada === null &&
    sinFiltros &&
    total <= secciones.length;

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
    ) : (
      // Tabla desde `lg` y tarjetas por debajo, resueltas con CSS para que no haya parpadeo (Issue 3.54).
      <>
        <div className="hidden lg:block">
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
        </div>
        <ul
          className="m-0 flex list-none flex-col gap-3 p-0 lg:hidden"
          aria-label="Listado de secciones"
        >
          {secciones.map((s) => (
            <li key={s.id}>
              <TarjetaSeccion seccion={s} onVer={abrirDetalle} />
            </li>
          ))}
        </ul>
      </>
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
          Actualizar datos
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
              onChange={(e) => cambiarTexto(e.target.value)}
              className={CLASE_CAMPO}
            />
          </Campo>
          <Campo etiqueta="Tipo de espacio">
            <select
              value={tipo}
              onChange={(e) => cambiarTipo(e.target.value as 'TODOS' | TipoEspacio)}
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
              onChange={(e) => cambiarPeriodo(e.target.value)}
              className={CLASE_CAMPO}
            />
          </Campo>
        </div>
        <FiltrosActivos filtros={filtrosActivos} onLimpiar={limpiarFiltros} />
        <p className="m-0 text-sm text-saie-muted" aria-live="polite">
          {total} {total === 1 ? 'sección' : 'secciones'}
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

      <Paginador
        pagina={pagina}
        tamano={tamanoPagina}
        total={total}
        onCambiarPagina={setPagina}
        onCambiarTamano={cambiarTamanoPagina}
        opcionesTamano={TAMANOS_PAGINA}
        etiqueta="Paginación de secciones"
        nombreRegistros="secciones"
      />

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
                <dt className="text-xs font-semibold text-saie-muted">Aula asignada</dt>
                <dd className="m-0 text-saie-text">
                  {seleccionada.asignacion?.espacios.length
                    ? seleccionada.asignacion.espacios
                        .map((e) => `${e.identificador} (${e.pabellon}, piso ${e.piso})`)
                        .join(', ')
                    : 'Sin aula: esta sección espera revisión.'}
                </dd>
              </div>
              <div className="border-b border-saie-divider py-2">
                <dt className="text-xs font-semibold text-saie-muted">Docente</dt>
                <dd className="m-0 text-saie-text">
                  {seleccionada.docente ? (
                    `${seleccionada.docente.nombre} (${seleccionada.docente.codigoDocente})`
                  ) : (
                    <span className="text-saie-muted">Sin asignar</span>
                  )}
                </dd>
              </div>
              <div className="border-b border-saie-divider py-2">
                <dt className="text-xs font-semibold text-saie-muted">Horarios</dt>
                <dd className="m-0 text-saie-text">
                  {seleccionada.horarios.length === 0 ? (
                    'Sin horarios registrados.'
                  ) : (
                    // Un bloque por línea: con tres o más bloques una sola cadena no se lee (Issue 4.44).
                    <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                      {seleccionada.horarios.map((h) => (
                        <li
                          key={`${h.diaSemana}-${h.horaInicio}-${h.horaFin}`}
                          className="tabular-nums"
                        >
                          {formatearBloqueHorario(h, false)}
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>
              <div className="py-2">
                <dt className="text-xs font-semibold text-saie-muted">Software requerido</dt>
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
              // Docentes y catálogo se piden al abrir la edición (y salen de la caché si ya se vieron).
              docentes.datos && catalogo.datos ? (
                <FormularioSeccion
                  seccion={seleccionada}
                  docentes={docentes.datos}
                  catalogo={catalogo.datos.items}
                  onGuardado={manejarGuardado}
                  onCancelar={() => setEditando(false)}
                  onCambiosPendientes={setCambiosPendientes}
                />
              ) : docentes.error || catalogo.error ? (
                <AvisoError
                  mensaje={docentes.error ?? catalogo.error ?? ''}
                  onReintentar={() => {
                    if (docentes.error) docentes.recargar();
                    if (catalogo.error) catalogo.recargar();
                  }}
                />
              ) : (
                <EsqueletoCarga texto="Cargando docentes y catálogo de software…" />
              )
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

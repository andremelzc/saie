import React, { useCallback, useState } from 'react';
import LayoutAdmin, { AvisoError } from '../../components/admin/LayoutAdmin';
import { FormularioSoftware } from '../../components/admin/FormularioSoftware';
import { EsqueletoCarga, EstadoVacio } from '../../components/estudiante/ElementosHorario';
import { BadgeEstado } from '../../components/ui/BadgeEstado';
import { Boton } from '../../components/ui/Boton';
import { BotonEnlace } from '../../components/ui/BotonEnlace';
import { Campo } from '../../components/ui/Campo';
import { CLASE_CAMPO } from '../../components/ui/campos';
import { DialogoConfirmacion } from '../../components/ui/DialogoConfirmacion';
import { Drawer } from '../../components/ui/Drawer';
import { FiltrosActivos } from '../../components/ui/FiltrosActivos';
import type { FiltroActivo } from '../../components/ui/FiltrosActivos';
import { ICONOS } from '../../components/ui/iconos';
import { Paginador } from '../../components/ui/Paginador';
import { CabeceraTabla, TablaDatos } from '../../components/ui/TablaDatos';
import { ZonaActualizable } from '../../components/ui/ZonaActualizable';
import { RUTAS } from '../../config/rutas';
import { useAuth } from '../../context/useAuth';
import { useAccion } from '../../hooks/useAccion';
import { invalidarCacheCarga, useCarga } from '../../hooks/useCarga';
import { useValorDiferido } from '../../hooks/useValorDiferido';
import {
  CLAVE_CATALOGO,
  cambiarEstadoSoftwareCatalogo,
  listarCatalogo,
} from '../../services/catalogoSoftware';
import type { SoftwareCatalogoDTO } from '../../types/catalogoSoftware';
import type { CategoriaSoftware } from '../../types/solicitudesSoftware';
import { etiquetaLicencia, nombreSoftware, textoUso } from '../../utils/catalogoSoftware';
import { CATEGORIAS_SOFTWARE, etiquetaCategoria } from '../../utils/solicitudes';

type FiltroEstado = 'ACTIVOS' | 'BAJA' | 'TODOS';

const OPCIONES_ESTADO: { valor: FiltroEstado; etiqueta: string }[] = [
  { valor: 'ACTIVOS', etiqueta: 'Activos' },
  { valor: 'BAJA', etiqueta: 'Dados de baja' },
  { valor: 'TODOS', etiqueta: 'Todos' },
];

const InsigniaEstado: React.FC<{ activo: boolean }> = ({ activo }) => (
  <BadgeEstado tono={activo ? 'exito' : 'neutro'}>{activo ? 'Activo' : 'De baja'}</BadgeEstado>
);

/** Botones de una fila: solo Coordinación edita y da de baja (Spec 08 §4). */
const Acciones: React.FC<{
  s: SoftwareCatalogoDTO;
  onEditar: (s: SoftwareCatalogoDTO) => void;
  onEstado: (s: SoftwareCatalogoDTO) => void;
}> = ({ s, onEditar, onEstado }) => (
  <div className="flex flex-wrap gap-2">
    <Boton variante="secundario" tamano="sm" onClick={() => onEditar(s)}>
      Editar <span className="sr-only">{nombreSoftware(s)}</span>
    </Boton>
    <Boton variante="fantasma" tamano="sm" onClick={() => onEstado(s)}>
      {s.activo ? 'Dar de baja' : 'Reactivar'} <span className="sr-only">{nombreSoftware(s)}</span>
    </Boton>
  </div>
);

/**
 * Issue 4.30 — catálogo de software. Lista filtrable por nombre, categoría y estado, con
 * cuántos laboratorios y secciones usan cada software. Coordinación da de alta, edita y da de
 * baja (lógica, con aviso de su uso); Jefatura solo lo consulta. Los formularios de
 * laboratorios y secciones eligen el software de este catálogo: no se escribe a mano.
 */
export const SoftwareAdminPage: React.FC = () => {
  const { sesion } = useAuth();
  const puedeEditar = sesion?.rol === 'COORDINACION_ACADEMICA';
  const [texto, setTexto] = useState('');
  const [categoria, setCategoria] = useState<'TODAS' | CategoriaSoftware>('TODAS');
  const [estado, setEstado] = useState<FiltroEstado>('ACTIVOS');
  const [pagina, setPagina] = useState(1);
  const [tamano, setTamano] = useState(50);
  const textoDiferido = useValorDiferido(texto.trim());
  const [editando, setEditando] = useState<SoftwareCatalogoDTO | 'nuevo' | null>(null);
  const [hayCambios, setHayCambios] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState<SoftwareCatalogoDTO | null>(null);
  const accionEstado = useAccion();

  const cargar = useCallback(
    () =>
      listarCatalogo({
        q: textoDiferido || undefined,
        categoria: categoria === 'TODAS' ? undefined : categoria,
        activo: estado === 'TODOS' ? undefined : estado === 'ACTIVOS',
        page: pagina,
        limit: tamano,
      }),
    [textoDiferido, categoria, estado, pagina, tamano],
  );
  const { datos, cargando, error, recargar } = useCarga(cargar, {
    clave: `${CLAVE_CATALOGO}:${textoDiferido}|${categoria}|${estado}|${pagina}|${tamano}`,
  });
  const items = datos?.items ?? [];

  const refrescar = () => {
    invalidarCacheCarga(CLAVE_CATALOGO);
    recargar();
  };

  const filtrar =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      setPagina(1);
    };
  const limpiar = () => {
    setTexto('');
    setCategoria('TODAS');
    setEstado('ACTIVOS');
    setPagina(1);
  };
  const chips: FiltroActivo[] = [
    ...(texto.trim()
      ? [
          {
            id: 'q',
            etiqueta: 'Nombre',
            valor: texto.trim(),
            onQuitar: () => filtrar(setTexto)(''),
          },
        ]
      : []),
    ...(categoria !== 'TODAS'
      ? [
          {
            id: 'categoria',
            etiqueta: 'Categoría',
            valor: etiquetaCategoria(categoria),
            onQuitar: () => filtrar(setCategoria)('TODAS'),
          },
        ]
      : []),
    ...(estado !== 'ACTIVOS'
      ? [
          {
            id: 'estado',
            etiqueta: 'Estado',
            valor: OPCIONES_ESTADO.find((o) => o.valor === estado)!.etiqueta,
            onQuitar: () => filtrar(setEstado)('ACTIVOS'),
          },
        ]
      : []),
  ];

  const confirmarEstado = async () => {
    if (!cambiandoEstado) return;
    const s = cambiandoEstado;
    const resultado = await accionEstado.ejecutar(
      () => cambiarEstadoSoftwareCatalogo(s.id, !s.activo),
      {
        exito: s.activo
          ? `${nombreSoftware(s)} quedó dado de baja.`
          : `${nombreSoftware(s)} está activo otra vez.`,
      },
    );
    setCambiandoEstado(null);
    if (resultado?.ok) refrescar();
  };

  return (
    <LayoutAdmin
      titulo="Catálogo de software"
      subtitulo={
        puedeEditar
          ? 'El software que pueden tener los laboratorios y exigir las secciones.'
          : 'Consulta del software que pueden tener los laboratorios.'
      }
      acciones={
        <div className="flex flex-wrap gap-2">
          {puedeEditar && (
            <BotonEnlace to={RUTAS.solicitudesSoftwareAdmin} variante="secundario">
              Solicitudes de docentes
            </BotonEnlace>
          )}
          {puedeEditar && (
            <Boton variante="primario" onClick={() => setEditando('nuevo')}>
              Agregar software
            </Boton>
          )}
        </div>
      }
    >
      <section aria-label="Filtros del catálogo" className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Campo etiqueta="Buscar por nombre">
            <input
              type="search"
              placeholder="Ej. Python"
              value={texto}
              onChange={(e) => filtrar(setTexto)(e.target.value)}
              className={CLASE_CAMPO}
            />
          </Campo>
          <Campo etiqueta="Categoría">
            <select
              value={categoria}
              onChange={(e) => filtrar(setCategoria)(e.target.value as 'TODAS' | CategoriaSoftware)}
              className={CLASE_CAMPO}
            >
              <option value="TODAS">Todas</option>
              {CATEGORIAS_SOFTWARE.map((c) => (
                <option key={c.valor} value={c.valor}>
                  {c.etiqueta}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Estado">
            <select
              value={estado}
              onChange={(e) => filtrar(setEstado)(e.target.value as FiltroEstado)}
              className={CLASE_CAMPO}
            >
              {OPCIONES_ESTADO.map((o) => (
                <option key={o.valor} value={o.valor}>
                  {o.etiqueta}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        <FiltrosActivos filtros={chips} onLimpiar={limpiar} />
      </section>

      {error && <AvisoError mensaje={error} onReintentar={recargar} />}
      <ZonaActualizable actualizando={cargando && datos !== null}>
        {cargando && !datos ? (
          <EsqueletoCarga texto="Cargando el catálogo…" forma="tabla" />
        ) : items.length === 0 ? (
          <EstadoVacio
            titulo={chips.length > 0 ? 'Sin coincidencias' : 'El catálogo está vacío'}
            icono={ICONOS.monitor}
            descripcion={
              chips.length > 0
                ? 'Ningún software coincide con los filtros.'
                : 'Agrega el software que se instala en los laboratorios.'
            }
            accion={
              chips.length > 0 ? (
                <Boton variante="secundario" tamano="sm" onClick={limpiar}>
                  Limpiar filtros
                </Boton>
              ) : puedeEditar ? (
                <Boton variante="secundario" tamano="sm" onClick={() => setEditando('nuevo')}>
                  Agregar software
                </Boton>
              ) : undefined
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="hidden lg:block">
              <TablaDatos etiqueta="Software del catálogo">
                <CabeceraTabla
                  columnas={[
                    'Software',
                    'Categoría',
                    'Licencia',
                    'En uso',
                    'Estado',
                    ...(puedeEditar ? ['Acciones'] : []),
                  ]}
                />
                <tbody>
                  {items.map((s) => (
                    <tr key={s.id} className="border-t border-saie-divider align-top">
                      <td className="px-4 py-3">
                        <span className="block font-semibold">{nombreSoftware(s)}</span>
                        {s.fabricante && (
                          <span className="block text-sm text-saie-muted">{s.fabricante}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">{etiquetaCategoria(s.categoria)}</td>
                      <td className="px-4 py-3 text-sm">{etiquetaLicencia(s.tipoLicencia)}</td>
                      <td className="px-4 py-3 text-sm">{textoUso(s.uso)}</td>
                      <td className="px-4 py-3">
                        <InsigniaEstado activo={s.activo} />
                      </td>
                      {puedeEditar && (
                        <td className="px-4 py-3">
                          <Acciones s={s} onEditar={setEditando} onEstado={setCambiandoEstado} />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </TablaDatos>
            </div>
            <ul className="m-0 flex list-none flex-col gap-2 p-0 lg:hidden">
              {items.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col gap-2 rounded-xl border border-saie-divider bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="m-0 font-semibold">{nombreSoftware(s)}</p>
                      <p className="m-0 text-sm text-saie-muted">
                        {etiquetaCategoria(s.categoria)} · {etiquetaLicencia(s.tipoLicencia)}
                      </p>
                    </div>
                    <InsigniaEstado activo={s.activo} />
                  </div>
                  <p className="m-0 text-sm">En uso: {textoUso(s.uso)}</p>
                  {puedeEditar && (
                    <Acciones s={s} onEditar={setEditando} onEstado={setCambiandoEstado} />
                  )}
                </li>
              ))}
            </ul>
            <Paginador
              pagina={pagina}
              tamano={tamano}
              total={datos?.total ?? 0}
              onCambiarPagina={setPagina}
              onCambiarTamano={(t) => {
                setTamano(t);
                setPagina(1);
              }}
              opcionesTamano={[25, 50, 100]}
              nombreRegistros="programas"
            />
          </div>
        )}
      </ZonaActualizable>

      <Drawer
        abierto={editando !== null}
        onCerrar={() => {
          setEditando(null);
          setHayCambios(false);
        }}
        titulo={editando === 'nuevo' ? 'Agregar software' : 'Editar software'}
        subtitulo={editando && editando !== 'nuevo' ? nombreSoftware(editando) : undefined}
        hayCambios={hayCambios}
      >
        {editando !== null && (
          <FormularioSoftware
            software={editando === 'nuevo' ? null : editando}
            onCambiosPendientes={setHayCambios}
            onCancelar={() => {
              setEditando(null);
              setHayCambios(false);
            }}
            onGuardado={() => {
              setEditando(null);
              setHayCambios(false);
              refrescar();
            }}
          />
        )}
      </Drawer>

      <DialogoConfirmacion
        abierto={cambiandoEstado !== null}
        titulo={
          cambiandoEstado?.activo
            ? `¿Dar de baja ${cambiandoEstado ? nombreSoftware(cambiandoEstado) : ''}?`
            : `¿Reactivar ${cambiandoEstado ? nombreSoftware(cambiandoEstado) : ''}?`
        }
        descripcion={
          cambiandoEstado?.activo ? (
            <>
              Lo usan <strong>{textoUso(cambiandoEstado.uso).toLowerCase()}</strong>. Seguirá
              registrado donde ya está, pero no se podrá elegir en laboratorios ni secciones nuevos.
            </>
          ) : (
            'Se podrá volver a elegir en laboratorios y secciones.'
          )
        }
        textoConfirmar={cambiandoEstado?.activo ? 'Sí, dar de baja' : 'Sí, reactivar'}
        variante={cambiandoEstado?.activo ? 'peligro' : 'primario'}
        cargando={accionEstado.cargando}
        textoCargando="Guardando…"
        onConfirmar={confirmarEstado}
        onCancelar={() => setCambiandoEstado(null)}
      />
    </LayoutAdmin>
  );
};

export default SoftwareAdminPage;

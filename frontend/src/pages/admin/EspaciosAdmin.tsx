import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import LayoutAdmin, { AvisoError } from '../../components/admin/LayoutAdmin';
import FormularioEspacio from '../../components/admin/FormularioEspacio';
import { EsqueletoCarga, EstadoVacio } from '../../components/estudiante/ElementosHorario';
import { Aviso } from '../../components/ui/Aviso';
import { BadgeEstado } from '../../components/ui/BadgeEstado';
import { Boton } from '../../components/ui/Boton';
import { Drawer } from '../../components/ui/Drawer';
import { useAvisos } from '../../components/ui/useAvisos';
import { CLASE_CAMPO, CLASE_ETIQUETA } from '../../components/ui/campos';
import { RUTAS } from '../../config/rutas';
import { useAuth } from '../../context/useAuth';
import { useCarga } from '../../hooks/useCarga';
import { obtenerEspacios } from '../../services/admin';
import type { EspacioAdminDTO, ResultadoEdicionEspacioDTO, TipoEspacio } from '../../types/admin';

type Filtro = 'TODOS' | TipoEspacio;

const TIPO_ETIQUETA: Record<TipoEspacio, string> = {
  AULA_TEORICA: 'Aula teórica',
  LABORATORIO: 'Laboratorio',
};

const ETIQUETA_CAMPO: Record<string, string> = {
  identificador: 'el código',
  pabellon: 'el pabellón',
  piso: 'el piso',
  aforoNominal: 'la capacidad',
  contiguos: 'los espacios contiguos',
  habilitado: 'el estado',
  descripcionUso: 'el uso previsto',
  softwareIds: 'el software instalado',
  pcsMalogradas: 'las PCs fuera de servicio',
};
const Dato: React.FC<{ etiqueta: string; children: React.ReactNode }> = ({
  etiqueta,
  children,
}) => (
  <div className="flex flex-col gap-0.5 border-b border-saie-divider py-2 last:border-b-0">
    <dt className="text-xs font-semibold uppercase tracking-wide text-saie-muted">{etiqueta}</dt>
    <dd className="m-0 text-sm text-saie-text">{children}</dd>
  </div>
);

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
          <Dato etiqueta="Tipo">{TIPO_ETIQUETA[espacio.tipo]}</Dato>
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
          <Dato etiqueta="PCs malogradas">
            {espacio.tipo === 'AULA_TEORICA' ? (
              <span className="text-saie-muted">No aplica: es un aula teórica.</span>
            ) : espacio.pcsMalogradas == null ? (
              <BadgeEstado tono="neutro">Sin registrar</BadgeEstado>
            ) : (
              `${espacio.pcsMalogradas} PCs`
            )}
          </Dato>
          <Dato etiqueta="Estado">
            <BadgeEstado tono={espacio.habilitado ? 'exito' : 'peligro'}>
              {espacio.habilitado ? 'Habilitado' : 'Fuera de servicio'}
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
        {espacio.tipo === 'AULA_TEORICA' ? (
          <p className="m-0 text-sm text-saie-muted">No aplica: es un aula teórica.</p>
        ) : espacio.softwareInstalado && espacio.softwareInstalado.length > 0 ? (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {espacio.softwareInstalado.map((s) => (
              <li
                key={s.id}
                className="rounded-full bg-saie-canvas px-3 py-1 text-sm text-saie-text"
              >
                {s.nombre}
                {s.version ? ` ${s.version}` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-sm text-saie-muted">Sin software registrado.</p>
        )}
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
              Puedes editar: {campos.map((campo) => ETIQUETA_CAMPO[campo] ?? campo).join(', ')}.
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
  const [seleccionado, setSeleccionado] = useState<EspacioAdminDTO | null>(null);
  const [editando, setEditando] = useState(false);
  const [creando, setCreando] = useState(false);
  const [alertas, setAlertas] = useState<string[]>([]);

  // El alta es solo de Coordinación Académica (así lo define el endpoint del backend).
  const esCoordinacion = sesion?.rol === 'COORDINACION_ACADEMICA';

  const base = datos ?? [];
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
    setSeleccionado(espacio);
    setEditando(false);
    setCreando(false);
    setAlertas([]);
  }

  function cerrarDetalle() {
    setSeleccionado(null);
    setEditando(false);
    setCreando(false);
    setAlertas([]);
  }

  function abrirAlta() {
    setSeleccionado(null);
    setEditando(false);
    setCreando(true);
    setAlertas([]);
  }

  function manejarGuardado(resultado: ResultadoEdicionEspacioDTO) {
    const esNuevo = creando;
    setSeleccionado(resultado.espacio);
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
          <label className="flex flex-col gap-1">
            <span className={CLASE_ETIQUETA}>Buscar espacio</span>
            <input
              type="search"
              placeholder="Ej. AULA-101"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className={CLASE_CAMPO}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={CLASE_ETIQUETA}>Tipo de espacio</span>
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as Filtro)}
              className={CLASE_CAMPO}
            >
              <option value="TODOS">Todos</option>
              <option value="AULA_TEORICA">Aulas teóricas</option>
              <option value="LABORATORIO">Laboratorios</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={CLASE_ETIQUETA}>Pabellón</span>
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
          </label>
          <label className="flex flex-col gap-1">
            <span className={CLASE_ETIQUETA}>Piso</span>
            <select value={piso} onChange={(e) => setPiso(e.target.value)} className={CLASE_CAMPO}>
              <option value="TODOS">Todos</option>
              {pisos.map((p) => (
                <option key={p} value={String(p)}>
                  Piso {p}
                </option>
              ))}
            </select>
          </label>
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
              <span>Solo deshabilitados</span>
            </label>
            {hayFiltros && (
              <Boton variante="secundario" tamano="sm" onClick={limpiarFiltros}>
                Limpiar filtros
              </Boton>
            )}
          </div>
        </div>
      </section>

      {error && <AvisoError mensaje={error} onReintentar={recargar} />}

      {cargando && !datos ? (
        <EsqueletoCarga texto="Cargando espacios…" />
      ) : base.length === 0 ? (
        <EstadoVacio
          titulo="Sin espacios registrados"
          descripcion="Cuando se carguen los espacios, aparecerán aquí."
        />
      ) : espacios.length === 0 ? (
        <EstadoVacio
          titulo="Sin coincidencias"
          descripcion="No hay espacios que coincidan con los filtros."
          accion={
            <Boton variante="secundario" tamano="sm" onClick={limpiarFiltros}>
              Limpiar filtros
            </Boton>
          }
        />
      ) : (
        <div
          role="region"
          aria-label="Listado de espacios"
          tabIndex={0}
          className="overflow-x-auto rounded-xl border border-saie-divider bg-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-saie-text"
        >
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-saie-canvas text-xs uppercase tracking-wide text-saie-muted">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Espacio
                </th>
                <th scope="col" className="px-4 py-3">
                  Tipo
                </th>
                <th scope="col" className="px-4 py-3">
                  Ubicación
                </th>
                <th scope="col" className="px-4 py-3">
                  Capacidad
                </th>
                <th scope="col" className="px-4 py-3">
                  PCs malogradas
                </th>
                <th scope="col" className="px-4 py-3">
                  Estado
                </th>
                <th scope="col" className="px-4 py-3">
                  Detalle
                </th>
              </tr>
            </thead>
            <tbody>
              {espacios.map((e) => (
                <tr key={e.id} className="border-t border-saie-divider">
                  <td className="px-4 py-3 font-semibold">{e.identificador}</td>
                  <td className="px-4 py-3">{TIPO_ETIQUETA[e.tipo]}</td>
                  <td className="px-4 py-3">
                    {e.pabellon} · Piso {e.piso}
                  </td>
                  <td className="px-4 py-3">
                    {e.aforoNominal > 0 ? (
                      e.aforoNominal
                    ) : (
                      <span className="text-saie-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {e.tipo === 'AULA_TEORICA' ? (
                      <span className="text-saie-muted">No aplica</span>
                    ) : e.pcsMalogradas == null ? (
                      <BadgeEstado tono="neutro">Sin registrar</BadgeEstado>
                    ) : (
                      e.pcsMalogradas
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <BadgeEstado tono={e.habilitado ? 'exito' : 'peligro'}>
                      {e.habilitado ? 'Habilitado' : 'Fuera de servicio'}
                    </BadgeEstado>
                  </td>
                  <td className="px-4 py-3">
                    <Boton
                      variante="fantasma"
                      tamano="sm"
                      onClick={() => abrirDetalle(e)}
                      aria-label={`Ver detalle de ${e.identificador}`}
                    >
                      Ver
                    </Boton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        abierto={seleccionado !== null || creando}
        onCerrar={cerrarDetalle}
        titulo={creando ? 'Nuevo espacio' : (seleccionado?.identificador ?? 'Espacio')}
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
                  {alertas.map((motivo, i) => (
                    <li key={i}>{motivo}</li>
                  ))}
                </ul>
              </Aviso>
            )}
            {creando ? (
              <FormularioEspacio
                modo="crear"
                espacios={base}
                onGuardado={manejarGuardado}
                onCancelar={cerrarDetalle}
              />
            ) : editando && seleccionado ? (
              <FormularioEspacio
                modo="editar"
                espacio={seleccionado}
                espacios={base}
                onGuardado={manejarGuardado}
                onCancelar={() => setEditando(false)}
              />
            ) : seleccionado ? (
              <DetalleEspacio
                espacio={seleccionado}
                espacios={base}
                onEditar={() => {
                  setAlertas([]);
                  setEditando(true);
                }}
              />
            ) : null}
          </div>
        )}
      </Drawer>
    </LayoutAdmin>
  );
};

export default EspaciosAdmin;

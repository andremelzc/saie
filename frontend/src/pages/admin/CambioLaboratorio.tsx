import React, { useMemo, useState } from 'react';
import LayoutAdmin, { AvisoError } from '../../components/admin/LayoutAdmin';
import { EsqueletoCarga } from '../../components/estudiante/ElementosHorario';
import { SelectorSegmentado } from '../../components/estudiante/SelectorSegmentado';
import { idPanelPestana, idPestana } from '../../components/estudiante/idsPestanas';
import { Aviso } from '../../components/ui/Aviso';
import { BadgeEstado } from '../../components/ui/BadgeEstado';
import { Boton } from '../../components/ui/Boton';
import { CLASE_AYUDA, CLASE_CAMPO, CLASE_ETIQUETA } from '../../components/ui/campos';
import { DialogoConfirmacion } from '../../components/ui/DialogoConfirmacion';
import { useAdvertenciaSalida } from '../../hooks/useAdvertenciaSalida';
import { useCarga } from '../../hooks/useCarga';
import {
  obtenerCatalogoActivo,
  obtenerLaboratorios,
  registrarPcsMalogradas,
  registrarSoftware,
} from '../../services/admin';
import { mensajeDeError } from '../../services/estudiante';
import type { EspacioAdminDTO } from '../../types/admin';
import { formatearFechaCorta } from '../../utils/fechas';

/**
 * Issue 4.19 — cambio de laboratorio (Jefatura). Software y PCs se editan en dos pestañas,
 * pero se guardan juntos: un solo botón, un solo estado de «guardado» y un solo error.
 */

type Pestana = 'software' | 'pcs';
type Mensaje = { tipo: 'exito' | 'error'; texto: string } | null;

function mismoConjunto(a: Set<string>, b: string[]): boolean {
  const conjuntoB = new Set(b);
  if (a.size !== conjuntoB.size) return false;
  return [...a].every((id) => conjuntoB.has(id));
}

/**
 * Motivo por el que el botón de guardar no está disponible. Se calcula fuera del JSX para que
 * cada estado tenga su propio texto y no haya que leer un ternario anidado.
 */
function motivoDeGuardado({
  lab,
  pcsValido,
  hayCambios,
}: {
  lab: EspacioAdminDTO | null;
  pcsValido: boolean;
  hayCambios: boolean;
}): string | undefined {
  if (!lab) return 'Elige un laboratorio primero.';
  if (!pcsValido) return 'Corrige el número de PCs.';
  if (!hayCambios) return 'No hay cambios para guardar.';
  return undefined;
}

/** Texto de la capacidad y las PCs del laboratorio elegido. */
function resumenLaboratorio(lab: EspacioAdminDTO): string {
  if (lab.pcsMalogradas == null) return 'PCs malogradas sin registrar';
  return `${lab.pcsMalogradas} PCs malogradas registradas`;
}

/** Pista del catálogo vacío: sin catálogo o sin coincidencias con la búsqueda. */
function mensajeCatalogoVacio(totalCatalogo: number, busqueda: string): string {
  if (totalCatalogo === 0) {
    return 'No hay software activo en el catálogo. Coordinación debe registrarlo primero.';
  }
  return `No hay software que coincida con «${busqueda.trim()}».`;
}

/** Distintivo del pie: si hay cambios pendientes o el formulario está limpio. */
function insigniaCambios(lab: EspacioAdminDTO | null, hayCambios: boolean): React.ReactNode {
  if (!lab) return null;
  if (hayCambios) return <BadgeEstado tono="advertencia">Cambios sin guardar</BadgeEstado>;
  return <BadgeEstado tono="neutro">Sin cambios</BadgeEstado>;
}

/** Pestaña de software: búsqueda, catálogo y selección. */
const PanelSoftware: React.FC<{
  hayLaboratorio: boolean;
  busqueda: string;
  onBusqueda: (valor: string) => void;
  totalCatalogo: number;
  softwareFiltrado: { id: string; nombre: string; version: string }[];
  seleccionados: Set<string>;
  alternar: (id: string) => void;
  quitarTodos: () => void;
  errorCatalogo: string | null;
  onReintentarCatalogo: () => void;
  cargandoCatalogo: boolean;
}> = ({
  hayLaboratorio,
  busqueda,
  onBusqueda,
  totalCatalogo,
  softwareFiltrado,
  seleccionados,
  alternar,
  quitarTodos,
  errorCatalogo,
  onReintentarCatalogo,
  cargandoCatalogo,
}) => {
  const contenidoCatalogo = (() => {
    if (errorCatalogo) {
      return <AvisoError mensaje={errorCatalogo} onReintentar={onReintentarCatalogo} />;
    }
    if (cargandoCatalogo) {
      return <EsqueletoCarga texto="Cargando catálogo…" />;
    }
    if (softwareFiltrado.length === 0) {
      return (
        <p className="m-0 text-sm text-saie-muted">
          {mensajeCatalogoVacio(totalCatalogo, busqueda)}
        </p>
      );
    }
    return (
      <ul className="m-0 flex max-h-80 list-none flex-col gap-1 overflow-auto p-0">
        {softwareFiltrado.map((s) => (
          <li key={s.id}>
            <label
              className={`flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm ${
                hayLaboratorio ? 'cursor-pointer hover:bg-saie-canvas' : 'opacity-50'
              }`}
            >
              <input
                type="checkbox"
                className="h-5 w-5 accent-saie-primary"
                disabled={!hayLaboratorio}
                checked={seleccionados.has(s.id)}
                onChange={() => alternar(s.id)}
              />
              <span>
                {s.nombre}
                {s.version && <span className="text-saie-muted"> {s.version}</span>}
              </span>
            </label>
          </li>
        ))}
      </ul>
    );
  })();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <label htmlFor="buscar-software" className={`${CLASE_ETIQUETA} flex-1`}>
          Buscar software
        </label>
        <span className="text-sm text-saie-muted">
          <strong className="text-saie-text">{seleccionados.size}</strong> de {totalCatalogo}{' '}
          seleccionados
        </span>
      </div>
      <input
        id="buscar-software"
        type="search"
        value={busqueda}
        disabled={!hayLaboratorio}
        onChange={(e) => onBusqueda(e.target.value)}
        placeholder="Nombre o versión…"
        className={CLASE_CAMPO}
      />
      {contenidoCatalogo}
      {seleccionados.size > 0 && (
        <div>
          <Boton variante="fantasma" tamano="sm" disabled={!hayLaboratorio} onClick={quitarTodos}>
            Quitar todos
          </Boton>
        </div>
      )}
    </div>
  );
};

/** Pestaña de PCs: número de equipos fuera de servicio. */
const PanelPcs: React.FC<{
  hayLaboratorio: boolean;
  valor: string;
  onValor: (valor: string) => void;
  valorOriginal: string;
  valido: boolean;
}> = ({ hayLaboratorio, valor, onValor, valorOriginal, valido }) => (
  <div className="flex flex-col gap-3">
    <label htmlFor="pcs" className={CLASE_ETIQUETA}>
      Número total de PCs fuera de servicio
    </label>
    <input
      id="pcs"
      type="number"
      inputMode="numeric"
      min={0}
      step={1}
      value={valor}
      disabled={!hayLaboratorio}
      placeholder={valorOriginal === '' ? 'Sin registrar' : undefined}
      onChange={(e) => onValor(e.target.value)}
      className={CLASE_CAMPO}
    />
    <p className={CLASE_AYUDA}>
      Baja el número si se repararon. Si no hay PCs malogradas, escribe 0.
    </p>
    {!valido && (
      <p role="alert" className="m-0 text-sm font-medium text-saie-danger">
        Ingresa un número entero mayor o igual a 0. No dejes el campo vacío si ya había un valor
        registrado.
      </p>
    )}
    {hayLaboratorio && valorOriginal === '' && (
      <p className={CLASE_AYUDA}>
        Este laboratorio aún no tiene un valor registrado. Guarda un número para registrarlo.
      </p>
    )}
  </div>
);

export const CambioLaboratorio: React.FC = () => {
  const labs = useCarga(obtenerLaboratorios);
  const catalogo = useCarga(obtenerCatalogoActivo);
  const [labId, setLabId] = useState('');
  const [pestana, setPestana] = useState<Pestana>('software');
  const [seleccion, setSeleccion] = useState<Set<string> | null>(null);
  const [pcs, setPcs] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<Mensaje>(null);
  const [ultimaGuardado, setUltimaGuardado] = useState<string | null>(null);

  const lab = useMemo(() => labs.datos?.find((l) => l.id === labId) ?? null, [labs.datos, labId]);
  const softwareOriginal = useMemo(() => lab?.softwareInstalado?.map((s) => s.id) ?? [], [lab]);
  const seleccionActual = seleccion ?? new Set(softwareOriginal);
  const pcsOriginal = lab?.pcsMalogradas != null ? String(lab.pcsMalogradas) : '';
  const pcsNumero = Number(pcs);
  const pcsIngresado = pcs !== '';
  const pcsValido = pcsIngresado
    ? Number.isInteger(pcsNumero) && pcsNumero >= 0
    : pcsOriginal === '';
  const softwareCambiado = Boolean(lab) && !mismoConjunto(seleccionActual, softwareOriginal);
  const pcsCambiado =
    lab !== null &&
    pcsValido &&
    (lab.pcsMalogradas == null ? pcsIngresado : pcsNumero !== lab.pcsMalogradas);
  const hayCambios = softwareCambiado || pcsCambiado;
  // Cerrar la pestaña o cambiar de laboratorio con cambios sin guardar pide confirmación.
  useAdvertenciaSalida(hayCambios);
  const [labPendiente, setLabPendiente] = useState<string | null>(null);
  const puedeGuardar = Boolean(lab) && hayCambios && pcsValido && !guardando;

  const itemsCatalogo = catalogo.datos?.items ?? [];
  const termino = busqueda.trim().toLowerCase();
  const catalogoFiltrado = termino
    ? itemsCatalogo.filter((s) => `${s.nombre} ${s.version}`.toLowerCase().includes(termino))
    : itemsCatalogo;
  const opcionesPestana = [
    { valor: 'software' as const, etiqueta: `Software (${seleccionActual.size})` },
    {
      valor: 'pcs' as const,
      etiqueta: `PCs (${pcsOriginal === '' ? 'sin registrar' : pcsOriginal})`,
    },
  ];

  function elegirLab(id: string) {
    setLabId(id);
    setSeleccion(null);
    setBusqueda('');
    const elegido = labs.datos?.find((x) => x.id === id);
    setPcs(elegido?.pcsMalogradas != null ? String(elegido.pcsMalogradas) : '');
    setMensaje(null);
    setUltimaGuardado(null);
    setPestana('software');
  }

  function alternar(id: string) {
    if (!lab) return;
    const nueva = new Set(seleccionActual);
    if (nueva.has(id)) nueva.delete(id);
    else nueva.add(id);
    setSeleccion(nueva);
    setMensaje(null);
  }

  function cambiarPcs(valor: string) {
    setPcs(valor);
    setMensaje(null);
  }

  async function guardar() {
    if (!lab || !puedeGuardar || !pcsValido) return;
    setGuardando(true);
    setMensaje(null);
    let guardadoSoftware = false;
    let guardadoPcs = false;
    const partes: string[] = [];

    try {
      if (softwareCambiado) {
        await registrarSoftware(labId, [...seleccionActual]);
        guardadoSoftware = true;
        partes.push('software');
      }
      if (pcsCambiado) {
        await registrarPcsMalogradas(labId, pcsNumero);
        guardadoPcs = true;
        partes.push('PCs');
      }
      setMensaje({ tipo: 'exito', texto: `Cambios guardados: ${partes.join(' y ')}.` });
      setUltimaGuardado(new Date().toISOString());
      setSeleccion(null);
    } catch (err) {
      const base = mensajeDeError(err);
      setMensaje({
        tipo: 'error',
        texto:
          guardadoSoftware || guardadoPcs ? `${base} Los demás cambios sí se guardaron.` : base,
      });
    } finally {
      if (guardadoSoftware || guardadoPcs) labs.recargar();
      setGuardando(false);
    }
  }

  const motivoDeshabilitado = motivoDeGuardado({ lab, pcsValido, hayCambios });

  return (
    <LayoutAdmin
      titulo="Cambio de laboratorio"
      subtitulo="Reporta el software instalado y las PCs malogradas o reparadas."
    >
      {labs.error && <AvisoError mensaje={labs.error} onReintentar={labs.recargar} />}

      <section
        aria-labelledby="titulo-laboratorio"
        className="flex flex-col gap-3 rounded-xl border border-saie-divider bg-white p-5"
      >
        <h2 id="titulo-laboratorio" className="m-0 text-base font-bold text-saie-text">
          Laboratorio a actualizar
        </h2>
        <label htmlFor="laboratorio" className={CLASE_ETIQUETA}>
          Laboratorio
        </label>
        <select
          id="laboratorio"
          value={labId}
          onChange={(e) =>
            hayCambios ? setLabPendiente(e.target.value) : elegirLab(e.target.value)
          }
          disabled={!labs.datos}
          className={CLASE_CAMPO}
        >
          <option value="">{labs.cargando ? 'Cargando…' : 'Selecciona un laboratorio'}</option>
          {labs.datos?.map((l) => (
            <option key={l.id} value={l.id}>
              {l.identificador} — {l.pabellon}, piso {l.piso}
            </option>
          ))}
        </select>
        {lab ? (
          <p className={CLASE_AYUDA}>
            Capacidad {lab.aforoNominal} · {resumenLaboratorio(lab)}
          </p>
        ) : (
          <Aviso tono="info">
            Elige un laboratorio para editar su software y sus PCs. Los cambios se guardan juntos
            con un solo botón.
          </Aviso>
        )}
        {labs.datos && labs.datos.length === 0 && (
          <p className="m-0 text-xs font-medium text-saie-danger">
            No hay laboratorios registrados todavía.
          </p>
        )}
      </section>

      <div className="rounded-xl border border-saie-divider bg-white">
        <div className="border-b border-saie-divider p-5">
          <SelectorSegmentado<Pestana>
            opciones={opcionesPestana}
            valor={pestana}
            onCambiar={setPestana}
            etiquetaGrupo="Qué quieres editar"
            deshabilitado={!lab}
            idBase="laboratorio"
            className="w-full"
          />
        </div>

        <section
          role="tabpanel"
          id={idPanelPestana('laboratorio', pestana)}
          aria-labelledby={idPestana('laboratorio', pestana)}
          className="p-5"
        >
          {pestana === 'software' ? (
            <PanelSoftware
              hayLaboratorio={Boolean(lab)}
              busqueda={busqueda}
              onBusqueda={setBusqueda}
              totalCatalogo={itemsCatalogo.length}
              softwareFiltrado={catalogoFiltrado}
              seleccionados={seleccionActual}
              alternar={alternar}
              quitarTodos={() => {
                setSeleccion(new Set());
                setMensaje(null);
              }}
              errorCatalogo={catalogo.error}
              onReintentarCatalogo={catalogo.recargar}
              cargandoCatalogo={catalogo.cargando && !catalogo.datos}
            />
          ) : (
            <PanelPcs
              hayLaboratorio={Boolean(lab)}
              valor={pcs}
              onValor={cambiarPcs}
              valorOriginal={pcsOriginal}
              valido={pcsValido}
            />
          )}
        </section>

        <footer className="flex flex-col gap-3 border-t border-saie-divider p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            {mensaje ? (
              <Aviso tono={mensaje.tipo}>{mensaje.texto}</Aviso>
            ) : (
              insigniaCambios(lab, hayCambios)
            )}
            {ultimaGuardado && !hayCambios && (
              <p className={CLASE_AYUDA}>
                Última actualización: {formatearFechaCorta(ultimaGuardado)}
              </p>
            )}
          </div>
          <Boton
            onClick={guardar}
            disabled={!puedeGuardar}
            cargando={guardando}
            textoCargando="Guardando…"
            motivoDeshabilitado={motivoDeshabilitado}
            anchoCompleto
          >
            Guardar cambios
          </Boton>
        </footer>
      </div>
      <DialogoConfirmacion
        abierto={labPendiente !== null}

        titulo="¿Cambiar de laboratorio?"

        descripcion="Tienes cambios sin guardar en este laboratorio. Si cambias ahora, se perderán."

        textoConfirmar="Cambiar y descartar"

        textoCancelar="Seguir editando"

        variante="peligro"

        onConfirmar={() => {
          if (labPendiente !== null) elegirLab(labPendiente);

          setLabPendiente(null);
        }}

        onCancelar={() => setLabPendiente(null)}
      />
    </LayoutAdmin>
  );
};

export default CambioLaboratorio;

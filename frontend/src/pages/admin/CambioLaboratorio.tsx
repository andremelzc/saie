import React, { useMemo, useState } from 'react';
import LayoutAdmin, { AvisoError } from '../../components/admin/LayoutAdmin';
import { EsqueletoCarga } from '../../components/estudiante/ElementosHorario';
import { SelectorSegmentado } from '../../components/estudiante/SelectorSegmentado';
import { Aviso } from '../../components/ui/Aviso';
import { BadgeEstado } from '../../components/ui/BadgeEstado';
import { Boton } from '../../components/ui/Boton';
import { CLASE_AYUDA, CLASE_CAMPO, CLASE_ETIQUETA } from '../../components/ui/campos';
import { useCarga } from '../../hooks/useCarga';
import {
  obtenerCatalogoActivo,
  obtenerLaboratorios,
  registrarPcsMalogradas,
  registrarSoftware,
} from '../../services/admin';
import { mensajeDeError } from '../../services/estudiante';
import { formatearFechaCorta } from '../../utils/admin';

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

  const motivoDeshabilitado = !lab
    ? 'Elige un laboratorio primero.'
    : !pcsValido
      ? 'Corrige el número de PCs.'
      : !hayCambios
        ? 'No hay cambios para guardar.'
        : undefined;

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
          onChange={(e) => elegirLab(e.target.value)}
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
            Capacidad {lab.aforoNominal} ·{' '}
            {lab.pcsMalogradas == null
              ? 'PCs malogradas sin registrar'
              : `${lab.pcsMalogradas} PCs malogradas registradas`}
          </p>
        ) : (
          <Aviso tono="info">
            Elige un laboratorio para editar su software y sus PCs. Los cambios se guardan juntos
            con un solo botón.
          </Aviso>
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
            className="w-full"
          />
        </div>

        <div
          role="region"
          aria-label={pestana === 'software' ? 'Software instalado' : 'PCs malogradas'}
          className="p-5"
        >
          {pestana === 'software' ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <label htmlFor="buscar-software" className={`${CLASE_ETIQUETA} flex-1`}>
                  Buscar software
                </label>
                <span className="text-sm text-saie-muted">
                  <strong className="text-saie-text">{seleccionActual.size}</strong> de{' '}
                  {itemsCatalogo.length} seleccionados
                </span>
              </div>
              <input
                id="buscar-software"
                type="search"
                value={busqueda}
                disabled={!lab}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Nombre o versión…"
                className={CLASE_CAMPO}
              />
              {catalogo.error ? (
                <AvisoError mensaje={catalogo.error} onReintentar={catalogo.recargar} />
              ) : catalogo.cargando && !catalogo.datos ? (
                <EsqueletoCarga texto="Cargando catálogo…" />
              ) : catalogoFiltrado.length === 0 ? (
                <p className="m-0 text-sm text-saie-muted">
                  {itemsCatalogo.length === 0
                    ? 'El catálogo de software está vacío.'
                    : `No hay software que coincida con «${busqueda.trim()}».`}
                </p>
              ) : (
                <ul className="m-0 flex max-h-80 list-none flex-col gap-1 overflow-auto p-0">
                  {catalogoFiltrado.map((s) => (
                    <li key={s.id}>
                      <label
                        className={`flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm ${
                          lab ? 'cursor-pointer hover:bg-saie-canvas' : 'opacity-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="h-5 w-5 accent-saie-primary"
                          disabled={!lab}
                          checked={seleccionActual.has(s.id)}
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
              )}
              {seleccionActual.size > 0 && (
                <div>
                  <Boton
                    variante="fantasma"
                    tamano="sm"
                    disabled={!lab}
                    onClick={() => {
                      setSeleccion(new Set());
                      setMensaje(null);
                    }}
                  >
                    Quitar todos
                  </Boton>
                </div>
              )}
            </div>
          ) : (
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
                value={pcs}
                disabled={!lab}
                placeholder={pcsOriginal === '' ? 'Sin registrar' : undefined}
                onChange={(e) => cambiarPcs(e.target.value)}
                className={CLASE_CAMPO}
              />
              <p className={CLASE_AYUDA}>
                Baja el número si se repararon. Si no hay PCs malogradas, escribe 0.
              </p>
              {!pcsValido && (
                <p role="alert" className="m-0 text-sm font-medium text-saie-danger">
                  Ingresa un número entero mayor o igual a 0. No dejes el campo vacío si ya había un
                  valor registrado.
                </p>
              )}
              {lab && pcsOriginal === '' && (
                <p className={CLASE_AYUDA}>
                  Este laboratorio aún no tiene un valor registrado. Guarda un número para
                  registrarlo.
                </p>
              )}
            </div>
          )}
        </div>

        <footer className="flex flex-col gap-3 border-t border-saie-divider p-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-2">
            {mensaje ? (
              <Aviso tono={mensaje.tipo}>{mensaje.texto}</Aviso>
            ) : lab && hayCambios ? (
              <BadgeEstado tono="advertencia">Cambios sin guardar</BadgeEstado>
            ) : lab ? (
              <BadgeEstado tono="neutro">Sin cambios</BadgeEstado>
            ) : null}
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
    </LayoutAdmin>
  );
};

export default CambioLaboratorio;

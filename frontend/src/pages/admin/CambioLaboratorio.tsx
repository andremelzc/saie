import React, { useMemo, useState } from 'react';
import LayoutAdmin, { AvisoError } from '../../components/admin/LayoutAdmin';
import { EsqueletoCarga } from '../../components/estudiante/ElementosHorario';
import { useCarga } from '../../hooks/useCarga';
import {
  obtenerCatalogoActivo,
  obtenerLaboratorios,
  registrarPcsMalogradas,
  registrarSoftware,
} from '../../services/admin';
import { mensajeDeError } from '../../services/estudiante';

/**
 * Issue 4.19 — formulario de cambio de laboratorio (Jefatura). Dos envíos separados:
 * software instalado (Issue 4.1) y PCs malogradas/reparadas (Issue 4.2).
 * NOTA: el diseño de Figma (37:4874) aún tiene texto placeholder; los campos se tomaron de los
 * contratos del backend y deben confirmarse con diseño.
 */

type Mensaje = { tipo: 'ok' | 'error'; texto: string } | null;

const Aviso: React.FC<{ m: Mensaje }> = ({ m }) =>
  m ? (
    <p
      role={m.tipo === 'error' ? 'alert' : 'status'}
      className={`m-0 rounded-lg px-3 py-2 text-sm ${m.tipo === 'ok' ? 'bg-[#E8F3E9] text-saie-success' : 'bg-[#FBE9E9] text-saie-danger'}`}
    >
      {m.texto}
    </p>
  ) : null;

export const CambioLaboratorio: React.FC = () => {
  const labs = useCarga(obtenerLaboratorios);
  const catalogo = useCarga(obtenerCatalogoActivo);
  const [labId, setLabId] = useState('');
  const [seleccion, setSeleccion] = useState<Set<string> | null>(null);
  const [pcs, setPcs] = useState<string>('');
  const [enviandoSw, setEnviandoSw] = useState(false);
  const [enviandoPcs, setEnviandoPcs] = useState(false);
  const [msgSw, setMsgSw] = useState<Mensaje>(null);
  const [msgPcs, setMsgPcs] = useState<Mensaje>(null);

  const lab = useMemo(() => labs.datos?.find((l) => l.id === labId) ?? null, [labs.datos, labId]);
  const labValido = Boolean(lab);

  // La selección parte del software instalado del laboratorio elegido.
  const seleccionActual = seleccion ?? new Set(lab?.softwareInstalado?.map((s) => s.id) ?? []);

  function elegirLab(id: string) {
    setLabId(id);
    setSeleccion(null);
    const l = labs.datos?.find((x) => x.id === id);
    setPcs(l?.pcsMalogradas != null ? String(l.pcsMalogradas) : '0');
    setMsgSw(null);
    setMsgPcs(null);
  }

  function alternar(id: string) {
    const nueva = new Set(seleccionActual);
    if (nueva.has(id)) nueva.delete(id);
    else nueva.add(id);
    setSeleccion(nueva);
  }

  async function enviarSoftware(e: React.FormEvent) {
    e.preventDefault();
    if (!labValido) return;
    setEnviandoSw(true);
    setMsgSw(null);
    try {
      await registrarSoftware(labId, [...seleccionActual]);
      setMsgSw({ tipo: 'ok', texto: 'Software del laboratorio actualizado.' });
      labs.recargar();
    } catch (err) {
      setMsgSw({ tipo: 'error', texto: mensajeDeError(err) });
    } finally {
      setEnviandoSw(false);
    }
  }

  const pcsNumero = Number(pcs);
  const pcsValido = pcs !== '' && Number.isInteger(pcsNumero) && pcsNumero >= 0;

  async function enviarPcs(e: React.FormEvent) {
    e.preventDefault();
    if (!labValido || !pcsValido) return;
    setEnviandoPcs(true);
    setMsgPcs(null);
    try {
      await registrarPcsMalogradas(labId, pcsNumero);
      setMsgPcs({ tipo: 'ok', texto: 'Estado de PCs actualizado.' });
      labs.recargar();
    } catch (err) {
      setMsgPcs({ tipo: 'error', texto: mensajeDeError(err) });
    } finally {
      setEnviandoPcs(false);
    }
  }

  return (
    <LayoutAdmin
      titulo="Cambio de laboratorio"
      subtitulo="Reporta el software instalado y las PCs malogradas o reparadas."
    >
      {labs.error && <AvisoError mensaje={labs.error} onReintentar={labs.recargar} />}

      <div className="flex flex-col gap-1">
        <label htmlFor="laboratorio" className="text-sm font-semibold text-saie-text">
          Laboratorio
        </label>
        <select
          id="laboratorio"
          value={labId}
          onChange={(e) => elegirLab(e.target.value)}
          disabled={!labs.datos}
          className="rounded-lg border border-saie-divider bg-white px-3 py-2 text-sm"
        >
          <option value="">{labs.cargando ? 'Cargando…' : 'Selecciona un laboratorio'}</option>
          {labs.datos?.map((l) => (
            <option key={l.id} value={l.id}>
              {l.identificador} — {l.pabellon}, piso {l.piso}
            </option>
          ))}
        </select>
        {lab && (
          <p className="m-0 text-xs text-saie-muted">
            Aforo {lab.aforoNominal} · {lab.pcsMalogradas ?? 0} PCs malogradas registradas
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <form
          onSubmit={enviarSoftware}
          aria-label="Cambio de software"
          className="flex flex-col gap-3 rounded-xl border border-saie-divider bg-white p-5"
        >
          <h2 className="m-0 text-base font-bold">Software instalado</h2>
          {catalogo.error && (
            <AvisoError mensaje={catalogo.error} onReintentar={catalogo.recargar} />
          )}
          {catalogo.cargando && !catalogo.datos ? (
            <EsqueletoCarga texto="Cargando catálogo…" />
          ) : (
            <ul className="m-0 flex max-h-72 list-none flex-col gap-1 overflow-auto p-0">
              {catalogo.datos?.items.map((s) => (
                <li key={s.id}>
                  <label
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${labValido ? 'hover:bg-saie-canvas' : 'opacity-50'}`}
                  >
                    <input
                      type="checkbox"
                      disabled={!labValido}
                      checked={seleccionActual.has(s.id)}
                      onChange={() => alternar(s.id)}
                    />
                    {s.nombre} {s.version && <span className="text-saie-muted">{s.version}</span>}
                  </label>
                </li>
              ))}
            </ul>
          )}
          <Aviso m={msgSw} />
          <button
            type="submit"
            disabled={!labValido || enviandoSw}
            className="rounded-lg bg-saie-primary px-4 py-2 text-sm font-semibold text-white hover:bg-saie-primary-dark disabled:opacity-50"
          >
            {enviandoSw ? 'Guardando…' : 'Guardar software'}
          </button>
        </form>

        <form
          onSubmit={enviarPcs}
          aria-label="Cambio de PCs"
          className="flex flex-col gap-3 rounded-xl border border-saie-divider bg-white p-5"
        >
          <h2 className="m-0 text-base font-bold">PCs malogradas</h2>
          <label htmlFor="pcs" className="text-sm text-saie-muted">
            Número total de PCs fuera de servicio (baja si se repararon).
          </label>
          <input
            id="pcs"
            type="number"
            min={0}
            step={1}
            value={pcs}
            disabled={!labValido}
            onChange={(e) => setPcs(e.target.value)}
            className="rounded-lg border border-saie-divider px-3 py-2 text-sm"
          />
          {labValido && !pcsValido && (
            <p className="m-0 text-xs text-saie-danger">
              Ingresa un número entero mayor o igual a 0.
            </p>
          )}
          <Aviso m={msgPcs} />
          <button
            type="submit"
            disabled={!labValido || !pcsValido || enviandoPcs}
            className="rounded-lg bg-saie-primary px-4 py-2 text-sm font-semibold text-white hover:bg-saie-primary-dark disabled:opacity-50"
          >
            {enviandoPcs ? 'Guardando…' : 'Guardar PCs'}
          </button>
        </form>
      </div>
    </LayoutAdmin>
  );
};

export default CambioLaboratorio;

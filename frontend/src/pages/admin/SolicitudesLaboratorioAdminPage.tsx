import React, { useState } from 'react';
import {
  obtenerSolicitudesLaboratorio,
  resolverSolicitudLaboratorio,
} from '../../services/fusionLaboratorio';
import { invalidarCacheCarga, useCarga } from '../../hooks/useCarga';
import { useAccion } from '../../hooks/useAccion';
import LayoutAdmin, { AvisoError } from '../../components/admin/LayoutAdmin';
import DialogoRechazoSolicitud from '../../components/admin/DialogoRechazoSolicitud';
import { BadgeEstado } from '../../components/ui/BadgeEstado';
import { Boton } from '../../components/ui/Boton';
import { DialogoConfirmacion } from '../../components/ui/DialogoConfirmacion';
import { EsqueletoCarga, EstadoVacio } from '../../components/ui/EstadosCarga';
import { ICONOS } from '../../components/ui/iconos';
import { SelectorSegmentado } from '../../components/ui/SelectorSegmentado';
import type { OpcionSegmentada } from '../../components/ui/SelectorSegmentado';
import { ZonaActualizable } from '../../components/ui/ZonaActualizable';
import type { DecisionLaboratorio, SolicitudLaboratorioDTO } from '../../types/fusionLaboratorio';
import { formatearFechaCorta } from '../../utils/fechas';
import { textoFranjas, tituloSolicitudLaboratorio } from '../../utils/fusionLaboratorio';
import { ESTADO_SOLICITUD } from '../../utils/solicitudes';

type Vista = 'pendientes' | 'resueltas';

const CLAVE = 'solicitudes-laboratorio';

/** Cómo quedó una solicitud resuelta: el horario y resultado, o el motivo del rechazo. */
function resumenResuelta(s: SolicitudLaboratorioDTO): string {
  if (s.estado !== 'APROBADA') return `Motivo del rechazo: ${s.motivoRechazo ?? '—'}`;
  const franjas = textoFranjas(s.seccionLaboratorio.horarios);
  const resultado = s.resultado ? ` Resultado: ${s.resultado}.` : '';
  return `Sección ${s.seccionLaboratorio.codigoSeccion}: ${franjas}.${resultado}`;
}

const TarjetaSolicitud: React.FC<{
  solicitud: SolicitudLaboratorioDTO;
  onAprobar?: (s: SolicitudLaboratorioDTO) => void;
  onRechazar?: (s: SolicitudLaboratorioDTO) => void;
}> = ({ solicitud: s, onAprobar, onRechazar }) => {
  const estado = ESTADO_SOLICITUD[s.estado];
  const pendiente = s.estado === 'PENDIENTE';
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-saie-divider bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="m-0 text-base font-bold text-saie-text">
            {tituloSolicitudLaboratorio(s)}
            <span className="font-normal text-saie-muted"> · {s.curso.nombre}</span>
          </h3>
          <p className="m-0 text-sm text-saie-muted">
            {s.docente.nombre} ({s.docente.codigoDocente}) · periodo {s.periodo} ·{' '}
            {pendiente
              ? `la envió el ${formatearFechaCorta(s.fechaSolicitud)}`
              : `resuelta el ${formatearFechaCorta(s.fechaResolucion ?? s.fechaSolicitud)}`}
          </p>
        </div>
        <BadgeEstado tono={estado.tono}>{estado.etiqueta}</BadgeEstado>
      </div>

      <p className="m-0 text-sm text-saie-text">{s.justificacion}</p>

      {pendiente ? (
        <dl className="m-0 grid grid-cols-1 gap-2 rounded-lg bg-saie-canvas p-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold text-saie-muted">
              Teoría (sección {s.seccionTeoria.codigoSeccion}) — se retira
            </dt>
            <dd className="m-0">{textoFranjas(s.seccionTeoria.horarios)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-saie-muted">
              Laboratorio (sección {s.seccionLaboratorio.codigoSeccion}) — recibe todo
            </dt>
            <dd className="m-0">
              {textoFranjas([...s.seccionLaboratorio.horarios, ...s.seccionTeoria.horarios])}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="m-0 text-sm text-saie-text">{resumenResuelta(s)}</p>
      )}

      {pendiente && onAprobar && onRechazar && (
        <footer className="flex flex-wrap justify-end gap-2 border-t border-saie-divider pt-3">
          <Boton variante="cancelar" tamano="sm" onClick={() => onRechazar(s)}>
            Rechazar
          </Boton>
          <Boton tamano="sm" onClick={() => onAprobar(s)}>
            Aprobar
          </Boton>
        </footer>
      )}
    </li>
  );
};

/**
 * «Dictar todo en laboratorio» (Issue 7.17, riesgo R22). Los docentes piden juntar su sección de
 * teoría con su laboratorio cuando dictan todas las horas en laboratorio. Al aprobarlo, las franjas
 * de la teoría pasan al laboratorio, la teoría se retira y libera su aula, y el laboratorio se
 * reasigna con un mismo espacio en todas sus franjas. Se avisa a los alumnos por Telegram.
 */
export const SolicitudesLaboratorioAdminPage: React.FC = () => {
  const { datos, cargando, error, recargar } = useCarga(obtenerSolicitudesLaboratorio, {
    clave: CLAVE,
  });
  const accion = useAccion();
  const [vista, setVista] = useState<Vista>('pendientes');
  // La solicitud sobre la que se está confirmando la aprobación o escribiendo el rechazo.
  const [aprobando, setAprobando] = useState<SolicitudLaboratorioDTO | null>(null);
  const [rechazando, setRechazando] = useState<SolicitudLaboratorioDTO | null>(null);

  const pendientes = datos?.pendientes ?? [];
  const resueltas = datos?.resueltas ?? [];
  const lista = vista === 'pendientes' ? pendientes : resueltas;
  const opcionesVista: OpcionSegmentada<Vista>[] = [
    { valor: 'pendientes', etiqueta: `Pendientes (${pendientes.length})` },
    { valor: 'resueltas', etiqueta: `Resueltas (${resueltas.length})` },
  ];

  /** Aprueba o rechaza la solicitud abierta; al terminar cierra el diálogo y recarga la lista. */
  async function resolver(decision: DecisionLaboratorio) {
    const s = decision.decision === 'APROBAR' ? aprobando : rechazando;
    if (!s) return;
    const r = await accion.ejecutar(() => resolverSolicitudLaboratorio(s.id, decision), {
      exito: (dto) =>
        decision.decision === 'APROBAR'
          ? `Aprobada. ${dto.resultado ?? 'La sección se reasignó'}.`
          : `Solicitud de ${tituloSolicitudLaboratorio(s)} rechazada.`,
    });
    if (!r?.ok) return;
    setAprobando(null);
    setRechazando(null);
    invalidarCacheCarga(CLAVE);
    recargar();
  }

  const renderLista = (): React.ReactNode => {
    if (cargando && !datos) return <EsqueletoCarga texto="Cargando solicitudes…" />;
    if (!datos) return null;
    if (lista.length === 0) {
      return (
        <EstadoVacio
          titulo={
            vista === 'pendientes'
              ? 'No hay solicitudes pendientes'
              : 'Aún no hay solicitudes resueltas'
          }
          icono={ICONOS.monitor}
          descripcion={
            vista === 'pendientes'
              ? 'Cuando un docente pida dictar todo en laboratorio, aparecerá aquí.'
              : 'Las solicitudes que apruebes o rechaces aparecerán aquí.'
          }
        />
      );
    }
    return (
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {lista.map((s) => (
          <TarjetaSolicitud
            key={s.id}
            solicitud={s}
            onAprobar={setAprobando}
            onRechazar={setRechazando}
          />
        ))}
      </ul>
    );
  };

  return (
    <LayoutAdmin
      titulo="Dictar en laboratorio"
      subtitulo="Docentes que piden dictar todas las horas de un curso en laboratorio"
      acciones={
        <Boton
          onClick={recargar}
          variante="secundario"
          cargando={cargando}
          textoCargando="Actualizando…"
        >
          Actualizar datos
        </Boton>
      }
    >
      <SelectorSegmentado
        etiquetaGrupo="Estado de las solicitudes"
        className="self-start"
        opciones={opcionesVista}
        valor={vista}
        onCambiar={setVista}
      />

      {error && <AvisoError mensaje={error} onReintentar={recargar} />}
      <ZonaActualizable actualizando={cargando && datos !== null}>{renderLista()}</ZonaActualizable>

      <DialogoConfirmacion
        abierto={aprobando !== null}
        titulo={`¿Aprobar dictar todo en laboratorio para ${aprobando ? tituloSolicitudLaboratorio(aprobando) : ''}?`}
        descripcion="Las franjas de la teoría pasarán a su laboratorio, la teoría se retirará y liberará su aula, y el laboratorio se reasignará ahora con un mismo espacio en todas sus franjas. Se avisará a los alumnos."
        textoConfirmar="Sí, aprobar y reasignar"
        cargando={accion.cargando}
        textoCargando="Juntando y reasignando…"
        onConfirmar={() => resolver({ decision: 'APROBAR' })}
        onCancelar={() => setAprobando(null)}
      />

      {rechazando && (
        <DialogoRechazoSolicitud
          titulo={`¿Rechazar la solicitud de ${tituloSolicitudLaboratorio(rechazando)}?`}
          idBase="laboratorio"
          destinatario="el docente"
          textoConfirmar="Rechazar la solicitud"
          cargando={accion.cargando}
          onConfirmar={(motivo) => resolver({ decision: 'RECHAZAR', motivo })}
          onCancelar={() => setRechazando(null)}
        />
      )}
    </LayoutAdmin>
  );
};

export default SolicitudesLaboratorioAdminPage;

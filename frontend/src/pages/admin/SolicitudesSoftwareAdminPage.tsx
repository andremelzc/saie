import React, { useCallback, useState } from 'react';
import LayoutAdmin, { AvisoError } from '../../components/admin/LayoutAdmin';
import { EsqueletoCarga, EstadoVacio } from '../../components/estudiante/ElementosHorario';
import { SelectorSegmentado } from '../../components/estudiante/SelectorSegmentado';
import { BadgeEstado } from '../../components/ui/BadgeEstado';
import { Boton } from '../../components/ui/Boton';
import { CLASE_CAMPO, CLASE_ETIQUETA } from '../../components/ui/campos';
import { DialogoConfirmacion } from '../../components/ui/DialogoConfirmacion';
import { ICONOS } from '../../components/ui/iconos';
import { ZonaActualizable } from '../../components/ui/ZonaActualizable';
import { useAccion } from '../../hooks/useAccion';
import { invalidarCacheCarga, useCarga } from '../../hooks/useCarga';
import {
  aprobarSolicitud,
  obtenerSolicitudes,
  rechazarSolicitud,
} from '../../services/solicitudesSoftware';
import type { EstadoSolicitud, SolicitudSoftwareDTO } from '../../types/solicitudesSoftware';
import { formatearFechaCorta } from '../../utils/fechas';
import { ESTADO_SOLICITUD, etiquetaCategoria, nombreConVersion } from '../../utils/solicitudes';

type Filtro = EstadoSolicitud | 'TODAS';

const OPCIONES_FILTRO: { valor: Filtro; etiqueta: string }[] = [
  { valor: 'PENDIENTE', etiqueta: 'Pendientes' },
  { valor: 'APROBADA', etiqueta: 'Aprobadas' },
  { valor: 'RECHAZADA', etiqueta: 'Rechazadas' },
  { valor: 'TODAS', etiqueta: 'Todas' },
];

const MAX_MOTIVO = 500;

/** Una solicitud: qué se pide, quién y por qué, y cómo se resolvió. */
const TarjetaSolicitud: React.FC<{
  solicitud: SolicitudSoftwareDTO;
  onAprobar: (s: SolicitudSoftwareDTO) => void;
  onRechazar: (s: SolicitudSoftwareDTO) => void;
}> = ({ solicitud: s, onAprobar, onRechazar }) => {
  const estado = ESTADO_SOLICITUD[s.estado];
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-saie-divider bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="m-0 text-base font-bold text-saie-text">{nombreConVersion(s)}</h3>
          <p className="m-0 text-xs text-saie-muted">
            {etiquetaCategoria(s.categoria)} · pedido el {formatearFechaCorta(s.fechaSolicitud)}
          </p>
        </div>
        <BadgeEstado tono={estado.tono}>{estado.etiqueta}</BadgeEstado>
      </div>

      <dl className="m-0 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-saie-muted">Docente</dt>
          <dd className="m-0">
            {s.docente.nombre}{' '}
            <span className="text-xs text-saie-muted">({s.docente.codigoDocente})</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-saie-muted">Sección</dt>
          <dd className="m-0">
            {s.seccion
              ? `${s.seccion.codigoCurso} · ${s.seccion.codigoSeccion} — ${s.seccion.nombreCurso}`
              : 'No indica una sección'}
          </dd>
        </div>
      </dl>

      <p className="m-0 text-sm text-saie-text">
        <span className="block text-xs text-saie-muted">Justificación</span>
        {s.justificacion}
      </p>

      {s.estado === 'RECHAZADA' && s.motivoRechazo && (
        <p className="m-0 rounded-lg bg-saie-danger-soft px-3 py-2 text-sm text-saie-danger-strong">
          <span className="block text-xs font-semibold">Motivo del rechazo</span>
          {s.motivoRechazo}
        </p>
      )}
      {s.estado === 'APROBADA' && (
        <p className="m-0 text-sm text-saie-muted">
          Ya está en el catálogo. Instalarlo en un laboratorio es un paso aparte.
        </p>
      )}

      {s.estado === 'PENDIENTE' && (
        <div className="flex flex-wrap gap-2">
          <Boton tamano="sm" onClick={() => onAprobar(s)}>
            Aprobar
          </Boton>
          <Boton variante="cancelar" tamano="sm" onClick={() => onRechazar(s)}>
            Rechazar
          </Boton>
        </div>
      )}
    </li>
  );
};

/**
 * Solicitudes de software de los docentes (Issue 4.29). Coordinación aprueba —se crea la fila en el
 * catálogo, sin instalarla en ningún laboratorio— o rechaza con un motivo obligatorio.
 */
export const SolicitudesSoftwareAdminPage: React.FC = () => {
  const [filtro, setFiltro] = useState<Filtro>('PENDIENTE');
  const [aprobando, setAprobando] = useState<SolicitudSoftwareDTO | null>(null);
  const [agregarASeccion, setAgregarASeccion] = useState(false);
  const [rechazando, setRechazando] = useState<SolicitudSoftwareDTO | null>(null);
  const [motivo, setMotivo] = useState('');
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null);
  const accion = useAccion();

  const cargar = useCallback(
    () => obtenerSolicitudes(filtro === 'TODAS' ? undefined : filtro),
    [filtro],
  );
  const { datos, cargando, error, recargar } = useCarga(cargar, { clave: `solicitudes:${filtro}` });
  const solicitudes = datos?.items ?? [];

  function abrirAprobacion(s: SolicitudSoftwareDTO) {
    setAprobando(s);
    setAgregarASeccion(false);
  }

  function abrirRechazo(s: SolicitudSoftwareDTO) {
    setRechazando(s);
    setMotivo('');
    setErrorMotivo(null);
  }

  async function confirmarAprobacion() {
    if (!aprobando) return;
    const resultado = await accion.ejecutar(
      () => aprobarSolicitud(aprobando.id, { agregarASeccion }),
      {
        exito: (r) =>
          r.agregadaASeccion
            ? `«${nombreConVersion(aprobando)}» está en el catálogo y quedó como requerimiento de la sección.`
            : `«${nombreConVersion(aprobando)}» está en el catálogo. Falta instalarlo en un laboratorio.`,
      },
    );
    if (resultado?.ok) {
      setAprobando(null);
      invalidarCacheCarga('solicitudes');
      recargar();
    }
  }

  async function confirmarRechazo() {
    if (!rechazando) return;
    const texto = motivo.trim();
    if (!texto) {
      setErrorMotivo('Escribe el motivo del rechazo: el docente lo verá.');
      return;
    }
    const resultado = await accion.ejecutar(() => rechazarSolicitud(rechazando.id, texto), {
      exito: `Solicitud de «${nombreConVersion(rechazando)}» rechazada.`,
    });
    if (resultado?.ok) {
      setRechazando(null);
      invalidarCacheCarga('solicitudes');
      recargar();
    }
  }

  return (
    <LayoutAdmin
      titulo="Solicitudes de software"
      subtitulo="Qué software piden los docentes y qué se resolvió"
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
      <SelectorSegmentado
        opciones={OPCIONES_FILTRO}
        valor={filtro}
        onCambiar={setFiltro}
        etiquetaGrupo="Estado de las solicitudes"
        className="self-start"
      />

      {error && <AvisoError mensaje={error} onReintentar={recargar} />}
      <ZonaActualizable actualizando={cargando && datos !== null}>
        {cargando && !datos ? (
          <EsqueletoCarga texto="Cargando solicitudes…" />
        ) : solicitudes.length === 0 ? (
          <EstadoVacio
            titulo={filtro === 'PENDIENTE' ? 'No hay solicitudes pendientes' : 'Sin solicitudes'}
            icono={ICONOS.portapapeles}
            descripcion={
              filtro === 'PENDIENTE'
                ? 'Cuando un docente pida un software que no está en el catálogo, aparecerá aquí.'
                : 'No hay solicitudes con este estado.'
            }
          />
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {solicitudes.map((s) => (
              <TarjetaSolicitud
                key={s.id}
                solicitud={s}
                onAprobar={abrirAprobacion}
                onRechazar={abrirRechazo}
              />
            ))}
          </ul>
        )}
      </ZonaActualizable>

      <DialogoConfirmacion
        abierto={aprobando !== null}
        titulo={`¿Aprobar «${aprobando ? nombreConVersion(aprobando) : ''}»?`}
        descripcion={
          <span className="flex flex-col gap-3">
            <span>
              Se agrega al catálogo de software. Aprobarlo no lo instala en ningún laboratorio: eso
              lo hace Jefatura aparte.
            </span>
            {aprobando?.seccion && (
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={agregarASeccion}
                  onChange={(e) => setAgregarASeccion(e.target.checked)}
                  className="mt-0.5 h-5 w-5 accent-saie-primary"
                />
                <span>
                  Añadirlo también a los requerimientos de la sección{' '}
                  <strong>
                    {aprobando.seccion.codigoCurso} · {aprobando.seccion.codigoSeccion}
                  </strong>
                </span>
              </label>
            )}
          </span>
        }
        textoConfirmar="Sí, aprobar"
        cargando={accion.cargando}
        textoCargando="Aprobando…"
        onConfirmar={confirmarAprobacion}
        onCancelar={() => setAprobando(null)}
      />

      <DialogoConfirmacion
        abierto={rechazando !== null}
        titulo={`¿Rechazar «${rechazando ? nombreConVersion(rechazando) : ''}»?`}
        variante="peligro"
        descripcion={
          <span className="flex flex-col gap-2">
            <label htmlFor="motivo-rechazo" className={CLASE_ETIQUETA}>
              Motivo del rechazo (obligatorio)
            </label>
            <textarea
              id="motivo-rechazo"
              value={motivo}
              maxLength={MAX_MOTIVO}
              rows={3}
              onChange={(e) => {
                setMotivo(e.target.value);
                setErrorMotivo(null);
              }}
              aria-invalid={errorMotivo ? true : undefined}
              aria-describedby={errorMotivo ? 'error-motivo' : undefined}
              className={`${CLASE_CAMPO} py-2`}
            />
            {errorMotivo && (
              <span id="error-motivo" role="alert" className="text-sm text-saie-danger-strong">
                {errorMotivo}
              </span>
            )}
          </span>
        }
        textoConfirmar="Rechazar"
        cargando={accion.cargando}
        textoCargando="Rechazando…"
        onConfirmar={confirmarRechazo}
        onCancelar={() => setRechazando(null)}
      />
    </LayoutAdmin>
  );
};

export default SolicitudesSoftwareAdminPage;

import React, { useCallback, useState } from 'react';
import LayoutAdmin, { AvisoError } from '../../components/admin/LayoutAdmin';
import { EsqueletoCarga, EstadoVacio } from '../../components/estudiante/ElementosHorario';
import { Aviso } from '../../components/ui/Aviso';
import { BadgeEstado } from '../../components/ui/BadgeEstado';
import { Boton } from '../../components/ui/Boton';
import { Campo } from '../../components/ui/Campo';
import { CLASE_CAMPO } from '../../components/ui/campos';
import { CLASE_PIE_DRAWER, Drawer } from '../../components/ui/Drawer';
import { ICONOS } from '../../components/ui/iconos';
import { ZonaActualizable } from '../../components/ui/ZonaActualizable';
import { useAccion } from '../../hooks/useAccion';
import { invalidarCacheCarga, useCarga } from '../../hooks/useCarga';
import { useDetalleEnUrl } from '../../hooks/useDetalleEnUrl';
import { cerrarIncidencia, obtenerEspacio, obtenerIncidencias } from '../../services/admin';
import type {
  EstadoIncidencia,
  IncidenciaAdminDTO,
  PrioridadIncidencia,
} from '../../types/docente';
import {
  describirEstadoIncidencia,
  describirPrioridadIncidencia,
  etiquetaTipoIncidencia,
} from '../../utils/diccionarios';
import { ubicacionEspacio } from '../../utils/docente';
import { formatearFechaAlerta } from '../../utils/fechas';
import { plural } from '../../utils/texto';

const MIN_COMENTARIO = 3;
const MAX_COMENTARIO = 1000;
const CLAVE_INCIDENCIAS = 'incidencias';

const ESTADOS: { valor: EstadoIncidencia; etiqueta: string }[] = [
  { valor: 'PENDIENTE', etiqueta: 'Pendientes' },
  { valor: 'RESUELTA', etiqueta: 'Resueltas' },
  { valor: 'DESCARTADA', etiqueta: 'Descartadas' },
];

const TITULO_DT = 'text-xs font-semibold text-saie-muted';

/** Solo se enlaza la evidencia si es una URL web; si no, se muestra como texto. */
function esEnlace(texto: string): boolean {
  return /^https?:\/\/\S+$/i.test(texto.trim());
}

/** Tarjeta de una incidencia en la bandeja. */
const TarjetaIncidencia: React.FC<{ inc: IncidenciaAdminDTO; onRevisar: () => void }> = ({
  inc,
  onRevisar,
}) => {
  const prioridad = describirPrioridadIncidencia(inc.prioridad);
  const estado = describirEstadoIncidencia(inc.estado);
  return (
    <article
      aria-label={`Incidencia ${inc.identificadorSeguimiento}`}
      className="flex flex-col gap-3 rounded-xl border border-saie-divider bg-white p-4"
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="m-0 text-base font-bold">
            {etiquetaTipoIncidencia(inc.tipo)} · {inc.espacio.identificador}
          </h3>
          <p className="m-0 text-sm text-saie-muted">
            <span className="font-mono">{inc.identificadorSeguimiento}</span> · reportada el{' '}
            {formatearFechaAlerta(inc.fechaReporte)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BadgeEstado tono={prioridad.tono}>{prioridad.etiqueta}</BadgeEstado>
          {inc.estado !== 'PENDIENTE' && (
            <BadgeEstado tono={estado.tono}>{estado.etiqueta}</BadgeEstado>
          )}
        </div>
      </header>
      <p className="m-0 line-clamp-2 text-sm">{inc.descripcion}</p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-sm text-saie-muted">
          {inc.docente.nombre} · {inc.asignacion.codigoCurso} Sección {inc.asignacion.codigoSeccion}
        </p>
        <Boton
          variante="secundario"
          tamano="sm"
          onClick={onRevisar}
          aria-label={`Revisar incidencia ${inc.identificadorSeguimiento}`}
        >
          {inc.estado === 'PENDIENTE' ? 'Revisar' : 'Ver detalle'}
        </Boton>
      </div>
    </article>
  );
};

/** Detalle técnico del laboratorio de la incidencia: aforo real, PCs inoperativas y software. */
const DetalleTecnico: React.FC<{ espacioId: string }> = ({ espacioId }) => {
  const cargar = useCallback(() => obtenerEspacio(espacioId), [espacioId]);
  const { datos, cargando, error, recargar } = useCarga(cargar, {
    clave: `incidencias:espacio:${espacioId}`,
  });

  if (cargando && !datos) return <EsqueletoCarga texto="Cargando el laboratorio…" forma="texto" />;
  if (error) return <AvisoError mensaje={error} onReintentar={recargar} />;
  if (!datos) return null;

  const esLab = datos.tipo === 'LABORATORIO';
  const inoperativas = datos.pcsMalogradas ?? 0;
  const aforoReal = esLab ? Math.max(0, datos.aforoNominal - inoperativas) : datos.aforoNominal;
  const software = datos.softwareInstalado ?? [];

  return (
    <section
      aria-labelledby="titulo-detalle-tecnico"
      className="flex flex-col gap-3 rounded-xl border border-saie-divider bg-white p-4"
    >
      <h3 id="titulo-detalle-tecnico" className="m-0 text-base font-bold">
        Detalle técnico del espacio
      </h3>
      <dl className="m-0 grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className={TITULO_DT}>Aforo real</dt>
          <dd className="m-0 text-xl font-bold tabular-nums">{aforoReal}</dd>
        </div>
        <div>
          <dt className={TITULO_DT}>Aforo nominal</dt>
          <dd className="m-0 text-xl font-bold tabular-nums">{datos.aforoNominal}</dd>
        </div>
        <div>
          <dt className={TITULO_DT}>PCs inoperativas</dt>
          <dd
            className={`m-0 text-xl font-bold tabular-nums ${inoperativas > 0 ? 'text-saie-danger-strong' : ''}`}
          >
            {esLab ? inoperativas : 'No aplica'}
          </dd>
        </div>
      </dl>
      {esLab && (
        <div className="flex flex-col gap-1">
          <p className={`m-0 ${TITULO_DT}`}>Software instalado</p>
          {software.length === 0 ? (
            <p className="m-0 text-sm text-saie-muted">No hay software registrado.</p>
          ) : (
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {software.map((s) => (
                <li
                  key={s.id}
                  className="rounded-full border border-saie-divider bg-saie-canvas px-3 py-1 text-sm"
                >
                  {s.nombre} {s.version}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
};

/** Formulario de cierre: resolver o descartar, siempre con un comentario. */
const CierreIncidencia: React.FC<{
  inc: IncidenciaAdminDTO;
  onCerrada: (cerrada: IncidenciaAdminDTO) => void;
}> = ({ inc, onCerrada }) => {
  const accion = useAccion();
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState<'RESUELTA' | 'DESCARTADA' | null>(null);
  const [errorCierre, setErrorCierre] = useState<string | null>(null);
  const texto = comentario.trim();
  const motivo =
    texto.length < MIN_COMENTARIO
      ? `Escribe un comentario de cierre (al menos ${MIN_COMENTARIO} caracteres).`
      : null;

  async function cerrar(estado: 'RESUELTA' | 'DESCARTADA') {
    if (motivo) return;
    setEnviando(estado);
    setErrorCierre(null);
    const resultado = await accion.ejecutar(
      () => cerrarIncidencia(inc.id, { estado, comentario: texto }),
      {
        exito: `Incidencia ${inc.identificadorSeguimiento} ${
          estado === 'RESUELTA' ? 'resuelta' : 'descartada'
        }.`,
        avisarError: false,
      },
    );
    setEnviando(null);
    if (resultado?.ok) onCerrada(resultado.valor);
    else if (resultado) setErrorCierre(resultado.error);
  }

  return (
    <div className={`${CLASE_PIE_DRAWER} flex flex-col gap-3`}>
      <Campo
        etiqueta="Comentario de cierre"
        ayuda="Qué se hizo o por qué se descarta. Lo verá el historial de la incidencia."
      >
        <textarea
          value={comentario}
          rows={3}
          maxLength={MAX_COMENTARIO}
          onChange={(e) => {
            setComentario(e.target.value);
            setErrorCierre(null);
          }}
          className={`${CLASE_CAMPO} py-2`}
        />
      </Campo>
      {errorCierre && <Aviso tono="error">{errorCierre}</Aviso>}
      <div className="flex flex-wrap gap-3">
        <Boton
          onClick={() => cerrar('RESUELTA')}
          disabled={motivo !== null || enviando !== null}
          motivoDeshabilitado={motivo ?? undefined}
          cargando={enviando === 'RESUELTA'}
          textoCargando="Guardando…"
        >
          Marcar como resuelta
        </Boton>
        <Boton
          variante="cancelar"
          onClick={() => cerrar('DESCARTADA')}
          disabled={motivo !== null || enviando !== null}
          cargando={enviando === 'DESCARTADA'}
          textoCargando="Guardando…"
        >
          Descartar
        </Boton>
      </div>
    </div>
  );
};

/**
 * Revisión de incidencias por Jefatura de Laboratorios (Issue 7.11), con datos reales de
 * GET/PATCH /admin/incidencias (Issue 7.12). Al cerrar una incidencia la bandeja se actualiza
 * en el momento, sin recargar la página.
 */
export const IncidenciasAdminPage: React.FC = () => {
  const [estado, setEstado] = useState<EstadoIncidencia>('PENDIENTE');
  const [prioridad, setPrioridad] = useState<'TODAS' | PrioridadIncidencia>('TODAS');
  // Incidencias cerradas en esta visita: se reflejan sin volver a pedir la lista.
  const [cerradas, setCerradas] = useState<Record<string, IncidenciaAdminDTO>>({});
  const detalle = useDetalleEnUrl('incidencia');

  const cargar = useCallback(
    () =>
      obtenerIncidencias({
        estado,
        prioridad: prioridad === 'TODAS' ? undefined : prioridad,
      }),
    [estado, prioridad],
  );
  const { datos, cargando, error, recargar, deOtraConsulta } = useCarga(cargar, {
    clave: `${CLAVE_INCIDENCIAS}:${estado}|${prioridad}`,
  });

  const incidencias = (datos ?? [])
    .map((i) => cerradas[i.id] ?? i)
    .filter((i) => i.estado === estado);
  const seleccionada =
    detalle.valor === null
      ? null
      : (cerradas[detalle.valor] ?? (datos ?? []).find((i) => i.id === detalle.valor) ?? null);

  const alCerrar = (cerrada: IncidenciaAdminDTO) => {
    // Las otras vistas (resueltas/descartadas) quedaron viejas: se vuelven a pedir al entrar.
    invalidarCacheCarga(CLAVE_INCIDENCIAS);
    setCerradas((previo) => ({ ...previo, [cerrada.id]: cerrada }));
    detalle.cerrar();
  };

  const vacio = ESTADOS.find((e) => e.valor === estado)?.etiqueta.toLowerCase() ?? 'incidencias';

  return (
    <LayoutAdmin
      titulo="Revisión de incidencias"
      subtitulo="Jefatura de Laboratorios"
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
      <section aria-label="Filtros de incidencias" className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-2xl">
          <Campo etiqueta="Estado">
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoIncidencia)}
              className={CLASE_CAMPO}
            >
              {ESTADOS.map((e) => (
                <option key={e.valor} value={e.valor}>
                  {e.etiqueta}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Prioridad">
            <select
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value as 'TODAS' | PrioridadIncidencia)}
              className={CLASE_CAMPO}
            >
              <option value="TODAS">Todas</option>
              <option value="ALTA">Alta</option>
              <option value="MEDIA">Media</option>
              <option value="BAJA">Baja</option>
            </select>
          </Campo>
        </div>
        {datos && (
          <p className="m-0 text-sm text-saie-muted" aria-live="polite">
            {plural(incidencias.length, 'incidencia', 'incidencias')}
            {estado === 'PENDIENTE' ? ' por atender' : ''}
          </p>
        )}
      </section>

      {error && <AvisoError mensaje={error} onReintentar={recargar} />}
      <ZonaActualizable actualizando={cargando && datos !== null && !deOtraConsulta}>
        {cargando && (!datos || deOtraConsulta) ? (
          <EsqueletoCarga texto="Cargando incidencias…" />
        ) : incidencias.length === 0 ? (
          <EstadoVacio
            titulo={`Sin incidencias ${vacio}`}
            icono={ICONOS.checkCirculo}
            descripcion={
              estado === 'PENDIENTE'
                ? 'Cuando un docente reporte un problema en tus laboratorios, aparecerá aquí.'
                : 'Aún no hay incidencias en este estado.'
            }
          />
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0" aria-label="Incidencias">
            {incidencias.map((inc) => (
              <li key={inc.id}>
                <TarjetaIncidencia inc={inc} onRevisar={() => detalle.abrir(inc.id)} />
              </li>
            ))}
          </ul>
        )}
      </ZonaActualizable>

      <Drawer
        abierto={seleccionada !== null}
        onCerrar={detalle.cerrar}
        titulo={seleccionada ? etiquetaTipoIncidencia(seleccionada.tipo) : 'Incidencia'}
        subtitulo={
          seleccionada
            ? `${seleccionada.identificadorSeguimiento} · ${seleccionada.espacio.identificador}, ${ubicacionEspacio(seleccionada.espacio)}`
            : undefined
        }
        insignia={
          seleccionada && (
            <BadgeEstado tono={describirPrioridadIncidencia(seleccionada.prioridad).tono}>
              {describirPrioridadIncidencia(seleccionada.prioridad).etiqueta}
            </BadgeEstado>
          )
        }
        tamano="md"
      >
        {seleccionada && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-xl border border-saie-divider bg-white p-4 text-sm">
              <dl className="m-0 flex flex-col gap-3">
                <div>
                  <dt className={TITULO_DT}>Descripción</dt>
                  <dd className="m-0 whitespace-pre-line">{seleccionada.descripcion}</dd>
                </div>
                {seleccionada.evidencia && (
                  <div>
                    <dt className={TITULO_DT}>Evidencia</dt>
                    <dd className="m-0 break-words">
                      {esEnlace(seleccionada.evidencia) ? (
                        <a
                          href={seleccionada.evidencia}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-saie-primary"
                        >
                          Abrir evidencia
                        </a>
                      ) : (
                        seleccionada.evidencia
                      )}
                    </dd>
                  </div>
                )}
              </dl>
              <dl className="m-0 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <dt className={TITULO_DT}>Reportada por</dt>
                  <dd className="m-0">
                    {seleccionada.docente.nombre}
                    <span className="text-saie-muted"> ({seleccionada.docente.codigo})</span>
                  </dd>
                </div>
                <div>
                  <dt className={TITULO_DT}>Clase</dt>
                  <dd className="m-0">
                    {seleccionada.asignacion.codigoCurso} · Sección{' '}
                    {seleccionada.asignacion.codigoSeccion}
                    <span className="block text-saie-muted">
                      {seleccionada.asignacion.nombreCurso}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className={TITULO_DT}>Fecha del reporte</dt>
                  <dd className="m-0">{formatearFechaAlerta(seleccionada.fechaReporte)}</dd>
                </div>
                <div>
                  <dt className={TITULO_DT}>Estado</dt>
                  <dd className="m-0 mt-1">
                    <BadgeEstado tono={describirEstadoIncidencia(seleccionada.estado).tono}>
                      {describirEstadoIncidencia(seleccionada.estado).etiqueta}
                    </BadgeEstado>
                  </dd>
                </div>
              </dl>
              {seleccionada.comentarioCierre && (
                <dl className="m-0">
                  <dt className={TITULO_DT}>Comentario de cierre</dt>
                  <dd className="m-0">
                    {seleccionada.comentarioCierre}
                    {seleccionada.fechaCierre && (
                      <span className="block text-saie-muted">
                        {formatearFechaAlerta(seleccionada.fechaCierre)}
                      </span>
                    )}
                  </dd>
                </dl>
              )}
            </div>

            <DetalleTecnico espacioId={seleccionada.espacio.id} />

            {seleccionada.estado === 'PENDIENTE' && (
              <CierreIncidencia key={seleccionada.id} inc={seleccionada} onCerrada={alCerrar} />
            )}
          </div>
        )}
      </Drawer>
    </LayoutAdmin>
  );
};

export default IncidenciasAdminPage;

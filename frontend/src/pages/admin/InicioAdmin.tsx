import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import LayoutAdmin, { AvisoError } from '../../components/admin/LayoutAdmin';
import { ResumenVerificacion } from '../../components/admin/VeredictoVerificacion';
import { EsqueletoCarga } from '../../components/estudiante/ElementosHorario';
import { Aviso } from '../../components/ui/Aviso';
import { BadgeEstado } from '../../components/ui/BadgeEstado';
import { Boton } from '../../components/ui/Boton';
import { RUTAS } from '../../config/rutas';
import { useAuth } from '../../context/useAuth';
import { useCarga } from '../../hooks/useCarga';
import {
  ejecutarCorrida,
  obtenerAlertas,
  obtenerEscaladas,
  reintentarSeccion,
} from '../../services/admin';
import { mensajeDeError } from '../../services/estudiante';
import type { ResumenAsignacionDTO, SeccionEscaladaDTO } from '../../types/admin';
import { describirMotivoEscalamiento, formatearFechaCorta } from '../../utils/admin';
import { ETIQUETA_TIPO_ALERTA } from '../../utils/etiquetas';

/**
 * Issue 4.20 — inicio de Coordinación Académica.
 *
 * Es un tablero: todo lo que hay que ver de la asignación cabe en una pantalla sin
 * scrollear. Las listas largas (las secciones que esperan revisión) llevan su propio scroll
 * interno y el resto son tarjetas fijas.
 */

/**
 * Enlace de acceso a una pantalla del panel. El nombre accesible es el contenido visible
 * (título, descripción y «Abrir»): un `aria-label` propio se descarta en la cola y además
 * incumple la regla «label-content-name-mismatch» de axe (WCAG 2.5.3), que exige que el texto
 * visible forme parte del nombre accesible.
 */
const Acceso: React.FC<{ to: string; titulo: string; descripcion: string; trazo: string }> = ({
  to,
  titulo,
  descripcion,
  trazo,
}) => (
  <Link
    to={to}
    className="group flex items-center gap-3 rounded-xl border border-saie-divider bg-white px-3 py-2.5 no-underline transition-colors hover:border-saie-primary"
  >
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-saie-primary/10 text-saie-primary"
    >
      <svg
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        viewBox="0 0 24 24"
      >
        <path d={trazo} />
      </svg>
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-sm font-bold text-saie-text">{titulo}</span>
      <span className="block text-xs text-saie-muted">{descripcion}</span>
    </span>
  </Link>
);

/** Métrica del tablero: cifra grande y etiqueta corta. */
const Metrica: React.FC<{ valor: number | string; etiqueta: string; tono?: string }> = ({
  valor,
  etiqueta,
  tono = 'text-saie-text',
}) => (
  <div className="rounded-xl border border-saie-divider bg-white p-3">
    <p className={`m-0 font-serif text-3xl font-bold leading-none ${tono}`}>{valor}</p>
    <p className="m-0 mt-1 text-xs font-medium text-saie-muted">{etiqueta}</p>
  </div>
);

/** Resultado de reintentar una sección: sigue en revisión, se le asignó aula o conserva la suya. */
function textoResultadoSeccion(resumen: ResumenAsignacionDTO): string {
  if (resumen.escaladas > 0) return 'Esta sección sigue en revisión.';
  if (resumen.asignadas > 0) return 'Se le asignó un aula a esta sección.';
  return 'Esta sección conserva el aula que ya tenía.';
}

/**
 * Una sección escalada, en formato compacto: el motivo en lenguaje llano, la acción sugerida
 * y el reintento. El código interno del motivo queda plegado, bajo «Código de soporte».
 */
const FilaEscalada: React.FC<{
  seccion: SeccionEscaladaDTO;
  reintentando: boolean;
  deshabilitado: boolean;
  onReintentar: (seccion: SeccionEscaladaDTO) => void;
}> = ({ seccion, reintentando, deshabilitado, onReintentar }) => {
  const motivo = describirMotivoEscalamiento(seccion.motivoEscalamiento);
  const alumnos = seccion.seccion.alumnosMatriculados;

  return (
    <li className="flex flex-col gap-2 border-b border-saie-divider py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="m-0 text-sm font-semibold text-saie-text sm:truncate">
          {seccion.seccion.codigoCurso} · {seccion.seccion.codigoSeccion} —{' '}
          {seccion.seccion.nombreCurso}
        </p>
        <p className="m-0 flex flex-wrap items-center gap-2 text-xs text-saie-muted">
          {/*
            El código del motivo es interno (lo escribe el motor): no se muestra, pero queda en
            el título del distintivo por si hay que pasarlo a soporte técnico.
          */}
          <span title={motivo.codigo ? `Código de soporte: ${motivo.codigo}` : undefined}>
            <BadgeEstado tono="advertencia">{motivo.etiqueta}</BadgeEstado>
          </span>
          <span className="min-w-0 sm:truncate">{motivo.descripcion}</span>
          <span>
            {alumnos} {alumnos === 1 ? 'alumno' : 'alumnos'}
          </span>
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
        {motivo.accion && (
          <Link
            to={motivo.accion.to}
            className="inline-flex min-h-11 items-center rounded-xl border border-saie-primary bg-white px-4 text-sm font-medium text-saie-primary no-underline hover:bg-saie-primary/5"
          >
            {motivo.accion.etiqueta}
          </Link>
        )}
        <Boton
          variante="fantasma"
          tamano="sm"
          onClick={() => onReintentar(seccion)}
          cargando={reintentando}
          textoCargando="Reintentando…"
          disabled={deshabilitado}
          title={
            motivo.codigo === 'SIN_HORARIOS_DEFINIDOS'
              ? 'Vuelve a intentar después de cargar el horario'
              : 'Vuelve a ejecutar la asignación de esta sección'
          }
        >
          Reintentar
        </Boton>
      </div>
    </li>
  );
};

/** Lista de secciones que el motor dejó sin aula, con scroll interno. */
const ListaEscaladas: React.FC<{
  secciones: SeccionEscaladaDTO[];
  cargando: boolean;
  /** La carga falló: el aviso de error ya lo explica y no se afirma que no haya pendientes. */
  sinDatos?: boolean;
  reintentando: string | null;
  onReintentar: (seccion: SeccionEscaladaDTO) => void;
}> = ({ secciones, cargando, sinDatos = false, reintentando, onReintentar }) => {
  if (cargando) return <EsqueletoCarga texto="Cargando secciones pendientes…" />;
  if (sinDatos) return null;

  if (secciones.length === 0) {
    return (
      <p className="m-0 rounded-xl border border-dashed border-saie-divider bg-saie-canvas p-6 text-center text-sm text-saie-muted">
        No hay secciones pendientes de revisión. Todas tienen un espacio asignado.
      </p>
    );
  }

  return (
    <ul className="m-0 list-none p-0 lg:overflow-y-auto">
      {secciones.map((s) => (
        <FilaEscalada
          key={s.asignacionId}
          seccion={s}
          reintentando={reintentando === s.seccion.id}
          deshabilitado={reintentando !== null && reintentando !== s.seccion.id}
          onReintentar={onReintentar}
        />
      ))}
    </ul>
  );
};

/** Alertas que se listan en el inicio de Jefatura; el resto está en el centro de alertas. */
const MAX_ALERTAS_INICIO = 5;

/** Jefatura: resumen de sus alertas y acceso al formulario de laboratorio (Issue 4.19). */
const InicioJefatura: React.FC = () => {
  const { datos, cargando, error, recargar } = useCarga(obtenerAlertas);
  // Las cifras cuentan solo lo que sigue pendiente: una alerta resuelta ya no pide atención.
  const pendientes = datos?.filter((a) => a.estado === 'PENDIENTE') ?? [];

  return (
    <LayoutAdmin titulo="Área administrativa" subtitulo="Estado de tus laboratorios">
      <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-3">
        <li>
          <Metrica
            valor={pendientes.length}
            etiqueta="Alertas pendientes"
            tono={pendientes.length > 0 ? 'text-saie-danger' : 'text-saie-text'}
          />
        </li>
        <li>
          <Metrica
            valor={pendientes.filter((a) => a.tipo === 'SOFTWARE').length}
            etiqueta="De software"
          />
        </li>
        <li>
          <Metrica
            valor={pendientes.filter((a) => a.tipo === 'CAPACIDAD').length}
            etiqueta="De capacidad"
          />
        </li>
      </ul>

      {error && <AvisoError mensaje={error} onReintentar={recargar} />}
      {cargando && !datos ? (
        <EsqueletoCarga texto="Cargando resumen…" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-12">
          {/* Lo que pide atención: las alertas pendientes más recientes, sin abrir otra pantalla */}
          <section
            aria-labelledby="titulo-recientes"
            className="flex flex-col gap-2 rounded-2xl border border-saie-divider bg-white p-5 lg:col-span-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="titulo-recientes" className="m-0 text-sm font-bold text-saie-text">
                Pendientes más recientes
              </h2>
              {pendientes.length > MAX_ALERTAS_INICIO && (
                <Link
                  to={RUTAS.alertasAdmin}
                  className="text-sm font-semibold text-saie-primary no-underline hover:underline"
                >
                  Ver todas →
                </Link>
              )}
            </div>
            {pendientes.length === 0 ? (
              <p className="m-0 rounded-xl border border-dashed border-saie-divider bg-saie-canvas p-6 text-center text-sm text-saie-muted">
                No hay alertas pendientes en tus laboratorios.
              </p>
            ) : (
              <ul className="m-0 list-none divide-y divide-saie-divider p-0">
                {pendientes.slice(0, MAX_ALERTAS_INICIO).map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
                    <span className="w-20 shrink-0 text-sm font-bold text-saie-text">
                      {a.espacio.identificador}
                    </span>
                    <BadgeEstado tono="neutro" conIcono={false}>
                      {ETIQUETA_TIPO_ALERTA[a.tipo]}
                    </BadgeEstado>
                    <span className="min-w-0 flex-1 truncate text-sm text-saie-muted">
                      {a.motivo}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex flex-col gap-3 lg:col-span-4">
            <Acceso
              to={RUTAS.alertasAdmin}
              titulo="Alertas de mis laboratorios"
              descripcion="Revisa y marca como resueltas las alertas."
              trazo="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
            <Acceso
              to={RUTAS.cambioLaboratorio}
              titulo="Reportar cambio de laboratorio"
              descripcion="Software instalado y PCs malogradas o reparadas."
              trazo="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </div>
        </div>
      )}
    </LayoutAdmin>
  );
};

/** Issue 4.20 — inicio de Coordinación Académica, en modo tablero. */
const InicioCoordinacion: React.FC = () => {
  const escaladas = useCarga(obtenerEscaladas);
  const alertas = useCarga(obtenerAlertas);
  const [corriendo, setCorrida] = useState(false);
  const [confirmandoCorrida, setConfirmandoCorrida] = useState(false);
  const [reintentando, setReintentando] = useState<string | null>(null);
  const [resumenCorrida, setResumenCorrida] = useState<ResumenAsignacionDTO | null>(null);
  const [resultadoSeccion, setResultadoSeccion] = useState<{
    resumen: ResumenAsignacionDTO;
    seccion: SeccionEscaladaDTO;
  } | null>(null);
  const [ultimaCorrida, setUltimaCorrida] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<{
    mensaje: string;
    reintentar: () => void;
  } | null>(null);

  const pendientes = alertas.datos?.filter((a) => a.estado === 'PENDIENTE').length ?? 0;
  const periodo = escaladas.datos?.periodo ?? resumenCorrida?.periodo ?? '—';
  const secciones = escaladas.datos?.secciones ?? [];

  async function correr() {
    if (corriendo) return;
    setConfirmandoCorrida(false);
    setResultadoSeccion(null);
    setCorrida(true);
    setErrorAccion(null);
    try {
      const resumen = await ejecutarCorrida();
      setResumenCorrida(resumen);
      setUltimaCorrida(new Date().toISOString());
      // La corrida crea y resuelve alertas: hay que volver a pedirlas, no solo las escaladas.
      escaladas.recargar();
      alertas.recargar();
    } catch (e) {
      setErrorAccion({ mensaje: mensajeDeError(e), reintentar: correr });
    } finally {
      setCorrida(false);
    }
  }

  async function reintentar(seccion: SeccionEscaladaDTO) {
    if (reintentando) return;
    setReintentando(seccion.seccion.id);
    setErrorAccion(null);
    try {
      // El resultado de una sección no es la corrida del periodo: se muestra aparte.
      const resumen = await reintentarSeccion(seccion.seccion.id);
      setResultadoSeccion({ resumen, seccion });
      escaladas.recargar();
      alertas.recargar();
    } catch (e) {
      setErrorAccion({ mensaje: mensajeDeError(e), reintentar: () => reintentar(seccion) });
    } finally {
      setReintentando(null);
    }
  }

  const totalEnRevision = escaladas.datos?.total;

  return (
    <LayoutAdmin
      dashboard
      titulo="Área administrativa"
      subtitulo="Estado de la asignación de aulas"
    >
      {/*
        El tablero ocupa lo que queda del `main` (una columna flex) tras el título: con
        `lg:h-full` sumaba el 100 % de `main` al título y la última fila quedaba recortada.
      */}
      <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-12 lg:grid-rows-[auto_1fr]">
        {/* Qué está pasando: la asignación del periodo y su acción principal */}
        <section
          aria-label="Estado de la asignación"
          className="flex flex-col gap-3 rounded-2xl bg-gradient-to-br from-saie-primary to-saie-primary-dark p-5 text-white lg:col-span-8"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="m-0 text-sm font-medium text-white/80">
                Asignación de aulas · Periodo {periodo}
              </h2>
              <p role="status" aria-live="polite" className="m-0 mt-1 text-base font-semibold">
                {resumenCorrida
                  ? `${resumenCorrida.asignadas} con aula nueva · ${resumenCorrida.mantenidas} conservan la suya · ${resumenCorrida.escaladas} de ${resumenCorrida.totalSecciones} esperan revisión`
                  : 'Las aulas se recalculan tras cada carga de datos o cuando ejecutas la asignación.'}
              </p>
              {ultimaCorrida && (
                <p className="m-0 mt-1 text-xs text-white/75">
                  Última asignación: {formatearFechaCorta(ultimaCorrida)}
                </p>
              )}
            </div>
            {!confirmandoCorrida && (
              <Boton
                variante="secundario"
                onClick={() => setConfirmandoCorrida(true)}
                disabled={corriendo}
                cargando={corriendo}
                textoCargando="Asignando…"
                className="border-white! bg-white! text-saie-primary! hover:bg-saie-canvas!"
              >
                Asignar aulas del periodo
              </Boton>
            )}
          </div>

          {confirmandoCorrida && (
            <div className="rounded-xl bg-white p-3 text-saie-text">
              <p className="m-0 text-sm">
                Se volverán a asignar las aulas de las secciones del periodo {periodo}. Las
                asignaciones que siguen siendo válidas se conservan y no se duplican aulas.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Boton
                  variante="primario"
                  tamano="sm"
                  onClick={correr}
                  cargando={corriendo}
                  textoCargando="Asignando…"
                >
                  Sí, asignar aulas
                </Boton>
                <Boton
                  variante="cancelar"
                  tamano="sm"
                  onClick={() => setConfirmandoCorrida(false)}
                  disabled={corriendo}
                >
                  Cancelar
                </Boton>
              </div>
            </div>
          )}

          {resumenCorrida && <ResumenVerificacion verificacion={resumenCorrida.verificacion} />}
        </section>

        {/* Qué requiere atención: dos cifras, cada una con su salida */}
        <section
          aria-labelledby="titulo-resumen"
          className="flex flex-col gap-3 rounded-2xl border border-saie-divider bg-white p-5 lg:col-span-4"
        >
          <h2 id="titulo-resumen" className="m-0 text-sm font-bold text-saie-text">
            Requieren tu atención
          </h2>
          <div className="flex items-baseline justify-between gap-2 border-b border-saie-divider pb-3">
            <p className="m-0 text-sm text-saie-muted">
              <strong className="font-serif text-3xl text-saie-warning-strong">
                {totalEnRevision ?? '…'}
              </strong>{' '}
              <span>secciones sin aula</span>
            </p>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="m-0 text-sm text-saie-muted">
              <strong className="font-serif text-3xl text-saie-danger">{pendientes}</strong>{' '}
              <span>alertas pendientes</span>
            </p>
            <Link
              to={RUTAS.alertasAdmin}
              className="text-sm font-semibold text-saie-primary no-underline hover:underline"
            >
              Ver alertas →
            </Link>
          </div>
        </section>

        {/* Qué hacer: las secciones a resolver, una por una */}
        <section
          aria-labelledby="titulo-atencion"
          className="flex min-h-0 flex-col gap-2 rounded-2xl border border-saie-divider bg-white p-5 lg:col-span-12"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="titulo-atencion" className="m-0 text-sm font-bold text-saie-text">
              Secciones que requieren revisión
            </h2>
            {secciones.length > 0 && (
              <Link
                to={RUTAS.seccionesAdmin}
                className="text-sm font-semibold text-saie-primary no-underline hover:underline"
              >
                Ver todas las secciones →
              </Link>
            )}
          </div>
          {escaladas.error && (
            <AvisoError mensaje={escaladas.error} onReintentar={escaladas.recargar} />
          )}
          {errorAccion && (
            <AvisoError mensaje={errorAccion.mensaje} onReintentar={errorAccion.reintentar} />
          )}
          {resultadoSeccion && (
            <Aviso tono="info" role="status">
              <p className="m-0 font-semibold">
                Nuevo intento para {resultadoSeccion.seccion.seccion.codigoCurso} ·{' '}
                {resultadoSeccion.seccion.seccion.codigoSeccion}
              </p>
              <p className="m-0 mt-0.5 text-sm">
                {textoResultadoSeccion(resultadoSeccion.resumen)}
              </p>
            </Aviso>
          )}
          <div className="min-h-0 flex-1 lg:overflow-y-auto">
            <ListaEscaladas
              secciones={secciones}
              cargando={escaladas.cargando && !escaladas.datos}
              sinDatos={Boolean(escaladas.error) && !escaladas.datos}
              reintentando={reintentando}
              onReintentar={reintentar}
            />
          </div>
        </section>

        {/*
          Accesos a las demás pantallas. En escritorio ya están en la barra superior, así que
          solo se muestran en móvil, donde varias no caben en la barra inferior.
        */}
        <nav aria-labelledby="titulo-accesos" className="flex flex-col gap-2 md:hidden">
          <h2 id="titulo-accesos" className="m-0 text-sm font-bold text-saie-text">
            Ir a
          </h2>
          <Acceso
            to={RUTAS.cargaAdmin}
            titulo="Carga de datos"
            descripcion="Cursos, horarios, matrículas y docentes."
            trazo="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0-12l-4 4m4-4l4 4"
          />
          <Acceso
            to={RUTAS.espaciosAdmin}
            titulo="Espacios"
            descripcion="Aulas y laboratorios, capacidad y estado."
            trazo="M3 21h18M5 21V7l7-4 7 4v14M9 9h1m4 0h1M9 13h1m4 0h1M9 17h1m4 0h1"
          />
          <Acceso
            to={RUTAS.seccionesAdmin}
            titulo="Secciones"
            descripcion="Gestión individual de cada curso del periodo."
            trazo="M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"
          />
          <Acceso
            to={RUTAS.auditoriaAdmin}
            titulo="Auditoría"
            descripcion="Historial de asignaciones y registro del motor."
            trazo="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
          <Acceso
            to={RUTAS.reporteSalonesAdmin}
            titulo="Informe de salones"
            descripcion="El cuadro de aulas, listo para presentar."
            trazo="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </nav>
      </div>
    </LayoutAdmin>
  );
};

export const InicioAdmin: React.FC = () => {
  const { sesion } = useAuth();
  return sesion?.rol === 'JEFATURA_LABORATORIOS' ? <InicioJefatura /> : <InicioCoordinacion />;
};

export default InicioAdmin;

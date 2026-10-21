import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import LayoutAdmin, { AvisoError } from '../../components/admin/LayoutAdmin';
import { VeredictoVerificacion } from '../../components/admin/VeredictoVerificacion';
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
import type {
  ResumenAsignacionDTO,
  ResultadoVerificacionDTO,
  SeccionEscaladaDTO,
} from '../../types/admin';
import { describirMotivoEscalamiento, formatearFechaCorta } from '../../utils/admin';

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
    className="group flex items-start gap-3 rounded-xl border border-saie-divider bg-white p-3 no-underline transition-colors hover:border-saie-primary"
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

/** Texto del distintivo del verificador según el resultado de la corrida. */
function textoVerificador(verificacion: ResultadoVerificacionDTO | null): string {
  if (!verificacion) return 'Verificador: sin asignaciones que revisar';
  if (verificacion.conforme) {
    return `Conforme · ${verificacion.totalRevisadas} revisadas`;
  }
  return `No conforme · ${verificacion.totalViolaciones} violación(es)`;
}

/** Colores del distintivo del verificador. */
function claseVerificador(verificacion: ResultadoVerificacionDTO | null): string {
  if (!verificacion) return 'bg-white/15 text-white';
  if (verificacion.conforme) return 'bg-saie-success-soft text-saie-success-strong';
  return 'bg-saie-danger-soft text-saie-danger-strong';
}

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
    <li className="flex flex-wrap items-center justify-between gap-3 border-b border-saie-divider py-2.5 last:border-b-0">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="m-0 truncate text-sm font-semibold text-saie-text">
          {seccion.seccion.codigoCurso} · {seccion.seccion.codigoSeccion} —{' '}
          {seccion.seccion.nombreCurso}
        </p>
        <p className="m-0 flex flex-wrap items-center gap-2 text-xs text-saie-muted">
          <BadgeEstado tono="advertencia">{motivo.etiqueta}</BadgeEstado>
          <span className="min-w-0 truncate">{motivo.descripcion}</span>
          <span>
            {alumnos} {alumnos === 1 ? 'alumno' : 'alumnos'}
          </span>
        </p>
        {/*
          El código del motivo es interno (lo escribe el motor). Se muestra plegado y bajo una
          etiqueta de "soporte" para que la persona que coordina lea primero la causa en
          lenguaje llano y solo abra el código si necesita pasarlo a soporte técnico.
        */}
        {motivo.codigo && (
          <details className="w-fit text-xs text-saie-muted">
            <summary className="cursor-pointer">Código de soporte</summary>
            <span className="font-mono text-[10px]">{motivo.codigo}</span>
          </details>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {motivo.accion && (
          <Link
            to={motivo.accion.to}
            className="rounded-lg border border-saie-primary px-2.5 py-1 text-xs font-semibold text-saie-primary no-underline hover:bg-saie-primary/5"
          >
            {motivo.accion.etiqueta}
          </Link>
        )}
        <Boton
          variante="secundario"
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
  reintentando: string | null;
  onReintentar: (seccion: SeccionEscaladaDTO) => void;
}> = ({ secciones, cargando, reintentando, onReintentar }) => {
  if (cargando) return <EsqueletoCarga texto="Cargando secciones pendientes…" />;

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

/** Jefatura: resumen de sus alertas y acceso al formulario de laboratorio (Issue 4.19). */
const InicioJefatura: React.FC = () => {
  const { datos, cargando, error, recargar } = useCarga(obtenerAlertas);
  const pendientes = datos?.filter((a) => a.estado === 'PENDIENTE').length ?? 0;

  return (
    <LayoutAdmin dashboard titulo="Área administrativa" subtitulo="Jefatura de Laboratorios">
      <div className="grid gap-4 lg:h-full lg:min-h-0 lg:grid-rows-[auto_1fr]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Metrica valor={pendientes} etiqueta="Alertas pendientes" tono="text-saie-danger" />
          <Metrica
            valor={datos?.filter((a) => a.tipo === 'SOFTWARE').length ?? 0}
            etiqueta="De software"
          />
          <Metrica
            valor={datos?.filter((a) => a.tipo === 'CAPACIDAD').length ?? 0}
            etiqueta="De capacidad"
          />
        </div>

        {error && <AvisoError mensaje={error} onReintentar={recargar} />}
        {cargando && !datos ? (
          <EsqueletoCarga texto="Cargando resumen…" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:min-h-0">
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
        )}
      </div>
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

  return (
    <LayoutAdmin dashboard titulo="Área administrativa" subtitulo="Coordinación Académica">
      <div className="grid gap-4 lg:h-full lg:min-h-0 lg:grid-rows-[auto_auto_1fr]">
        {/* FILA 1 — las cuatro cifras que resumen la asignación */}
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 lg:grid-cols-4">
          <li>
            <Metrica
              valor={resumenCorrida?.asignadas ?? escaladas.datos?.total ?? '…'}
              etiqueta="Con aula nueva"
              tono="text-saie-success-strong"
            />
          </li>
          <li>
            <Metrica valor={resumenCorrida?.mantenidas ?? '…'} etiqueta="Conservan la suya" />
          </li>
          <li>
            <Metrica
              valor={resumenCorrida?.escaladas ?? escaladas.datos?.total ?? '…'}
              etiqueta="Esperan revisión"
              tono="text-saie-warning-strong"
            />
          </li>
          <li>
            <Metrica valor={pendientes} etiqueta="Alertas pendientes" tono="text-saie-danger" />
          </li>
        </ul>

        {/* FILA 2 — estado de la corrida y veredicto del verificador */}
        <div className="grid gap-4 lg:grid-cols-12">
          <section
            aria-label="Estado de la asignación"
            className="flex flex-col justify-center gap-3 rounded-2xl bg-gradient-to-br from-saie-primary to-saie-primary-dark p-4 text-white lg:col-span-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="m-0 text-xs text-white/80">Asignación de aulas · Periodo {periodo}</p>
                <p role="status" aria-live="polite" className="m-0 mt-0.5 text-sm">
                  {resumenCorrida
                    ? `${resumenCorrida.asignadas} con aula nueva · ${resumenCorrida.mantenidas} conservan la suya · ${resumenCorrida.escaladas} de ${resumenCorrida.totalSecciones} esperan revisión`
                    : `${escaladas.datos?.total ?? '…'} secciones esperan revisión`}
                </p>
                {ultimaCorrida && (
                  <p className="m-0 mt-1 text-xs text-white/75">
                    Última actualización: {formatearFechaCorta(ultimaCorrida)}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
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
            </div>

            {confirmandoCorrida && (
              <div className="rounded-xl border border-white/30 bg-white p-3 text-saie-text">
                <p className="m-0 text-sm">
                  Se volverán a asignar las aulas de las secciones del periodo {periodo}. Las
                  asignaciones que siguen siendo válidas se conservan y no se duplican aulas.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Boton
                    variante="cancelar"
                    tamano="sm"
                    onClick={() => setConfirmandoCorrida(false)}
                    disabled={corriendo}
                  >
                    Cancelar
                  </Boton>
                  <Boton
                    variante="primario"
                    tamano="sm"
                    onClick={correr}
                    cargando={corriendo}
                    textoCargando="Asignando…"
                  >
                    Sí, asignar aulas
                  </Boton>
                </div>
              </div>
            )}
          </section>

          <section
            aria-label="Veredicto del verificador"
            className="flex flex-col gap-2 rounded-2xl border border-saie-divider bg-white p-4 lg:col-span-4"
          >
            <h2 className="m-0 text-sm font-bold text-saie-text">Verificador de la corrida</h2>
            {resumenCorrida ? (
              <>
                <p className="m-0 text-xs text-saie-muted">
                  {resumenCorrida.verificacion
                    ? `${resumenCorrida.verificacion.totalRevisadas} asignaciones revisadas contra las 7 reglas duras del motor.`
                    : 'Esta corrida no dejó asignaciones que verificar.'}
                </p>
                <span
                  className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${claseVerificador(resumenCorrida.verificacion)}`}
                >
                  {textoVerificador(resumenCorrida.verificacion)}
                </span>
                {/* El detalle de las siete reglas queda plegado: el tablero no crece por ello. */}
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs font-semibold text-saie-primary">
                    Ver el detalle de las reglas
                  </summary>
                  <div className="mt-2">
                    <VeredictoVerificacion verificacion={resumenCorrida.verificacion} />
                  </div>
                </details>
              </>
            ) : (
              <p className="m-0 text-xs text-saie-muted">
                Corre la asignación para ver el veredicto: comprueba que no haya doble reservas, que
                el aula tenga capacidad y el software necesario.
              </p>
            )}
          </section>
        </div>

        {/* FILA 3 — lo que hay que resolver y los accesos a las demás pantallas */}
        <div className="grid min-h-0 gap-4 lg:grid-cols-12">
          <section
            aria-labelledby="titulo-atencion"
            className="flex min-h-0 flex-col gap-2 rounded-2xl border border-saie-divider bg-white p-4 lg:col-span-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="titulo-atencion" className="m-0 text-sm font-bold text-saie-text">
                Secciones que requieren revisión
              </h2>
              {secciones.length > 0 && (
                <span className="text-xs text-saie-muted">
                  {secciones.length} {secciones.length === 1 ? 'sección' : 'secciones'}
                </span>
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
                reintentando={reintentando}
                onReintentar={reintentar}
              />
            </div>
          </section>

          <div className="flex min-h-0 flex-col gap-4 lg:col-span-4 lg:overflow-y-auto">
            <section
              aria-labelledby="titulo-resumen"
              className="flex flex-col gap-2 rounded-2xl border border-saie-divider bg-white p-4"
            >
              <h2 id="titulo-resumen" className="m-0 text-sm font-bold text-saie-text">
                Requieren tu atención
              </h2>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  <strong className="text-xl text-saie-danger">{pendientes}</strong> alertas
                  pendientes
                </span>
                <Link to={RUTAS.alertasAdmin} className="text-xs font-semibold text-saie-primary">
                  Ver alertas →
                </Link>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  <strong className="text-xl text-saie-warning-strong">
                    {escaladas.datos?.total ?? '…'}
                  </strong>{' '}
                  secciones sin aula
                </span>
              </div>
            </section>

            <section
              aria-labelledby="titulo-accesos"
              className="flex flex-col gap-2 rounded-2xl border border-saie-divider bg-white p-4"
            >
              <h2 id="titulo-accesos" className="m-0 text-sm font-bold text-saie-text">
                Accesos
              </h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
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
                  descripcion="Historial de asignaciones y bitácora del motor."
                  trazo="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
                <Acceso
                  to={RUTAS.reporteSalonesAdmin}
                  titulo="Informe de salones"
                  descripcion="El cuadro de aulas, listo para presentar."
                  trazo="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </div>
            </section>
          </div>
        </div>
      </div>
    </LayoutAdmin>
  );
};

export const InicioAdmin: React.FC = () => {
  const { sesion } = useAuth();
  return sesion?.rol === 'JEFATURA_LABORATORIOS' ? <InicioJefatura /> : <InicioCoordinacion />;
};

export default InicioAdmin;

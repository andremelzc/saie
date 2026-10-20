import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import LayoutAdmin, { AvisoError } from '../../components/admin/LayoutAdmin';
import { VeredictoVerificacion } from '../../components/admin/VeredictoVerificacion';
import { EsqueletoCarga } from '../../components/estudiante/ElementosHorario';
import { Aviso } from '../../components/ui/Aviso';
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
 * Enlace de acceso a una pantalla del panel. El nombre accesible es el contenido visible
 * (título, descripción y «Abrir»): un `aria-label` propio se descarta en la cola y además
 * incumple la regla «label-content-name-mismatch» de axe (WCAG 2.5.3), que exige que el texto
 * visible forme parte del nombre accesible.
 */
const Acceso: React.FC<{ to: string; titulo: string; descripcion: string }> = ({
  to,
  titulo,
  descripcion,
}) => (
  <Link
    to={to}
    className="group flex flex-col gap-2 rounded-xl border border-saie-divider bg-white p-5 no-underline shadow-[var(--saie-shadow-1)] transition-shadow hover:border-saie-primary hover:shadow-[var(--saie-shadow-3)]"
  >
    <span className="text-base font-bold text-saie-text">{titulo}</span>
    <span className="text-sm text-saie-muted">{descripcion}</span>
    <span className="text-sm font-semibold text-saie-primary group-hover:underline">Abrir →</span>
  </Link>
);

const Metrica: React.FC<{ valor: number | string; etiqueta: string; tono?: string }> = ({
  valor,
  etiqueta,
  tono = 'text-saie-text',
}) => (
  <div className="rounded-xl border border-saie-divider bg-white p-4">
    <p className={`m-0 text-3xl font-bold ${tono}`}>{valor}</p>
    <p className="m-0 text-xs text-saie-muted">{etiqueta}</p>
  </div>
);

/** Jefatura: resumen de sus alertas y acceso al formulario de laboratorio (Issue 4.19). */
const InicioJefatura: React.FC = () => {
  const { datos, cargando, error, recargar } = useCarga(obtenerAlertas);
  const pendientes = datos?.filter((a) => a.estado === 'PENDIENTE').length ?? 0;

  return (
    <LayoutAdmin titulo="Área administrativa" subtitulo="Jefatura de Laboratorios">
      {error && <AvisoError mensaje={error} onReintentar={recargar} />}
      {cargando && !datos ? (
        <EsqueletoCarga texto="Cargando resumen…" />
      ) : (
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
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Acceso
          to={RUTAS.alertasAdmin}
          titulo="Alertas de mis laboratorios"
          descripcion="Revisa y marca como resueltas las alertas."
        />
        <Acceso
          to={RUTAS.cambioLaboratorio}
          titulo="Reportar cambio de laboratorio"
          descripcion="Software instalado y PCs malogradas o reparadas."
        />
      </div>

      <p className="m-0 text-sm">
        <Link to={RUTAS.proximamenteAdmin} className="font-medium text-saie-primary">
          Hoja de ruta (lo que viene) →
        </Link>
      </p>
    </LayoutAdmin>
  );
};

/** Texto del distintivo del verificador según el resultado de la corrida. */
function textoVerificador(verificacion: ResultadoVerificacionDTO | null): string {
  if (!verificacion) return 'Verificador: sin asignaciones que revisar';
  if (verificacion.conforme) {
    return `✓ Verificador conforme · ${verificacion.totalRevisadas} revisadas`;
  }
  return `✗ Verificador no conforme · ${verificacion.totalViolaciones} violación(es)`;
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

/** Una sección escalada: motivo, descripción y las acciones para resolverla. */
const FilaEscalada: React.FC<{
  seccion: SeccionEscaladaDTO;
  reintentando: boolean;
  deshabilitado: boolean;
  onReintentar: (seccion: SeccionEscaladaDTO) => void;
}> = ({ seccion, reintentando, deshabilitado, onReintentar }) => {
  const motivo = describirMotivoEscalamiento(seccion.motivoEscalamiento);
  const alumnos = seccion.seccion.alumnosMatriculados;

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-saie-divider bg-white p-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="m-0 font-semibold text-saie-text">
          {seccion.seccion.codigoCurso} · {seccion.seccion.codigoSeccion} —{' '}
          {seccion.seccion.nombreCurso}
        </p>
        <span className="w-fit rounded-full bg-saie-warning-soft px-2 py-0.5 text-xs font-bold text-saie-warning-strong">
          {motivo.etiqueta}
        </span>
        <p className="m-0 text-sm text-saie-text">No se le asignó aula.</p>
        <p className="m-0 text-sm text-saie-muted">{motivo.descripcion}</p>
        <p className="m-0 text-xs text-saie-muted">
          {alumnos} {alumnos === 1 ? 'alumno matriculado' : 'alumnos matriculados'}
          {motivo.codigo && (
            <>
              {' · '}
              <span className="font-mono text-[10px]" title="Código interno del motivo">
                {motivo.codigo}
              </span>
            </>
          )}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {motivo.accion && (
          <Link
            to={motivo.accion.to}
            className="rounded-lg bg-saie-primary px-3 py-1.5 text-sm font-semibold text-white no-underline hover:bg-saie-primary-dark"
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

/** Lista de secciones que el motor dejó sin aula. */
const ListaEscaladas: React.FC<{
  secciones: SeccionEscaladaDTO[];
  cargando: boolean;
  haySecciones: boolean;
  reintentando: string | null;
  onReintentar: (seccion: SeccionEscaladaDTO) => void;
}> = ({ secciones, cargando, haySecciones, reintentando, onReintentar }) => {
  if (cargando) return <EsqueletoCarga texto="Cargando secciones pendientes…" />;

  if (!haySecciones) {
    return (
      <p className="m-0 rounded-xl border border-dashed border-saie-divider bg-white p-6 text-center text-sm text-saie-muted">
        No hay secciones pendientes de revisión. Todas tienen un espacio asignado.
      </p>
    );
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
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

/** Issue 4.20 — inicio de Coordinación Académica. */
const InicioCoordinacion: React.FC = () => {
  const escaladas = useCarga(obtenerEscaladas);
  const alertas = useCarga(obtenerAlertas);
  const [corriendo, setCorriendo] = useState(false);
  const [confirmandoCorrida, setConfirmandoCorrida] = useState(false);
  const [reintentando, setReintentando] = useState<string | null>(null);
  const [resumenCorrida, setResumenCorrida] = useState<ResumenAsignacionDTO | null>(null);
  const [resultadoSeccion, setResultadoSeccion] = useState<{
    resumen: ResumenAsignacionDTO;
    seccion: SeccionEscaladaDTO;
  } | null>(null);
  const [ultimaCorrida, setUltimaCorrida] = useState<string | null>(null);
  const [verTodasEscaladas, setVerTodasEscaladas] = useState(false);
  const [errorAccion, setErrorAccion] = useState<{
    mensaje: string;
    reintentar: () => void;
  } | null>(null);

  const pendientes = alertas.datos?.filter((a) => a.estado === 'PENDIENTE').length ?? 0;
  const periodo = escaladas.datos?.periodo ?? resumenCorrida?.periodo ?? '—';
  const secciones = escaladas.datos?.secciones ?? [];
  const visibles = verTodasEscaladas ? secciones : secciones.slice(0, 3);

  async function correr() {
    if (corriendo) return;
    setConfirmandoCorrida(false);
    setResultadoSeccion(null);
    setCorriendo(true);
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
      setCorriendo(false);
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
    <LayoutAdmin titulo="Área administrativa" subtitulo="Coordinación Académica">
      <section
        aria-label="Estado de la asignación"
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-saie-primary to-saie-primary-dark p-6 text-white"
      >
        <span
          aria-hidden="true"
          className="saie-plano-fondo pointer-events-none absolute inset-0"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="m-0 text-sm text-white/80">Asignación de aulas · Periodo {periodo}</p>
            <p role="status" aria-live="polite" className="m-0 mt-1 text-lg">
              {resumenCorrida ? (
                <>
                  <strong className="text-3xl">{resumenCorrida.asignadas}</strong> con aula nueva ·{' '}
                  <strong className="text-3xl">{resumenCorrida.mantenidas}</strong> conservan la
                  suya · <strong className="text-3xl">{resumenCorrida.escaladas}</strong> necesitan
                  revisión de {resumenCorrida.totalSecciones} secciones
                </>
              ) : (
                <>
                  <strong className="text-3xl">{escaladas.datos?.total ?? '…'}</strong> secciones
                  necesitan revisión
                </>
              )}
            </p>
            {ultimaCorrida && (
              <p className="m-0 mt-2 text-xs text-white/75">
                Última actualización: {formatearFechaCorta(ultimaCorrida)}
              </p>
            )}
            {resumenCorrida && (
              <p className="m-0 mt-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${claseVerificador(resumenCorrida.verificacion)}`}
                >
                  {textoVerificador(resumenCorrida.verificacion)}
                </span>
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
          <div className="relative mt-4 rounded-xl border border-white/30 bg-white p-4 text-saie-text">
            <p className="m-0 text-sm">
              Se volverán a asignar las aulas de las secciones del periodo {periodo}. Las
              asignaciones que siguen siendo válidas se conservan y no se duplican aulas.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
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

      {errorAccion && (
        <AvisoError mensaje={errorAccion.mensaje} onReintentar={errorAccion.reintentar} />
      )}

      {resumenCorrida && <VeredictoVerificacion verificacion={resumenCorrida.verificacion} />}

      {resultadoSeccion && (
        <Aviso tono="info" role="status">
          <p className="m-0 font-semibold">
            Nuevo intento para {resultadoSeccion.seccion.seccion.codigoCurso} ·{' '}
            {resultadoSeccion.seccion.seccion.codigoSeccion}
          </p>
          <p className="m-0 mt-1 text-sm">{textoResultadoSeccion(resultadoSeccion.resumen)}</p>
        </Aviso>
      )}

      <section aria-labelledby="titulo-atencion" className="flex flex-col gap-3">
        <h2 id="titulo-atencion" className="m-0 text-lg font-bold text-saie-text">
          Requieren tu atención
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-saie-divider bg-white p-4">
            <p className="m-0 text-sm">
              <strong className="text-2xl text-saie-danger">{pendientes}</strong> alertas pendientes
            </p>
            <Link to={RUTAS.alertasAdmin} className="text-sm font-semibold text-saie-primary">
              Ver alertas →
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-saie-divider bg-white p-4">
            <p className="m-0 text-sm">
              <strong className="text-2xl text-saie-warning-strong">
                {escaladas.datos?.total ?? '…'}
              </strong>{' '}
              secciones necesitan revisión
            </p>
            {secciones.length > 3 && (
              <button
                type="button"
                onClick={() => setVerTodasEscaladas((v) => !v)}
                aria-expanded={verTodasEscaladas}
                className="cursor-pointer text-sm font-semibold text-saie-primary"
              >
                {verTodasEscaladas ? 'Ver menos' : `Ver las ${secciones.length}`}
              </button>
            )}
          </div>
        </div>

        <h3 className="m-0 text-base font-bold text-saie-text">Secciones que necesitan revisión</h3>
        {escaladas.error && (
          <AvisoError mensaje={escaladas.error} onReintentar={escaladas.recargar} />
        )}
        <ListaEscaladas
          secciones={visibles}
          cargando={escaladas.cargando && !escaladas.datos}
          haySecciones={secciones.length > 0}
          reintentando={reintentando}
          onReintentar={reintentar}
        />
      </section>

      <section aria-labelledby="titulo-accesos" className="flex flex-col gap-3">
        <h2 id="titulo-accesos" className="m-0 text-lg font-bold text-saie-text">
          Accesos
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Acceso
            to={RUTAS.cargaAdmin}
            titulo="Carga de datos"
            descripcion="Cursos y secciones, horarios, matrículas y docentes."
          />
          <Acceso
            to={RUTAS.espaciosAdmin}
            titulo="Espacios"
            descripcion="Aulas y laboratorios, capacidad y estado."
          />
          <Acceso
            to={RUTAS.alertasAdmin}
            titulo="Alertas"
            descripcion="Casos de capacidad y software que requieren atención."
          />
        </div>
        <p className="m-0 text-sm">
          <Link to={RUTAS.proximamenteAdmin} className="font-medium text-saie-primary">
            Hoja de ruta (lo que viene) →
          </Link>
        </p>
      </section>
    </LayoutAdmin>
  );
};

export const InicioAdmin: React.FC = () => {
  const { sesion } = useAuth();
  return sesion?.rol === 'JEFATURA_LABORATORIOS' ? <InicioJefatura /> : <InicioCoordinacion />;
};

export default InicioAdmin;

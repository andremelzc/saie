import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import LayoutAdmin, { AvisoError } from '../../components/admin/LayoutAdmin';
import { VeredictoVerificacion } from '../../components/admin/VeredictoVerificacion';
import { EsqueletoCarga } from '../../components/estudiante/ElementosHorario';
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
import type { ResumenAsignacionDTO } from '../../types/admin';
import { describirMotivoEscalamiento } from '../../utils/admin';

const Acceso: React.FC<{ to: string; titulo: string; descripcion: string; extra?: string }> = ({
  to,
  titulo,
  descripcion,
  extra,
}) => (
  <Link
    to={to}
    className="group flex flex-col gap-2 rounded-xl border border-saie-divider bg-white p-5 no-underline shadow-[var(--saie-shadow-1)] transition-shadow hover:border-saie-primary hover:shadow-[var(--saie-shadow-3)]"
  >
    <span className="flex items-center justify-between">
      <span className="text-base font-bold text-saie-text">{titulo}</span>
      {extra && (
        <span className="rounded-full bg-saie-primary px-2.5 py-0.5 text-xs font-bold text-white">
          {extra}
        </span>
      )}
    </span>
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

/** Jefatura: inicio con el resumen de sus alertas y acceso al formulario de cambio (4.19). */
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
          extra={pendientes ? String(pendientes) : undefined}
        />
        <Acceso
          to={RUTAS.cambioLaboratorio}
          titulo="Reportar cambio de laboratorio"
          descripcion="Software instalado y PCs malogradas o reparadas."
        />
        <Acceso
          to={RUTAS.incidenciasAdmin}
          titulo="Revisión de incidencias"
          descripcion="Atiende las fallas de equipos y espacios reportadas por docentes."
        />
      </div>
    </LayoutAdmin>
  );
};

/** Issue 4.20 — inicio de Coordinación Académica. */
const InicioCoordinacion: React.FC = () => {
  const escaladas = useCarga(obtenerEscaladas);
  const alertas = useCarga(obtenerAlertas);
  const [corriendo, setCorriendo] = useState(false);
  const [reintentando, setReintentando] = useState<string | null>(null);
  const [resumen, setResumen] = useState<ResumenAsignacionDTO | null>(null);
  const [ultimaCorridaEn, setUltimaCorridaEn] = useState<Date | null>(null);
  const [errorAccion, setErrorAccion] = useState<{
    mensaje: string;
    reintentar: () => void;
  } | null>(null);

  const pendientes = alertas.datos?.filter((a) => a.estado === 'PENDIENTE').length ?? 0;

  async function correr() {
    setCorriendo(true);
    setErrorAccion(null);
    try {
      setResumen(await ejecutarCorrida());
      setUltimaCorridaEn(new Date());
      escaladas.recargar();
    } catch (e) {
      setErrorAccion({ mensaje: mensajeDeError(e), reintentar: correr });
    } finally {
      setCorriendo(false);
    }
  }

  async function reintentar(seccionId: string) {
    setReintentando(seccionId);
    setErrorAccion(null);
    try {
      setResumen(await reintentarSeccion(seccionId));
      setUltimaCorridaEn(new Date());
      escaladas.recargar();
    } catch (e) {
      setErrorAccion({ mensaje: mensajeDeError(e), reintentar: () => reintentar(seccionId) });
    } finally {
      setReintentando(null);
    }
  }

  return (
    <LayoutAdmin titulo="Área administrativa" subtitulo="Coordinación Académica">
      <section
        aria-label="Estado de la corrida"
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-saie-primary to-saie-primary-dark p-6 text-white"
      >
        <span
          aria-hidden="true"
          className="saie-plano-fondo pointer-events-none absolute inset-0"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="m-0 text-sm text-white/80">
              Corrida de asignación · Periodo {escaladas.datos?.periodo ?? resumen?.periodo ?? '—'}
            </p>
            {resumen ? (
              <>
                <p className="m-0 mt-1 text-lg">
                  <strong className="text-3xl">{resumen.asignadas + resumen.mantenidas}</strong> con
                  espacio · <strong className="text-3xl">{resumen.escaladas}</strong> escaladas de{' '}
                  {resumen.totalSecciones}
                </p>
                <p className="m-0 mt-1 text-xs text-white/85">
                  {resumen.asignadas} nueva(s) · {resumen.mantenidas} mantenida(s)
                  {ultimaCorridaEn &&
                    ` · actualizada a las ${ultimaCorridaEn.toLocaleTimeString('es-PE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`}
                </p>
              </>
            ) : (
              <p className="m-0 mt-1 text-lg">
                <strong className="text-3xl">{escaladas.datos?.total ?? '…'}</strong> secciones
                escaladas a revisión
              </p>
            )}
            {resumen && (
              <p className="m-0 mt-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                    resumen.verificacion?.conforme
                      ? 'bg-[#E8F3E9] text-saie-success'
                      : resumen.verificacion
                        ? 'bg-[#FBE9E9] text-saie-danger'
                        : 'bg-white/15 text-white'
                  }`}
                >
                  {resumen.verificacion
                    ? resumen.verificacion.conforme
                      ? `✓ Verificador conforme · ${resumen.verificacion.totalRevisadas} revisadas`
                      : `✗ Verificador no conforme · ${resumen.verificacion.totalViolaciones} violación(es)`
                    : 'Verificador: sin asignaciones que revisar'}
                </span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={correr}
            disabled={corriendo}
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-bold text-saie-primary hover:bg-saie-canvas disabled:cursor-wait disabled:opacity-70"
          >
            {corriendo ? 'Ejecutando…' : 'Ejecutar asignación del periodo'}
          </button>
        </div>
      </section>

      {errorAccion && (
        <AvisoError mensaje={errorAccion.mensaje} onReintentar={errorAccion.reintentar} />
      )}

      {resumen && <VeredictoVerificacion verificacion={resumen.verificacion} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Acceso
          to={RUTAS.cargaAdmin}
          titulo="Carga de datos maestros"
          descripcion="Cursos y secciones, horarios y matrículas."
        />
        <Acceso
          to={RUTAS.espaciosAdmin}
          titulo="Gestión de espacios"
          descripcion="Aulas y laboratorios, aforo y estado."
        />
        <Acceso
          to={RUTAS.alertasAdmin}
          titulo="Alertas de aforo y software"
          descripcion="Casos que requieren atención."
          extra={pendientes ? String(pendientes) : undefined}
        />
        <Acceso
          to={RUTAS.proximamenteAdmin}
          titulo="Próximamente"
          descripcion="Mapa por piso, altas, claves, catálogo y solicitudes de software."
        />
      </div>

      <section aria-labelledby="titulo-escaladas" className="flex flex-col gap-3">
        <h2 id="titulo-escaladas" className="m-0 text-lg font-bold text-saie-text">
          Secciones escaladas a revisión manual
        </h2>
        {escaladas.error && (
          <AvisoError mensaje={escaladas.error} onReintentar={escaladas.recargar} />
        )}
        {escaladas.cargando && !escaladas.datos ? (
          <EsqueletoCarga texto="Cargando secciones escaladas…" />
        ) : escaladas.datos && escaladas.datos.secciones.length === 0 ? (
          <p className="m-0 rounded-xl border border-dashed border-saie-divider bg-white p-6 text-center text-sm text-saie-muted">
            No hay secciones escaladas. ¡Todo asignado!
          </p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {escaladas.datos?.secciones.map((s) => {
              const motivo = describirMotivoEscalamiento(s.motivoEscalamiento);
              const alumnos = s.seccion.alumnosMatriculados;
              return (
                <li
                  key={s.asignacionId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-saie-divider bg-white p-4"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <p className="m-0 font-semibold text-saie-text">
                      {s.seccion.codigoCurso} · {s.seccion.codigoSeccion} — {s.seccion.nombreCurso}
                    </p>
                    <span className="w-fit rounded-full bg-[#FDF0E1] px-2 py-0.5 text-xs font-bold text-[#B45309]">
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
                    <button
                      type="button"
                      onClick={() => reintentar(s.seccion.id)}
                      disabled={reintentando === s.seccion.id}
                      title={
                        motivo.codigo === 'SIN_HORARIOS_DEFINIDOS'
                          ? 'Vuelve a intentar después de cargar el horario'
                          : 'Vuelve a ejecutar la asignación de esta sección'
                      }
                      className="rounded-lg border border-saie-primary px-3 py-1.5 text-sm font-semibold text-saie-primary hover:bg-saie-primary hover:text-white disabled:opacity-60"
                    >
                      {reintentando === s.seccion.id ? 'Reintentando…' : 'Reintentar'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </LayoutAdmin>
  );
};

export const InicioAdmin: React.FC = () => {
  const { sesion } = useAuth();
  return sesion?.rol === 'JEFATURA_LABORATORIOS' ? <InicioJefatura /> : <InicioCoordinacion />;
};

export default InicioAdmin;

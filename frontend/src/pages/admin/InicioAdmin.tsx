import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import LayoutAdmin, { AvisoError } from '../../components/admin/LayoutAdmin';
import { VeredictoVerificacion } from '../../components/admin/VeredictoVerificacion';
import { EsqueletoCarga, EstadoVacio } from '../../components/estudiante/ElementosHorario';
import { Aviso } from '../../components/ui/Aviso';
import { BadgeEstado } from '../../components/ui/BadgeEstado';
import { Boton } from '../../components/ui/Boton';
import { BotonEnlace } from '../../components/ui/BotonEnlace';
import { DialogoConfirmacion } from '../../components/ui/DialogoConfirmacion';
import { Drawer } from '../../components/ui/Drawer';
import { RUTAS } from '../../config/rutas';
import { useAuth } from '../../context/useAuth';
import { useAccion } from '../../hooks/useAccion';
import { useCarga } from '../../hooks/useCarga';
import {
  ejecutarCorrida,
  obtenerAlertas,
  obtenerEscaladas,
  reintentarSeccion,
} from '../../services/admin';
import type {
  ResumenAsignacionDTO,
  ResultadoVerificacionDTO,
  SeccionEscaladaDTO,
} from '../../types/admin';
import { describirMotivoEscalamiento } from '../../utils/admin';
import { formatearFechaCorta } from '../../utils/fechas';
import { plural } from '../../utils/texto';
import { ICONOS } from '../../components/ui/iconos';

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

/** Acceso compacto del tablero: solo icono y título; la descripción vive en la pestaña. */
const Atajo: React.FC<{ to: string; titulo: string; trazo: string }> = ({ to, titulo, trazo }) => (
  <Link
    to={to}
    className="flex min-w-0 items-center gap-2.5 rounded-xl border border-saie-divider bg-white p-2 no-underline transition-colors hover:border-saie-primary"
  >
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-saie-primary/10 text-saie-primary"
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
    <span className="min-w-0 break-words text-sm font-semibold leading-tight text-saie-text">
      {titulo}
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
    <p className={`m-0 text-3xl font-bold leading-none ${tono} tabular-nums`}>{valor}</p>
    <p className="m-0 mt-1 text-xs font-medium text-saie-muted">{etiqueta}</p>
  </div>
);

/** Texto del distintivo del verificador según el resultado de la corrida. */
function textoVerificador(verificacion: ResultadoVerificacionDTO | null): string {
  if (!verificacion) return 'Verificador: sin asignaciones que revisar';
  if (verificacion.conforme) {
    return `Conforme · ${verificacion.totalRevisadas} revisadas`;
  }
  return `No conforme · ${plural(verificacion.totalViolaciones, 'incumplimiento', 'incumplimientos')}`;
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
            <span className="font-mono text-xs">{motivo.codigo}</span>
          </details>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {motivo.accion && (
          <BotonEnlace to={motivo.accion.to} variante="secundario" tamano="sm">
            {motivo.accion.etiqueta}
          </BotonEnlace>
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
      <EstadoVacio
        titulo="Nada por revisar"
        icono={ICONOS.escudo}
        descripcion="No hay secciones pendientes de revisión. Todas tienen un espacio asignado."
      />
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
      <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-rows-[auto_1fr]">
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
              trazo={ICONOS.alerta}
            />
            <Acceso
              to={RUTAS.cambioLaboratorio}
              titulo="Reportar cambio de laboratorio"
              descripcion="Software instalado y PCs malogradas o reparadas."
              trazo={ICONOS.monitor}
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
  const accionCorrida = useAccion();
  const accionSeccion = useAccion();
  const [corriendo, setCorrida] = useState(false);
  const [confirmandoCorrida, setConfirmandoCorrida] = useState(false);
  const [detalleAbierto, setDetalleAbierto] = useState(false);
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
    etiqueta?: string;
  } | null>(null);
  /** El servidor respondió 409: ya hay una corrida en curso (Issue 4.56). */
  const [otraCorrida, setOtraCorrida] = useState(false);

  const pendientes = alertas.datos?.filter((a) => a.estado === 'PENDIENTE').length ?? 0;
  const periodo = escaladas.datos?.periodo ?? resumenCorrida?.periodo ?? '—';
  const secciones = escaladas.datos?.secciones ?? [];

  /** Vuelve a pedir lo que la corrida pudo cambiar y libera el botón si ya no hay otra en curso. */
  function comprobarCorrida() {
    setOtraCorrida(false);
    setErrorAccion(null);
    escaladas.recargar();
    alertas.recargar();
  }

  async function correr() {
    if (corriendo || otraCorrida) return;
    setConfirmandoCorrida(false);
    setResultadoSeccion(null);
    setCorrida(true);
    setErrorAccion(null);
    const resultado = await accionCorrida.ejecutar(
      async () => {
        const resumen = await ejecutarCorrida();
        setResumenCorrida(resumen);
        setUltimaCorrida(new Date().toISOString());
        // La corrida crea y resuelve alertas: hay que volver a pedirlas, no solo las escaladas.
        escaladas.recargar();
        alertas.recargar();
      },
      // El error se muestra en línea, con su «Reintentar».
      { avisarError: false },
    );
    if (resultado && !resultado.ok) {
      if (resultado.estado === 409) {
        // Otra corrida sigue en curso: no se lanza una segunda hasta comprobarlo.
        setOtraCorrida(true);
        setErrorAccion({
          mensaje: resultado.error,
          reintentar: comprobarCorrida,
          etiqueta: 'Comprobar de nuevo',
        });
      } else if (resultado.tiempoAgotado) {
        // No se afirma que falló: pudo terminar. Se ofrece actualizar, no repetirla.
        setErrorAccion({
          mensaje: resultado.error,
          reintentar: comprobarCorrida,
          etiqueta: 'Actualizar',
        });
      } else {
        setErrorAccion({ mensaje: resultado.error, reintentar: correr });
      }
    }
    setCorrida(false);
  }

  async function reintentar(seccion: SeccionEscaladaDTO) {
    if (reintentando) return;
    setReintentando(seccion.seccion.id);
    setErrorAccion(null);
    const resultado = await accionSeccion.ejecutar(
      async () => {
        // El resultado de una sección no es la corrida del periodo: se muestra aparte.
        const resumen = await reintentarSeccion(seccion.seccion.id);
        setResultadoSeccion({ resumen, seccion });
        escaladas.recargar();
        alertas.recargar();
      },
      { avisarError: false },
    );
    if (resultado && !resultado.ok) {
      setErrorAccion({ mensaje: resultado.error, reintentar: () => reintentar(seccion) });
    }
    setReintentando(null);
  }

  return (
    <LayoutAdmin dashboard titulo="Área administrativa" subtitulo="Coordinación Académica">
      {/*
        El tablero ocupa lo que queda del `main` (que es una columna flex) una vez descontados
        el título y los espacios. Antes iba con `lg:h-full`, que sumaba el 100 % de `main` al
        título y desbordaba: `main` recorta con `lg:overflow-hidden` y la última fila quedaba
        inalcanzable, sin scroll para recuperarla.
      */}
      <div
        aria-busy={corriendo}
        className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-rows-[auto_auto_1fr]"
      >
        {/* FILA 1 — las cuatro cifras que resumen la asignación */}
        <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 lg:grid-cols-4">
          <li>
            <Metrica
              valor={resumenCorrida?.asignadas ?? '—'}
              etiqueta="Con aula nueva"
              tono="text-saie-success-strong"
            />
          </li>
          <li>
            <Metrica valor={resumenCorrida?.mantenidas ?? '—'} etiqueta="Conservan la suya" />
          </li>
          <li>
            <Metrica
              valor={resumenCorrida?.escaladas ?? escaladas.datos?.total ?? '—'}
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
          {/*
            La tarjeta guinda se estira hasta la altura de la del verificador, que es la que
            crece al abrir el detalle de las reglas. Por eso reparte su contenido con
            `justify-between`: el estado arriba y la acción abajo. Antes llevaba
            `justify-center` y el texto quedaba flotando en medio de un bloque vacío de color.
          */}
          <section
            aria-label="Estado de la asignación"
            className="flex flex-col justify-between gap-3 rounded-2xl bg-gradient-to-br from-saie-primary to-saie-primary-dark p-4 text-white lg:col-span-8"
          >
            <div className="min-w-0">
              <p className="m-0 text-xs text-white/80">Asignación de aulas · Periodo {periodo}</p>
              <p role="status" aria-live="polite" className="m-0 mt-0.5 text-sm">
                {resumenCorrida
                  ? `${resumenCorrida.asignadas} con aula nueva · ${resumenCorrida.mantenidas} conservan la suya · ${resumenCorrida.escaladas} de ${resumenCorrida.totalSecciones} esperan revisión`
                  : escaladas.datos
                    ? `${plural(escaladas.datos.total, 'sección espera', 'secciones esperan')} revisión`
                    : 'Consultando las secciones…'}
              </p>
              {ultimaCorrida && (
                <p className="m-0 mt-1 text-xs text-white/75">
                  Última actualización: {formatearFechaCorta(ultimaCorrida)}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Boton
                  variante="secundario"
                  onClick={() => setConfirmandoCorrida(true)}
                  disabled={corriendo || otraCorrida}
                  aria-describedby="motivo-corrida"
                  cargando={corriendo}
                  textoCargando="Asignando…"
                  className="border-white! bg-white! text-saie-primary! hover:bg-saie-canvas!"
                >
                  Asignar aulas del periodo
                </Boton>
              </div>
              <p id="motivo-corrida" className="m-0 text-right text-xs text-white/85">
                {corriendo
                  ? 'Esto puede tardar hasta 1 min. No cierres esta pantalla.'
                  : otraCorrida
                    ? 'Hay otra asignación en curso. Espera a que termine y pulsa «Comprobar de nuevo».'
                    : ''}
              </p>
            </div>
          </section>

          <section
            aria-label="Veredicto del verificador"
            className="flex flex-col gap-2 rounded-2xl border border-saie-divider bg-white p-4 lg:col-span-4"
          >
            <h2 className="m-0 text-sm font-bold text-saie-text">Comprobación de la asignación</h2>
            {resumenCorrida ? (
              <>
                <p className="m-0 text-xs text-saie-muted">
                  {resumenCorrida.verificacion
                    ? `${resumenCorrida.verificacion.totalRevisadas} asignaciones revisadas contra las 7 reglas de asignación.`
                    : 'Esta asignación no dejó resultados que comprobar.'}
                </p>
                <span
                  className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${claseVerificador(resumenCorrida.verificacion)}`}
                >
                  {textoVerificador(resumenCorrida.verificacion)}
                </span>
                {/* El detalle de las siete reglas abre un drawer: el tablero no crece y no se
                    esconde tras un scroll dentro de la tarjeta. Se muestra también sin
                    verificación para explicar que no hubo nada que revisar. */}
                <Boton
                  variante="secundario"
                  tamano="sm"
                  onClick={() => setDetalleAbierto(true)}
                  className="w-fit!"
                >
                  Ver el detalle de las reglas
                </Boton>
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
              <AvisoError
                mensaje={errorAccion.mensaje}
                onReintentar={errorAccion.reintentar}
                etiquetaAccion={errorAccion.etiqueta}
              />
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

          {/*
            La columna derecha solo tiene los accesos: «Requieren tu atención» repetía las dos
            cifras que ya están en la fila de métricas y obligaba a ocultar la columna tras un
            scroll propio para que el tablero cabiera en 1280×800. La grilla de dos columnas
            deja los cinco accesos a la vista sin scroll alguno.
          */}
          <section
            aria-labelledby="titulo-accesos"
            className="flex min-h-0 flex-col gap-2 rounded-2xl border border-saie-divider bg-white p-4 lg:col-span-4"
          >
            <h2 id="titulo-accesos" className="m-0 text-sm font-bold text-saie-text">
              Accesos
            </h2>
            <div className="grid min-h-0 gap-2 sm:grid-cols-2 lg:grid-cols-2">
              <Atajo to={RUTAS.cargaAdmin} titulo="Carga de datos" trazo={ICONOS.subir} />
              <Atajo to={RUTAS.espaciosAdmin} titulo="Espacios" trazo={ICONOS.edificio} />
              <Atajo to={RUTAS.seccionesAdmin} titulo="Secciones" trazo={ICONOS.libro} />
              <Atajo to={RUTAS.auditoriaAdmin} titulo="Auditoría" trazo={ICONOS.portapapeles} />
              <Atajo
                to={RUTAS.reporteSalonesAdmin}
                titulo="Informe de salones"
                trazo={ICONOS.documento}
              />
              {/*
                Atajo a las alertas: la tarjeta «Requieren tu atención» repetía las dos cifras
                de la fila de métricas; queda solo el enlace a la lista completa.
              */}
              <Link
                to={RUTAS.alertasAdmin}
                className="flex items-center justify-between gap-3 rounded-xl border border-saie-danger/30 bg-saie-danger-soft py-2.5 pl-4 pr-3 no-underline transition-colors hover:border-saie-danger sm:col-span-2"
              >
                <span className="flex items-center gap-2 text-sm font-bold text-saie-danger-strong">
                  <span>Alertas pendientes</span>
                  <strong className="text-lg leading-none">{pendientes}</strong>
                </span>
                <span className="text-xs font-semibold text-saie-danger-strong">Ver alertas →</span>
              </Link>
            </div>
          </section>
        </div>
      </div>

      {/*
        El detalle de las siete reglas vive en un drawer: es información de consulta que
        aparece a petición, no algo que deba caber en el tablero. El drawer trae consigo el
        cierre con Escape, el foco atrapado y el bloqueo del scroll del fondo.
      */}
      <DialogoConfirmacion
        abierto={confirmandoCorrida}
        titulo="¿Asignar las aulas del periodo?"
        descripcion={`Se volverán a asignar las aulas de las secciones del periodo ${periodo}. Las asignaciones que siguen siendo válidas se conservan y no se duplican aulas.`}
        textoConfirmar="Sí, asignar aulas"
        cargando={corriendo}
        textoCargando="Asignando…"
        onConfirmar={correr}
        onCancelar={() => setConfirmandoCorrida(false)}
      />

      <Drawer
        abierto={detalleAbierto}
        onCerrar={() => setDetalleAbierto(false)}
        titulo="Veredicto del verificador"
      >
        <VeredictoVerificacion verificacion={resumenCorrida?.verificacion ?? null} ocultarTitulo />
      </Drawer>
    </LayoutAdmin>
  );
};

export const InicioAdmin: React.FC = () => {
  const { sesion } = useAuth();
  return sesion?.rol === 'JEFATURA_LABORATORIOS' ? <InicioJefatura /> : <InicioCoordinacion />;
};

export default InicioAdmin;

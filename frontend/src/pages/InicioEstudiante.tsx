import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeEstadoClase,
  BarraProgresoClase,
  EsqueletoCarga,
  EstadoVacio,
  PuntoEnVivo,
} from '../components/estudiante/ElementosHorario';
import LayoutEstudiante from '../components/estudiante/LayoutEstudiante';
import { BotonEnlace } from '../components/ui/BotonEnlace';
import { EstadoError } from '../components/ui/EstadoError';
import { RUTAS } from '../config/rutas';
import { obtenerHorario } from '../services/estudiante';
import { mensajeDeError } from '../services/estudiante';
import type { DiaSemana } from '../types/consulta';
import type { HorarioSemanalDTO, SesionDTO } from '../types/horario';
import { fechaLarga } from '../utils/fechas';
import {
  DIAS_LECTIVOS,
  ETIQUETA_DIA,
  PALETA_CURSOS,
  asignarColoresCursos,
  cuentaRegresiva,
  diaDeFecha,
  estadoDeClase,
  fechaActual,
  formatearRango,
  minutosDeFecha,
  ordenarSesiones,
  progresoClase,
  proximoDiaConClases,
  resumenSemana,
  resumenUbicacion,
  saludoSegunHora,
  sesionesDeDia,
  todasLasSesiones,
} from '../utils/horario';

const UN_MINUTO_MS = 60_000;

/** Clase en curso o, si ninguna ha empezado, la próxima de hoy. */
function claseDestacada(sesiones: SesionDTO[], ahoraEnMinutos: number): SesionDTO | null {
  return sesiones.find((s) => estadoDeClase(s, ahoraEnMinutos) !== 'FINALIZADA') ?? null;
}

interface ProximoDia {
  dia: DiaSemana;
  sesiones: SesionDTO[];
}

/** Barra gris translúcida sobre la tarjeta guinda (el esqueleto claro no se vería). */
const BARRA_SOBRE_GUINDA = 'rounded bg-white/20';

/**
 * Saludo y la clase en curso o la próxima, en una sola banda.
 *
 * Mientras llega el horario no se sabe si hay clases: decir «Hoy no tienes clases» sería falso.
 * Se muestra un esqueleto, y si el horario no se pudo cargar, un texto neutro.
 */
const TarjetaProxima: React.FC<{
  sesion: SesionDTO | null;
  hayClasesHoy: boolean;
  proximoDia: ProximoDia | null;
  ahora: number;
  carga: 'cargando' | 'error' | 'listo';
}> = ({ sesion, hayClasesHoy, proximoDia, ahora, carga }) => {
  if (carga === 'cargando') {
    return (
      <div role="status" aria-busy="true" className="flex flex-col gap-3">
        <span className="sr-only">Cargando tu horario…</span>
        <div aria-hidden="true" className="flex flex-col gap-3">
          <span className={`${BARRA_SOBRE_GUINDA} saie-pulso h-4 w-1/3`} />
          <span className={`${BARRA_SOBRE_GUINDA} saie-pulso h-7 w-2/3`} />
          <span className={`${BARRA_SOBRE_GUINDA} saie-pulso h-4 w-1/2`} />
        </div>
      </div>
    );
  }
  if (carga === 'error') {
    return (
      <div className="flex h-full flex-col justify-center gap-2">
        <h2 className="m-0 font-serif text-xl font-bold">No pudimos mostrar tu clase</h2>
        <p className="m-0 text-sm text-white/85">
          Tu horario no se cargó. Reintenta abajo o consúltalo en «Horario».
        </p>
      </div>
    );
  }
  if (!sesion) {
    const primera = proximoDia?.sesiones[0] ?? null;
    return (
      <div className="flex h-full flex-col justify-center gap-2">
        <h2 className="m-0 font-serif text-xl font-bold">
          {hayClasesHoy ? 'Ya terminaron tus clases de hoy' : 'Hoy no tienes clases'}
        </h2>
        {primera && proximoDia ? (
          <p className="m-0 text-sm text-white/85">
            {`Lo siguiente: ${ETIQUETA_DIA[proximoDia.dia].toLowerCase()} a las ${formatearRango(
              primera.horaInicio,
              primera.horaFin,
            )}, ${primera.nombreCurso}.`}
          </p>
        ) : (
          <p className="m-0 text-sm text-white/85">
            Aprovecha para revisar tu horario de la semana o ubicar tus aulas en el mapa.
          </p>
        )}
      </div>
    );
  }

  const estado = estadoDeClase(sesion, ahora);
  const enCurso = estado === 'EN_CURSO';

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="m-0 flex items-center gap-2 text-sm font-bold text-white/85">
          {enCurso && <PuntoEnVivo />}
          {enCurso ? 'Clase en curso' : 'Tu próxima clase'}
        </p>
        <BadgeEstadoClase estado={estado} />
      </div>
      <h2 className="m-0 font-serif text-2xl font-bold leading-8">{sesion.nombreCurso}</h2>
      <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-white/90">
        <li className="flex items-center gap-2">
          <span className="font-medium">{formatearRango(sesion.horaInicio, sesion.horaFin)}</span>
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold">
            {cuentaRegresiva(sesion, ahora)}
          </span>
        </li>
        <li className="flex items-center gap-2">{resumenUbicacion(sesion.espacios)}</li>
      </ul>
      {enCurso && <BarraProgresoClase valor={progresoClase(sesion, ahora)} />}
    </div>
  );
};

/** «6 clases esta semana, en 3 días»: la carga de la semana en una frase. */
function resumenDeSemana(horario: HorarioSemanalDTO): string {
  const r = resumenSemana(horario);
  const dias = r.diasConClase === 1 ? '1 día' : `${r.diasConClase} días`;
  return `${r.clases} ${r.clases === 1 ? 'clase' : 'clases'} esta semana, en ${dias}`;
}

/** La semana de lunes a sábado, un día por fila: cuántas clases hay y cuál es hoy. */
const SemanaDeUnVistazo: React.FC<{ horario: HorarioSemanalDTO; hoy: DiaSemana }> = ({
  horario,
  hoy,
}) => (
  <section
    aria-labelledby="titulo-semana"
    className="flex min-w-0 flex-col gap-3 rounded-2xl border border-saie-divider bg-white p-4"
  >
    <div>
      <h2 id="titulo-semana" className="m-0 text-base font-bold text-saie-text">
        Tu semana de un vistazo
      </h2>
      <p className="m-0 mt-0.5 text-sm text-saie-muted">{resumenDeSemana(horario)}</p>
    </div>
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {DIAS_LECTIVOS.map((d) => {
        const cantidad = (horario.dias[d] ?? []).length;
        const esHoy = d === hoy;
        return (
          <li key={d}>
            <Link
              to={RUTAS.horarioAlumno}
              aria-label={`${ETIQUETA_DIA[d]}${esHoy ? ', hoy' : ''}, ${
                cantidad === 1 ? '1 clase' : `${cantidad} clases`
              }`}
              className={`flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 text-sm no-underline transition-colors duration-200 ${
                esHoy
                  ? 'bg-saie-primary font-bold text-white'
                  : cantidad === 0
                    ? 'text-saie-muted hover:bg-saie-primary/5'
                    : 'font-medium text-saie-text hover:bg-saie-primary/5'
              }`}
            >
              <span aria-hidden="true">
                {ETIQUETA_DIA[d]}
                {esHoy && <span className="ml-2 text-xs font-medium opacity-85">hoy</span>}
              </span>
              <span aria-hidden="true" className="tabular-nums">
                {cantidad === 0 ? 'Sin clases' : cantidad === 1 ? '1 clase' : `${cantidad} clases`}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  </section>
);

/** Esqueleto de «El resto de tu día» mientras llega el horario. */
const EsqueletoDelDia: React.FC = () => (
  <section aria-label="Cargando tus clases" className="flex flex-col gap-2">
    <EsqueletoCarga texto="Cargando tus clases del día…" filas={3} />
  </section>
);

/** Esqueleto del panel de la semana: mismas seis filas que el real, para que nada salte. */
const EsqueletoSemana: React.FC = () => (
  <section
    aria-hidden="true"
    className="flex min-w-0 flex-col gap-3 rounded-2xl border border-saie-divider bg-white p-4"
  >
    <div className="flex flex-col gap-2">
      <span className="saie-esqueleto h-4 w-2/3 rounded" />
      <span className="saie-esqueleto h-3 w-1/2 rounded" />
    </div>
    <div className="flex flex-col gap-1">
      {DIAS_LECTIVOS.map((d) => (
        <span key={d} className="saie-esqueleto block h-11 rounded-lg" />
      ))}
    </div>
  </section>
);

/** Cuántas clases se listan antes de indicar que hay más (el resto está en «Mi horario»). */
const MAX_CLASES_VISIBLES = 4;

/** Las clases del día, en una lista vertical con su estado (Issue 3.38). */
const ListaDeClases: React.FC<{
  titulo: string;
  /** Texto breve a la derecha del título, p. ej. cuántas clases quedan. */
  nota?: string;
  sesiones: SesionDTO[];
  horario: HorarioSemanalDTO;
  /** Minutos desde las 00:00; si es null las clases son de otro día y no llevan estado. */
  ahora: number | null;
}> = ({ titulo, nota, sesiones, horario, ahora }) => {
  const visibles = sesiones.slice(0, MAX_CLASES_VISIBLES);
  const ocultas = sesiones.length - visibles.length;
  const colores = useMemo(
    () => asignarColoresCursos(todasLasSesiones(horario).map((s) => s.codigoCurso)),
    [horario],
  );
  if (sesiones.length === 0) return null;
  return (
    <section aria-labelledby="titulo-hoy" className="flex min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 id="titulo-hoy" className="m-0 text-base font-bold text-saie-text">
          {titulo}
        </h2>
        {nota && <p className="m-0 text-sm text-saie-muted">{nota}</p>}
      </div>
      <ol className="saie-stagger m-0 flex min-h-0 list-none flex-col gap-2 p-0 pb-1">
        {visibles.map((s) => {
          const estado = ahora === null ? null : estadoDeClase(s, ahora);
          const color = colores[s.codigoCurso] ?? PALETA_CURSOS[0];
          return (
            <li
              key={`${s.seccionId}-${s.horaInicio}`}
              className={`flex w-full flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-saie-divider bg-white px-4 py-3 ${
                estado === 'FINALIZADA' ? 'opacity-60' : ''
              }`}
            >
              <span className="w-28 shrink-0 text-sm font-bold tabular-nums text-saie-muted">
                {formatearRango(s.horaInicio, s.horaFin)}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-2 text-sm font-bold leading-5">
                  {/* El color del curso es el mismo en todas las pantallas (Issue 3.40). */}
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color.borde }}
                  />
                  {s.nombreCurso}
                </span>
                <span className="text-sm text-saie-muted">{resumenUbicacion(s.espacios)}</span>
              </span>
              {estado && (
                <span className="flex flex-col gap-1.5">
                  <BadgeEstadoClase estado={estado} />
                  {estado === 'EN_CURSO' && ahora !== null && (
                    <BarraProgresoClase valor={progresoClase(s, ahora)} />
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {ocultas > 0 && (
        <Link to={RUTAS.horarioAlumno} className="text-sm font-semibold text-saie-primary">
          {ocultas === 1 ? 'Hay 1 clase más' : `Hay ${ocultas} clases más`}: ver mi horario
        </Link>
      )}
    </section>
  );
};

/**
 * Issue 3.29 — inicio del área del estudiante, en modo tablero.
 *
 * Todo lo importante cabe en una pantalla: la clase en curso o la próxima, el resto del día y la
 * semana de un vistazo. Las demás secciones están a un clic en la barra de navegación, que ya las
 * lista todas: el inicio no las repite.
 */
export const InicioEstudiante: React.FC = () => {
  const [horario, setHorario] = useState<HorarioSemanalDTO | null>(null);
  const [cargandoHorario, setCargandoHorario] = useState(true);
  const [errorHorario, setErrorHorario] = useState<string | null>(null);
  const [ahora, setAhora] = useState<Date>(fechaActual);

  /**
   * Encadena la respuesta del horario a los estados de la pantalla. Los cambios de estado
   * ocurren al resolverse la petición, nunca de forma síncrona.
   */
  const aplicarHorario = useCallback((peticion: Promise<HorarioSemanalDTO>) => {
    peticion
      .then((h) => {
        setHorario(h);
        setErrorHorario(null);
      })
      .catch((e: unknown) => {
        setHorario(null);
        setErrorHorario(mensajeDeError(e));
      })
      .finally(() => {
        setCargandoHorario(false);
      });
  }, []);

  useEffect(() => {
    let activo = true;
    obtenerHorario()
      .then((h) => {
        if (activo) setHorario(h);
      })
      .catch((e: unknown) => {
        // Sin horario no pasa nada: se muestran solo los accesos.
        if (activo) setErrorHorario(mensajeDeError(e));
      })
      .finally(() => {
        if (activo) setCargandoHorario(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  /** Vuelve a pedir el horario tras un fallo. */
  const reintentarHorario = () => {
    setCargandoHorario(true);
    setErrorHorario(null);
    aplicarHorario(obtenerHorario());
  };

  // Mantiene al día «Empieza en…» y los estados de las clases.
  useEffect(() => {
    const temporizador = setInterval(() => setAhora(fechaActual()), UN_MINUTO_MS);
    return () => clearInterval(temporizador);
  }, []);

  const minutos = minutosDeFecha(ahora);
  const hoy = diaDeFecha(ahora);
  const sesionesHoy = useMemo(
    () => (horario ? ordenarSesiones(sesionesDeDia(horario, hoy)) : []),
    [horario, hoy],
  );
  const destacada = claseDestacada(sesionesHoy, minutos);
  const proximoDia = horario && !destacada ? proximoDiaConClases(horario, hoy) : null;
  const hayClases = horario ? todasLasSesiones(horario).length > 0 : false;
  // La clase destacada ya está en la tarjeta guinda: la lista muestra solo las siguientes.
  const claveDestacada = destacada ? `${destacada.seccionId}-${destacada.horaInicio}` : null;
  const siguientesHoy = sesionesHoy.filter(
    (s) => `${s.seccionId}-${s.horaInicio}` !== claveDestacada,
  );
  const quedanHoy = sesionesHoy.filter((s) => estadoDeClase(s, minutos) !== 'FINALIZADA').length;
  // Sin horario todavía no se sabe si hay clases: se muestra un esqueleto, nunca «no tienes clases».
  const cargando = cargandoHorario && !horario && !errorHorario;
  const estadoTarjeta = cargando
    ? 'cargando'
    : horario
      ? 'listo'
      : errorHorario
        ? 'error'
        : 'listo';
  const mostrarSemana = cargando || Boolean(horario && hayClases);

  return (
    <LayoutEstudiante
      dashboard
      titulo="Área del estudiante"
      subtitulo={horario?.periodo ? `Periodo lectivo ${horario.periodo}` : undefined}
    >
      {/*
        El tablero ocupa lo que queda del `main` tras el título. Una columna principal, en el orden
        en que se decide (qué toca ahora, qué sigue hoy), y la semana al costado como referencia.
      */}
      <div
        className={`grid grid-cols-1 gap-6 lg:min-h-0 lg:flex-1 lg:items-start ${
          mostrarSemana ? 'lg:grid-cols-12' : ''
        }`}
      >
        <div
          className={`flex min-h-0 min-w-0 flex-col gap-6 ${mostrarSemana ? 'lg:col-span-8' : ''}`}
        >
          <section
            aria-label="Tu próxima clase"
            className="flex min-w-0 flex-col gap-3 rounded-2xl bg-gradient-to-br from-saie-primary to-saie-primary-dark p-5 text-white"
          >
            <p className="m-0 text-sm text-white/80">
              {saludoSegunHora(ahora)} · {fechaLarga(ahora)}
            </p>
            <TarjetaProxima
              sesion={destacada}
              hayClasesHoy={sesionesHoy.length > 0}
              proximoDia={proximoDia}
              ahora={minutos}
              carga={estadoTarjeta}
            />
          </section>

          {errorHorario && (
            <EstadoError
              mensaje={`No pudimos cargar tu horario. ${errorHorario}`}
              onReintentar={reintentarHorario}
            />
          )}

          {cargando ? (
            <EsqueletoDelDia />
          ) : horario && hayClases ? (
            sesionesHoy.length > 0 ? (
              siguientesHoy.length > 0 ? (
                <ListaDeClases
                  titulo={destacada ? 'El resto de tu día' : 'Tu día de hoy'}
                  nota={
                    quedanHoy === 1 ? 'Te queda 1 clase hoy' : `Te quedan ${quedanHoy} clases hoy`
                  }
                  sesiones={siguientesHoy}
                  horario={horario}
                  ahora={minutos}
                />
              ) : (
                <p className="m-0 rounded-xl border border-dashed border-saie-divider bg-white p-3 text-sm text-saie-muted">
                  Después de esta, no tienes más clases hoy.
                </p>
              )
            ) : (
              proximoDia && (
                <ListaDeClases
                  titulo={`Lo que viene el ${ETIQUETA_DIA[proximoDia.dia].toLowerCase()}`}
                  sesiones={proximoDia.sesiones}
                  horario={horario}
                  ahora={null}
                />
              )
            )
          ) : (
            !cargandoHorario && (
              <EstadoVacio
                titulo="Sin clases todavía"
                descripcion="Cuando se asignen las aulas de tus cursos, aquí verás tus clases del día."
                accion={
                  <BotonEnlace to={RUTAS.horarioAlumno} variante="secundario" tamano="sm">
                    Ver mi horario
                  </BotonEnlace>
                }
              />
            )
          )}
        </div>

        {mostrarSemana && (
          <div className="min-w-0 lg:col-span-4">
            {horario ? <SemanaDeUnVistazo horario={horario} hoy={hoy} /> : <EsqueletoSemana />}
          </div>
        )}
      </div>
    </LayoutEstudiante>
  );
};

export default InicioEstudiante;

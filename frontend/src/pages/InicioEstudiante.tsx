import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BadgeEstadoClase,
  BarraProgresoClase,
  Icono,
  PuntoEnVivo,
} from '../components/estudiante/ElementosHorario';
import LayoutEstudiante from '../components/estudiante/LayoutEstudiante';
import { RUTAS } from '../config/rutas';
import { useAuth } from '../context/useAuth';
import { obtenerHorario } from '../services/estudiante';
import { mensajeDeError } from '../services/estudiante';
import type { DiaSemana } from '../types/consulta';
import type { HorarioSemanalDTO, SesionDTO } from '../types/horario';
import {
  ABREVIATURA_DIA,
  DIAS_LECTIVOS,
  ETIQUETA_DIA,
  PALETA_CURSOS,
  asignarColoresCursos,
  cuentaRegresiva,
  diaDeFecha,
  estadoDeClase,
  fechaActual,
  fechaLarga,
  formatearMinutos,
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

const TRAZO_ALERTA = 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
const TRAZO_CALENDARIO =
  'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5';
const TRAZO_PERFIL =
  'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z';
const TRAZO_MAPA =
  'M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.19.69-.19 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z';
const TRAZO_RUTA =
  'M9 6.75V15m6-6v8.25m0 0a3 3 0 11-6 0 3 3 0 016 0zM15 9.75a3 3 0 11-6 0 3 3 0 016 0z';
const TRAZO_TELEGRAM =
  'M6 12 3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L5.999 12Z';

const UN_MINUTO_MS = 60_000;

/** Clase en curso o, si ninguna ha empezado, la próxima de hoy. */
function claseDestacada(sesiones: SesionDTO[], ahoraEnMinutos: number): SesionDTO | null {
  return sesiones.find((s) => estadoDeClase(s, ahoraEnMinutos) !== 'FINALIZADA') ?? null;
}

interface ProximoDia {
  dia: DiaSemana;
  sesiones: SesionDTO[];
}

/** Saludo y la clase en curso o la próxima, en una sola banda. */
const TarjetaProxima: React.FC<{
  sesion: SesionDTO | null;
  hayClasesHoy: boolean;
  proximoDia: ProximoDia | null;
  ahora: number;
}> = ({ sesion, hayClasesHoy, proximoDia, ahora }) => {
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

interface DatoResumen {
  valor: string;
  etiqueta: string;
}

/** Las cuatro cifras de la semana, en una rejilla de 2×2. */
function datosResumen(horario: HorarioSemanalDTO): DatoResumen[] {
  const r = resumenSemana(horario);
  return [
    {
      valor: String(r.clases),
      etiqueta: r.clases === 1 ? 'clase por semana' : 'clases por semana',
    },
    {
      valor: String(r.cursos),
      etiqueta: r.cursos === 1 ? 'curso matriculado' : 'cursos matriculados',
    },
    {
      valor: String(r.diasConClase),
      etiqueta: r.diasConClase === 1 ? 'día con clases' : 'días con clases',
    },
    { valor: formatearMinutos(r.minutos), etiqueta: 'de clase a la semana' },
  ];
}

/** Tira de lunes a sábado: cuántas clases hay cada día y cuál es hoy. */
const SemanaDeUnVistazo: React.FC<{ horario: HorarioSemanalDTO; hoy: DiaSemana }> = ({
  horario,
  hoy,
}) => (
  <section aria-labelledby="titulo-semana" className="flex flex-col gap-2">
    <h2 id="titulo-semana" className="m-0 text-sm font-bold text-saie-text">
      Tu semana de un vistazo
    </h2>
    <ul className="saie-stagger m-0 grid list-none grid-cols-6 gap-2 p-0">
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
              className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-center no-underline transition-all duration-200 hover:-translate-y-0.5 ${
                esHoy
                  ? 'border-saie-primary bg-saie-primary text-white'
                  : 'border-saie-divider bg-white text-saie-text'
              }`}
            >
              <span aria-hidden="true" className="text-xs font-bold">
                {ABREVIATURA_DIA[d]}
              </span>
              <span aria-hidden="true" className="font-serif text-xl font-bold leading-none">
                {cantidad}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  </section>
);

/** Las clases del día, en tarjetas horizontales con su estado. */
const ListaDeClases: React.FC<{
  titulo: string;
  sesiones: SesionDTO[];
  horario: HorarioSemanalDTO;
  /** Minutos desde las 00:00; si es null las clases son de otro día y no llevan estado. */
  ahora: number | null;
}> = ({ titulo, sesiones, horario, ahora }) => {
  const colores = useMemo(
    () => asignarColoresCursos(todasLasSesiones(horario).map((s) => s.codigoCurso)),
    [horario],
  );
  if (sesiones.length === 0) return null;
  return (
    <section aria-labelledby="titulo-hoy" className="flex min-h-0 flex-col gap-2">
      <h2 id="titulo-hoy" className="m-0 text-sm font-bold text-saie-text">
        {titulo}
      </h2>
      <ol className="saie-stagger m-0 flex list-none gap-3 overflow-x-auto p-0 pb-1 lg:overflow-y-auto">
        {sesiones.map((s) => {
          const estado = ahora === null ? null : estadoDeClase(s, ahora);
          const color = colores[s.codigoCurso] ?? PALETA_CURSOS[0];
          return (
            <li
              key={`${s.seccionId}-${s.horaInicio}`}
              className={`flex w-56 shrink-0 flex-col gap-1 rounded-xl border border-l-4 border-saie-divider bg-white p-3 shadow-[0_2px_8px_rgba(34,34,34,0.06)] ${
                estado === 'FINALIZADA' ? 'opacity-60' : ''
              }`}
              style={{ borderLeftColor: color.borde }}
            >
              <span className="text-xs font-bold text-saie-muted">
                {formatearRango(s.horaInicio, s.horaFin)}
              </span>
              <span className="text-sm font-bold leading-5">{s.nombreCurso}</span>
              <span className="text-xs text-saie-muted">{resumenUbicacion(s.espacios)}</span>
              {estado && (
                <span className="mt-1 flex flex-col gap-1.5">
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
    </section>
  );
};

/** Acceso rápido a cada sección del portal: es lo que evita volver al inicio. */
const ACCESOS = [
  {
    to: RUTAS.horarioAlumno,
    titulo: 'Mi horario',
    descripcion: 'Tu semana completa',
    trazo: TRAZO_CALENDARIO,
  },
  {
    to: RUTAS.perfilAlumno,
    titulo: 'Mi perfil',
    descripcion: 'Datos y ficha médica',
    trazo: TRAZO_PERFIL,
  },
  {
    to: RUTAS.mapaAlumno,
    titulo: 'Mapa',
    descripcion: 'Ubica tus aulas',
    trazo: TRAZO_MAPA,
  },
  {
    to: RUTAS.rutaAlumno,
    titulo: 'Ruta',
    descripcion: 'Cómo llegar a tu aula',
    trazo: TRAZO_RUTA,
  },
  {
    to: RUTAS.telegramAlumno,
    titulo: 'Telegram',
    descripcion: 'Avisos de cambios',
    trazo: TRAZO_TELEGRAM,
  },
];

/**
 * Issue 3.29 — inicio del área del estudiante, en modo tablero.
 *
 * Todo lo importante cabe en una pantalla: la clase en curso o la próxima, las cifras de la
 * semana, las clases de hoy y el acceso a cada sección. Lo demás vive en sus propias
 * pantallas, a un clic desde la barra de navegación.
 */
export const InicioEstudiante: React.FC = () => {
  const { sesion } = useAuth();
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
  const proximoDia = useMemo(
    () => (horario && !destacada ? proximoDiaConClases(horario, hoy) : null),
    [horario, hoy, destacada],
  );
  const hayClases = horario ? todasLasSesiones(horario).length > 0 : false;
  const resumen = horario ? datosResumen(horario) : [];

  return (
    <LayoutEstudiante
      dashboard
      titulo="Área del estudiante"
      subtitulo={horario?.periodo ? `Periodo lectivo ${horario.periodo}` : undefined}
    >
      <div className="grid gap-4 lg:h-full lg:min-h-0 lg:grid-rows-[auto_1fr_auto]">
        {/* FILA 1 — la clase en curso o la próxima y las cifras de la semana */}
        <div className="grid gap-4 lg:grid-cols-12">
          <section
            aria-label="Tu próxima clase"
            className="flex flex-col gap-3 rounded-2xl bg-gradient-to-br from-saie-primary to-saie-primary-dark p-4 text-white lg:col-span-7"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="m-0 text-xs text-white/80">{fechaLarga(ahora)}</p>
                <p className="m-0 font-serif text-2xl font-bold leading-8">
                  {saludoSegunHora(ahora)}
                </p>
              </div>
              {sesion?.rol && (
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                  {sesion.rol}
                </span>
              )}
            </div>
            <TarjetaProxima
              sesion={destacada}
              hayClasesHoy={sesionesHoy.length > 0}
              proximoDia={proximoDia}
              ahora={minutos}
            />
          </section>

          <div className="grid grid-cols-2 gap-3 lg:col-span-5 lg:grid-cols-2">
            {cargandoHorario && !horario ? (
              [0, 1, 2, 3].map((n) => (
                <div
                  key={n}
                  aria-hidden="true"
                  className="saie-esqueleto h-[68px] rounded-xl border border-saie-divider"
                />
              ))
            ) : hayClases ? (
              resumen.map((d) => (
                <div
                  key={d.etiqueta}
                  className="rounded-xl border border-saie-divider bg-white p-3 shadow-[0_2px_8px_rgba(34,34,34,0.06)]"
                >
                  <p className="m-0 font-serif text-2xl font-bold leading-none">{d.valor}</p>
                  <p className="m-0 mt-1 text-xs font-medium text-saie-muted">{d.etiqueta}</p>
                </div>
              ))
            ) : (
              <div className="col-span-2 rounded-xl border border-dashed border-saie-divider bg-white p-3">
                <p className="m-0 text-sm font-bold text-saie-text">Sin clases todavía</p>
                <p className="m-0 mt-0.5 text-xs text-saie-muted">
                  Cuando se asignen las aulas de tus cursos, aquí verás tus cifras de la semana.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* FILA 2 — las clases de hoy y el acceso rápido a cada sección */}
        <div className="grid min-h-0 gap-4 lg:grid-cols-12">
          <div className="flex min-h-0 flex-col gap-3 lg:col-span-8">
            {errorHorario && (
              <div
                role="alert"
                className="flex flex-col items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-saie-danger"
              >
                <p className="m-0 flex items-start gap-2">
                  <Icono trazo={TRAZO_ALERTA} className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>{`No pudimos cargar tu horario. ${errorHorario}`}</span>
                </p>
                <button
                  type="button"
                  onClick={reintentarHorario}
                  className="min-h-11 cursor-pointer rounded-xl bg-saie-primary px-5 text-sm font-medium text-white hover:bg-saie-primary-dark"
                >
                  Reintentar
                </button>
              </div>
            )}

            {horario && hayClases ? (
              sesionesHoy.length > 0 ? (
                <ListaDeClases
                  titulo="Tu día de hoy"
                  sesiones={sesionesHoy}
                  horario={horario}
                  ahora={minutos}
                />
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
                <p className="m-0 rounded-xl border border-dashed border-saie-divider bg-white p-6 text-center text-sm text-saie-muted">
                  Cuando se asignen las aulas de tus cursos, aquí verás tus clases del día.
                </p>
              )
            )}
          </div>

          <nav
            aria-label="Secciones del portal del estudiante"
            className="flex min-h-0 flex-col gap-2 lg:col-span-4 lg:overflow-y-auto"
          >
            <h2 className="m-0 text-sm font-bold text-saie-text">Ir a</h2>
            {ACCESOS.map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="flex items-center gap-3 rounded-xl border border-saie-divider bg-white p-2.5 text-saie-text no-underline transition-colors hover:border-saie-primary"
              >
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-saie-primary/10 text-saie-primary"
                >
                  <Icono trazo={a.trazo} className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{a.titulo}</span>
                  <span className="block text-xs text-saie-muted">{a.descripcion}</span>
                </span>
              </Link>
            ))}
          </nav>
        </div>

        {/* FILA 3 — la semana completa en una tira */}
        {horario && hayClases && <SemanaDeUnVistazo horario={horario} hoy={hoy} />}
      </div>
    </LayoutEstudiante>
  );
};

export default InicioEstudiante;

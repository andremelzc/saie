import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import BotonCerrarSesion from '../components/auth/BotonCerrarSesion';
import {
  BadgeEstadoClase,
  BarraProgresoClase,
  Icono,
  PuntoEnVivo,
} from '../components/estudiante/ElementosHorario';
import logoBlanco from '../assets/logo-blanco.svg';
import { RUTAS } from '../config/rutas';
import { useAuth } from '../context/useAuth';
import { obtenerHorario } from '../services/estudiante';
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

const TRAZO_CALENDARIO =
  'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5';
/** Silueta de persona: el icono de «Mi perfil». */
const TRAZO_PERFIL =
  'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z';
const TRAZO_FLECHA = 'M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75';
const TRAZO_PIN =
  'M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z';
const TRAZO_RELOJ = 'M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z';
const TRAZO_LIBRO =
  'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25';
const TRAZO_BIRRETE =
  'M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342';
/** Silueta de mapa plegado: el icono del "Mapa de ocupación". */
const TRAZO_MAPA =
  'M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z';
/** Flecha con desvío: el icono de "Ruta hacia mi aula". */
const TRAZO_RUTA =
  'M9 6.75V15m6-6v8.25m0 0a3 3 0 11-6 0 3 3 0 016 0zM15 9.75a3 3 0 11-6 0 3 3 0 016 0z';

interface Servicio {
  titulo: string;
  descripcion: string;
  enlace: string;
  etiquetaEnlace: string;
  trazo: string;
  /** Colores del ícono: fondo suave y trazo. */
  fondo: string;
  color: string;
}

const SERVICIOS: Servicio[] = [
  {
    titulo: 'Mi horario y mis cursos',
    descripcion:
      'Tu semana completa, día por día, con docente, aula y pabellón de cada curso matriculado.',
    enlace: RUTAS.horarioAlumno,
    etiquetaEnlace: 'Ir a mi horario',
    trazo: TRAZO_CALENDARIO,
    fondo: '#E3F2FD',
    color: '#1565C0',
  },
  {
    titulo: 'Mi perfil',
    descripcion: 'Consulta y actualiza tus datos personales y tu ficha médica.',
    enlace: RUTAS.perfilAlumno,
    etiquetaEnlace: 'Ir a mi perfil',
    trazo: TRAZO_PERFIL,
    fondo: '#F3E5F5',
    color: '#8E24AA',
  },
  {
    titulo: 'Mapa de ocupación',
    descripcion: 'Ubica tus aulas y laboratorios en el plano de cada pabellón.',
    enlace: RUTAS.mapaAlumno,
    etiquetaEnlace: 'Ver el mapa',
    trazo: TRAZO_MAPA,
    fondo: '#E8F5E9',
    color: '#1B5E20',
  },
  {
    titulo: 'Ruta hacia mi aula',
    descripcion: 'Cómo llegar a tu espacio asignado, con el tiempo estimado.',
    enlace: RUTAS.rutaAlumno,
    etiquetaEnlace: 'Ver mi ruta',
    trazo: TRAZO_RUTA,
    fondo: '#FFF3E0',
    color: '#E65100',
  },
];

const UN_MINUTO_MS = 60_000;

/** Clase en curso o, si ninguna ha empezado, la próxima de hoy. */
function claseDestacada(sesiones: SesionDTO[], ahoraEnMinutos: number): SesionDTO | null {
  return sesiones.find((s) => estadoDeClase(s, ahoraEnMinutos) !== 'FINALIZADA') ?? null;
}

interface ProximoDia {
  dia: DiaSemana;
  sesiones: SesionDTO[];
}

const TarjetaProxima: React.FC<{
  sesion: SesionDTO | null;
  hayClasesHoy: boolean;
  proximoDia: ProximoDia | null;
  ahora: number;
}> = ({ sesion, hayClasesHoy, proximoDia, ahora }) => {
  if (!sesion) {
    const primera = proximoDia?.sesiones[0] ?? null;
    return (
      <div className="flex h-full flex-col justify-center gap-3 rounded-2xl bg-white p-6 text-saie-text shadow-[0_8px_24px_rgba(34,34,34,0.18)]">
        <span
          aria-hidden="true"
          className="saie-flota flex h-12 w-12 items-center justify-center rounded-2xl bg-saie-canvas text-saie-primary"
        >
          <Icono trazo={TRAZO_BIRRETE} className="h-6 w-6" />
        </span>
        <h2 className="m-0 font-serif text-xl font-bold">
          {hayClasesHoy ? 'Ya terminaron tus clases de hoy' : 'Hoy no tienes clases'}
        </h2>
        {primera && proximoDia ? (
          <p className="m-0 text-sm text-saie-muted">
            {`Lo siguiente: ${ETIQUETA_DIA[proximoDia.dia].toLowerCase()} a las ${formatearRango(
              primera.horaInicio,
              primera.horaFin,
            )}, ${primera.nombreCurso}.`}
          </p>
        ) : (
          <p className="m-0 text-sm text-saie-muted">
            Aprovecha para revisar tu horario de la semana o ubicar tus aulas en el mapa.
          </p>
        )}
        <Link
          to={RUTAS.horarioAlumno}
          className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-xl border border-saie-primary px-4 text-sm font-medium text-saie-primary no-underline transition-colors hover:bg-saie-canvas"
        >
          Ver mi semana
        </Link>
      </div>
    );
  }

  const estado = estadoDeClase(sesion, ahora);
  const enCurso = estado === 'EN_CURSO';
  const ubicacion = resumenUbicacion(sesion.espacios);

  return (
    <article
      aria-label="Tu próxima clase"
      className={`flex h-full flex-col gap-3 rounded-2xl bg-white p-6 text-saie-text shadow-[0_8px_24px_rgba(34,34,34,0.18)] ${
        enCurso ? 'saie-respira' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="m-0 flex items-center gap-2 text-sm font-bold text-saie-muted">
          {enCurso && <PuntoEnVivo />}
          {enCurso ? 'Clase en curso' : 'Tu próxima clase'}
        </p>
        <BadgeEstadoClase estado={estado} />
      </div>
      <h2 className="m-0 font-serif text-2xl font-bold leading-8">{sesion.nombreCurso}</h2>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
        <li className="flex items-center gap-2">
          <Icono trazo={TRAZO_RELOJ} className="h-4 w-4 text-saie-primary" />
          <span className="font-medium">{formatearRango(sesion.horaInicio, sesion.horaFin)}</span>
          <span className="rounded-full bg-saie-primary/10 px-2.5 py-0.5 text-xs font-bold text-saie-primary">
            {cuentaRegresiva(sesion, ahora)}
          </span>
        </li>
        <li className="flex items-center gap-2">
          <Icono trazo={TRAZO_PIN} className="h-4 w-4 text-saie-primary" />
          <span>{ubicacion}</span>
        </li>
      </ul>
      {enCurso && <BarraProgresoClase valor={progresoClase(sesion, ahora)} />}
    </article>
  );
};

interface DatoResumen {
  valor: string;
  etiqueta: string;
  trazo: string;
  fondo: string;
  color: string;
}

function datosResumen(horario: HorarioSemanalDTO): DatoResumen[] {
  const r = resumenSemana(horario);
  return [
    {
      valor: String(r.clases),
      etiqueta: r.clases === 1 ? 'clase por semana' : 'clases por semana',
      trazo: TRAZO_CALENDARIO,
      fondo: '#E3F2FD',
      color: '#1565C0',
    },
    {
      valor: String(r.cursos),
      etiqueta: r.cursos === 1 ? 'curso matriculado' : 'cursos matriculados',
      trazo: TRAZO_LIBRO,
      fondo: '#F3E5F5',
      color: '#8E24AA',
    },
    {
      valor: String(r.diasConClase),
      etiqueta: r.diasConClase === 1 ? 'día con clases' : 'días con clases',
      trazo: TRAZO_BIRRETE,
      fondo: '#E8F5E9',
      color: '#1B5E20',
    },
    {
      valor: formatearMinutos(r.minutos),
      etiqueta: 'de clase a la semana',
      trazo: TRAZO_RELOJ,
      fondo: '#FFF3E0',
      color: '#E65100',
    },
  ];
}

const ResumenSemanal: React.FC<{ horario: HorarioSemanalDTO | null; cargando: boolean }> = ({
  horario,
  cargando,
}) => {
  if (cargando) {
    return (
      <div aria-hidden="true" className="relative -mt-14 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((n) => (
          <div key={n} className="saie-esqueleto h-24 rounded-2xl border border-saie-divider" />
        ))}
      </div>
    );
  }
  if (!horario || todasLasSesiones(horario).length === 0) return null;
  return (
    <section aria-label="Resumen de tu semana" className="relative -mt-14">
      <ul className="saie-stagger m-0 grid list-none grid-cols-2 gap-3 p-0 lg:grid-cols-4">
        {datosResumen(horario).map((d) => (
          <li
            key={d.etiqueta}
            className="flex items-center gap-3 rounded-2xl border border-saie-divider bg-white p-4 shadow-[0_8px_24px_rgba(34,34,34,0.12)]"
          >
            <span
              aria-hidden="true"
              className="saie-pop flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: d.fondo, color: d.color }}
            >
              <Icono trazo={d.trazo} className="h-5 w-5" />
            </span>
            <p className="m-0 min-w-0 leading-tight">
              <span className="block font-serif text-2xl font-bold">{d.valor}</span>
              <span className="text-xs font-medium text-saie-muted">{d.etiqueta}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
};

/** Tira de lunes a sábado: cuántas clases hay cada día y cuál es hoy. */
const SemanaDeUnVistazo: React.FC<{ horario: HorarioSemanalDTO; hoy: DiaSemana }> = ({
  horario,
  hoy,
}) => (
  <section aria-labelledby="titulo-semana" className="flex flex-col gap-3">
    <h2 id="titulo-semana" className="m-0 text-xl font-bold">
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
              className={`flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 text-center no-underline transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(34,34,34,0.16)] ${
                esHoy
                  ? 'border-saie-primary bg-saie-primary text-white'
                  : 'border-saie-divider bg-white text-saie-text'
              }`}
            >
              <span aria-hidden="true" className="text-sm font-bold">
                {ABREVIATURA_DIA[d]}
              </span>
              <span aria-hidden="true" className="font-serif text-2xl font-bold leading-none">
                {cantidad}
              </span>
              <span aria-hidden="true" className="flex h-1.5 items-center gap-0.5">
                {Array.from({ length: Math.min(cantidad, 4) }, (_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full ${esHoy ? 'bg-white/80' : 'bg-saie-primary/60'}`}
                  />
                ))}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  </section>
);

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
    <section aria-labelledby="titulo-hoy" className="flex flex-col gap-3">
      <h2 id="titulo-hoy" className="m-0 text-xl font-bold">
        {titulo}
      </h2>
      <ol className="saie-stagger m-0 flex list-none gap-3 overflow-x-auto p-1 pb-3">
        {sesiones.map((s) => {
          const estado = ahora === null ? null : estadoDeClase(s, ahora);
          const color = colores[s.codigoCurso] ?? PALETA_CURSOS[0];
          return (
            <li
              key={`${s.seccionId}-${s.horaInicio}`}
              className={`flex w-64 shrink-0 flex-col gap-1 rounded-2xl border border-l-4 border-saie-divider bg-white p-4 shadow-[0_2px_8px_rgba(34,34,34,0.06)] ${
                estado === 'FINALIZADA' ? 'opacity-60' : ''
              }`}
              style={{ borderLeftColor: color.borde }}
            >
              <span className="text-xs font-bold text-saie-muted">
                {formatearRango(s.horaInicio, s.horaFin)}
              </span>
              <span className="text-base font-bold leading-5">{s.nombreCurso}</span>
              <span className="text-sm text-saie-muted">{resumenUbicacion(s.espacios)}</span>
              {estado && (
                <span className="mt-1 flex flex-col gap-2">
                  <span>
                    <BadgeEstadoClase estado={estado} />
                  </span>
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

/**
 * Inicio del área del estudiante: saludo, la clase en curso o la próxima, el resumen de la
 * semana, las clases de hoy (o las del próximo día con clases) y los accesos a «Mi horario y mis
 * cursos», el mapa y «Mi perfil». Todo sale del horario del backend; si no está disponible, la
 * pantalla sigue mostrando los accesos.
 */
export const InicioEstudiante: React.FC = () => {
  const { sesion } = useAuth();
  const [horario, setHorario] = useState<HorarioSemanalDTO | null>(null);
  const [cargandoHorario, setCargandoHorario] = useState(true);
  const [ahora, setAhora] = useState<Date>(fechaActual);

  useEffect(() => {
    let activo = true;
    obtenerHorario()
      .then((h) => {
        if (activo) setHorario(h);
      })
      .catch(() => {
        // Sin horario no pasa nada: se muestran solo los accesos.
      })
      .finally(() => {
        if (activo) setCargandoHorario(false);
      });
    return () => {
      activo = false;
    };
  }, []);

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

  return (
    <div className="min-h-screen bg-saie-canvas text-saie-text">
      <header className="bg-saie-primary text-white">
        <div className="mx-auto flex h-[85px] w-full max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-4">
            <img src={logoBlanco} alt="SAIE" className="h-10 w-auto shrink-0" />
            <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
              Estudiante
            </span>
          </div>
          <div className="flex items-center gap-4">
            <p className="m-0 hidden text-right text-xs leading-4 text-white/80 sm:block">
              Sesión activa
              <strong className="block text-sm font-bold text-white">{sesion?.rol}</strong>
            </p>
            <BotonCerrarSesion className="h-11! border-white/30! bg-white/10! px-5! text-sm! text-white! hover:bg-white/20!" />
          </div>
        </div>
      </header>

      <section
        aria-label="Bienvenida"
        className="relative overflow-hidden bg-gradient-to-br from-saie-primary to-saie-primary-dark pb-16 text-white"
      >
        <span
          aria-hidden="true"
          className="saie-plano-fondo pointer-events-none absolute inset-0"
        />
        <svg
          aria-hidden="true"
          viewBox="0 0 320 140"
          className="pointer-events-none absolute -bottom-2 left-1/2 hidden h-44 w-96 -translate-x-1/3 text-white/20 lg:block"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            className="saie-trazo"
            pathLength="1"
            d="M10 130V30h120v100M130 60h90v70M220 30h90v100M10 130h300"
          />
          <path
            className="saie-trazo"
            pathLength="1"
            d="M50 130V90h30v40M250 130V90h30v40M160 130V90h30v40"
          />
        </svg>
        <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-stretch gap-6 px-4 pt-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="saie-rise flex flex-col justify-center gap-3">
            <p className="m-0 flex flex-wrap items-center gap-2 text-sm text-white/85">
              <span>{fechaLarga(ahora)}</span>
              {horario?.periodo && (
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white">
                  {`Periodo Lectivo ${horario.periodo}`}
                </span>
              )}
            </p>
            <h1 className="m-0 text-sm font-medium text-white/75">Área del estudiante</h1>
            <p className="m-0 font-serif text-[34px] font-bold leading-[42px] sm:text-[48px] sm:leading-[56px]">
              {saludoSegunHora(ahora)}
            </p>
            <p className="m-0 max-w-lg text-base text-white/85">
              Bienvenido a tu portal académico. Aquí ves tus clases y encuentras tus aulas sin dar
              vueltas.
            </p>
          </div>
          <div className="saie-rise">
            <TarjetaProxima
              sesion={destacada}
              hayClasesHoy={sesionesHoy.length > 0}
              proximoDia={proximoDia}
              ahora={minutos}
            />
          </div>
        </div>
      </section>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-8 pb-10">
        <ResumenSemanal horario={horario} cargando={cargandoHorario} />

        {horario && hayClases && (
          <>
            {sesionesHoy.length > 0 ? (
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
            )}
            <SemanaDeUnVistazo horario={horario} hoy={hoy} />
          </>
        )}

        <section aria-labelledby="titulo-servicios" className="flex flex-col gap-4">
          <h2 id="titulo-servicios" className="m-0 text-xl font-bold">
            Servicios disponibles
          </h2>
          <ul className="saie-stagger m-0 grid list-none grid-cols-1 gap-5 p-0 md:grid-cols-3">
            {SERVICIOS.map((s) => (
              <li key={s.titulo}>
                <Link
                  to={s.enlace}
                  className="saie-lift group relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border border-saie-divider bg-white p-6 text-saie-text no-underline shadow-[0_2px_8px_rgba(34,34,34,0.08)] focus-visible:outline-3 focus-visible:outline-saie-text"
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full opacity-60 transition-transform duration-500 group-hover:scale-150"
                    style={{ backgroundColor: s.fondo }}
                  />
                  <span
                    className="relative flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:-rotate-6 group-hover:scale-110"
                    style={{ backgroundColor: s.fondo, color: s.color }}
                  >
                    <Icono trazo={s.trazo} className="h-6 w-6" />
                  </span>
                  <span className="relative text-lg font-bold">{s.titulo}</span>
                  <span className="relative text-sm text-saie-muted">{s.descripcion}</span>
                  <span className="relative mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-bold text-saie-primary">
                    {s.etiquetaEnlace}
                    <Icono
                      trazo={TRAZO_FLECHA}
                      className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
};

export default InicioEstudiante;

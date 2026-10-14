import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BotonCerrarSesion from '../components/auth/BotonCerrarSesion';
import logoBlanco from '../assets/logo-blanco.svg';
import { RUTAS } from '../config/rutas';
import { useAuth } from '../context/useAuth';
import { obtenerHorario } from '../services/estudiante';

const TRAZO_CALENDARIO =
  'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5';
/** Silueta de persona: el icono de «Mi perfil» (antes reutilizaba el del calendario). */
const TRAZO_PERFIL =
  'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z';
const TRAZO_FLECHA = 'M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75';

const Icono: React.FC<{ trazo: string; className?: string }> = ({
  trazo,
  className = 'h-5 w-5',
}) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d={trazo} />
  </svg>
);

interface ServicioActivo {
  titulo: string;
  descripcion: string;
  enlace: string;
  etiquetaEnlace: string;
  trazo: string;
}

const SERVICIOS_ACTIVOS: ServicioActivo[] = [
  {
    titulo: 'Mi horario y mis cursos',
    descripcion:
      'Visualiza tu horario semanal (vista día y semana), tus asignaturas matriculadas, horarios y pabellones.',
    enlace: RUTAS.horarioAlumno,
    etiquetaEnlace: 'Ir a mi horario',
    trazo: TRAZO_CALENDARIO,
  },
  {
    titulo: 'Mi perfil',
    descripcion: 'Consulta y actualiza tus datos personales y tu ficha médica.',
    enlace: RUTAS.perfilAlumno,
    etiquetaEnlace: 'Ir a mi perfil',
    trazo: TRAZO_PERFIL,
  },
];

/**
 * Inicio del área del estudiante: accesos a «Mi horario y mis cursos» y «Mi perfil».
 * El periodo lectivo se lee del backend (el de las matrículas del alumno); si no está
 * disponible, simplemente no se muestra.
 */
export const InicioEstudiante: React.FC = () => {
  const { sesion } = useAuth();
  const [periodo, setPeriodo] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    obtenerHorario()
      .then((h) => {
        if (activo) setPeriodo(h.periodo);
      })
      .catch(() => {
        // Sin periodo no pasa nada: la insignia no se muestra.
      });
    return () => {
      activo = false;
    };
  }, []);

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

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8">
        <section
          aria-label="Bienvenida"
          className="rounded-2xl border border-saie-divider bg-white p-6 shadow-[0_2px_8px_rgba(34,34,34,0.08)] sm:p-8"
        >
          {periodo && (
            <p className="m-0 inline-block rounded-md border border-saie-divider bg-saie-canvas px-3 py-1 text-xs font-bold text-saie-primary">
              Periodo Lectivo {periodo}
            </p>
          )}
          <h1 className="m-0 mt-3 font-serif text-[32px] font-bold leading-10">
            Área del estudiante
          </h1>
          <p className="m-0 mt-3 max-w-2xl text-base text-saie-muted">
            Bienvenido a tu portal académico. Consulta la programación de tus clases y la
            ubicación exacta de tus aulas y laboratorios en tiempo real.
          </p>
        </section>

        <section aria-labelledby="titulo-servicios" className="flex flex-col gap-4">
          <h2 id="titulo-servicios" className="m-0 text-xl font-bold">
            Servicios disponibles
          </h2>
          <ul className="m-0 grid list-none grid-cols-1 gap-6 p-0 md:grid-cols-2">
            {SERVICIOS_ACTIVOS.map((s) => (
              <li key={s.titulo}>
                <Link
                  to={s.enlace}
                  className="flex h-full flex-col gap-3 rounded-2xl border-2 border-saie-primary bg-white p-6 text-saie-text no-underline shadow-[0_2px_8px_rgba(34,34,34,0.08)] transition-shadow hover:shadow-[0_8px_24px_rgba(34,34,34,0.16)] focus-visible:outline-3 focus-visible:outline-saie-text"
                >
                  <span className="flex items-start justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-saie-primary text-white">
                      <Icono trazo={s.trazo} />
                    </span>
                    <span className="rounded-full bg-saie-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-saie-primary">
                      Acceso activo
                    </span>
                  </span>
                  <span className="text-xl font-bold">{s.titulo}</span>
                  <span className="text-sm text-saie-muted">{s.descripcion}</span>
                  <span className="mt-auto inline-flex items-center gap-1.5 self-end text-sm font-medium text-saie-primary">
                    {s.etiquetaEnlace}
                    <Icono trazo={TRAZO_FLECHA} className="h-4 w-4" />
                  </span>
                </Link>
              </li>
            ))}
            <li>
              <div
                aria-disabled="true"
                className="flex h-full flex-col gap-3 rounded-2xl border border-saie-divider bg-white/60 p-6"
              >
                <span className="flex items-start justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-saie-divider/60 text-saie-muted">
                    <Icono trazo={TRAZO_PERFIL} />
                  </span>
                  <span className="rounded-full bg-saie-divider/60 px-3 py-1 text-xs font-medium text-saie-muted">
                    Próximamente
                  </span>
                </span>
                <span className="text-xl font-bold text-saie-muted">Perfil y Telegram</span>
                <span className="text-sm text-saie-muted">
                  Gestión de datos personales, ficha médica sensible y vinculación directa con el
                  bot de notificaciones.
                </span>
              </div>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
};

export default InicioEstudiante;
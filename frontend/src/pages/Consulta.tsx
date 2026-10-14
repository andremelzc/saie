import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import FormularioBusqueda from '../components/consulta/FormularioBusqueda';
import TarjetaResultado from '../components/consulta/TarjetaResultado';
import logoBlanco from '../assets/logo-blanco.svg';
import type { ResultadoConsulta } from '../types/consulta';

/** Fases de la consulta: la vista muestra solo una a la vez. */
type Fase =
  | { tipo: 'inicial' }
  | { tipo: 'cargando' }
  | { tipo: 'resultado'; resultado: ResultadoConsulta }
  | { tipo: 'sinResultado'; mensaje: string }
  | { tipo: 'error'; mensaje: string };

const plural = (n: number, singular: string, pluralTexto: string) =>
  `${n} ${n === 1 ? singular : pluralTexto}`;

/** Agrupa un estado de una sola tarjeta bajo un <h2> (solo lectores de pantalla): h1 → h2 → h3. */
const EstadoUnico: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <section aria-label="Resultado de la consulta">
    <h2 className="sr-only">Resultado de la consulta</h2>
    {children}
  </section>
);

/** Lista de tarjetas con el resultado de una consulta ya resuelta. */
const Resultados: React.FC<{ resultado: ResultadoConsulta }> = ({ resultado }) => {
  if (resultado.tipo === 'ALUMNO') {
    const { alumno, asignaciones } = resultado.datos;
    if (asignaciones.length === 0) {
      return (
        <EstadoUnico>
          <TarjetaResultado
            sinResultado
            mensajeSinResultado={`El código ${alumno.codigo} no tiene clases asignadas por ahora.`}
          />
        </EstadoUnico>
      );
    }
    return (
      <section aria-labelledby="titulo-resultado" className="flex flex-col gap-3">
        <div>
          <h2 id="titulo-resultado" className="m-0 text-xl font-bold">
            Tus clases
          </h2>
          <p role="status" className="m-0 mt-1 text-sm text-saie-muted">
            {plural(asignaciones.length, 'clase encontrada', 'clases encontradas')} para el código{' '}
            {alumno.codigo}.
          </p>
        </div>
        <ul className="m-0 p-0 list-none flex flex-col gap-3">
          {asignaciones.map((a) => (
            <li key={a.asignacionId ?? `${a.codigoCurso}-${a.codigoSeccion}`}>
              <TarjetaResultado asignacion={a} />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const { curso, secciones } = resultado.datos;
  if (secciones.length === 0) {
    return (
      <EstadoUnico>
        <TarjetaResultado
          sinResultado
          mensajeSinResultado={`El curso ${curso.codigo} no tiene secciones con espacio asignado por ahora.`}
        />
      </EstadoUnico>
    );
  }
  return (
    <section aria-labelledby="titulo-resultado" className="flex flex-col gap-3">
      <div>
        <h2 id="titulo-resultado" className="m-0 text-xl font-bold break-words">
          {curso.codigo} · {curso.nombre}
        </h2>
        <p role="status" className="m-0 mt-1 text-sm text-saie-muted">
          {plural(secciones.length, 'sección encontrada', 'secciones encontradas')}.
        </p>
      </div>
      <ul className="m-0 p-0 list-none flex flex-col gap-3">
        {secciones.map((s) => (
          <li key={s.seccionId}>
            <TarjetaResultado
              asignacion={{ ...s, codigoCurso: curso.codigo, nombreCurso: curso.nombre }}
            />
          </li>
        ))}
      </ul>
    </section>
  );
};

/** Qué trae cada resultado: llena el estado inicial con información útil en vez de espacio vacío. */
const DATOS_DEL_RESULTADO: { titulo: string; detalle: string; trazo: string }[] = [
  {
    titulo: 'Aula o laboratorio',
    detalle: 'El espacio exacto de tu clase.',
    trazo:
      'M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z',
  },
  {
    titulo: 'Pabellón y piso',
    detalle: 'Para saber a dónde ir.',
    trazo:
      'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21',
  },
  {
    titulo: 'Docente y horario',
    detalle: 'Con quién y a qué hora.',
    trazo: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z',
  },
];

const QueVeras: React.FC = () => (
  <section aria-labelledby="titulo-que-veras" className="flex flex-col gap-3">
    <h2 id="titulo-que-veras" className="m-0 text-base font-bold">
      Qué verás en tu consulta
    </h2>
    <ul className="m-0 p-0 list-none grid grid-cols-1 sm:grid-cols-3 gap-3">
      {DATOS_DEL_RESULTADO.map((dato) => (
        <li
          key={dato.titulo}
          className="flex sm:flex-col items-start gap-3 p-4 bg-white border border-saie-divider rounded-xl"
        >
          <span className="shrink-0 w-10 h-10 rounded-lg bg-[#FAF6ED] border border-saie-divider text-saie-primary flex items-center justify-center">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d={dato.trazo} />
            </svg>
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-semibold text-saie-text">{dato.titulo}</span>
            <span className="text-sm text-saie-muted">{dato.detalle}</span>
          </span>
        </li>
      ))}
    </ul>
  </section>
);

/**
 * Issue #136 — 3.7: Vista de consulta de espacios. Une el formulario de búsqueda (3.5), los
 * endpoints de consulta (3.2 y 3.4) y la tarjeta de resultado (3.6): el alumno ingresa su código
 * (o el de un curso) y ve dónde es la clase, en qué piso, con quién y a qué hora.
 *
 * Issue #137 — 3.8: mobile-first. Una sola columna de ancho acotado, sin anchos fijos, con texto
 * que envuelve; el formulario apila campo y botón en pantallas angostas.
 * Issue #138 — 3.9: accesibilidad. Un solo <h1>, regiones con nombre, avisos con role="status",
 * foco visible en los enlaces, contraste AA y texto de 14 px como mínimo.
 *
 * Es pública (no requiere sesión). Maneja carga, "sin resultado" (404 o lista vacía) y error de
 * red; el mensaje concreto del error lo muestra el propio formulario bajo el campo.
 */
export const Consulta: React.FC = () => {
  const [fase, setFase] = useState<Fase>({ tipo: 'inicial' });

  return (
    <div className="min-h-screen bg-saie-canvas text-saie-text">
      <header className="bg-gradient-to-br from-saie-primary to-saie-primary-dark text-white">
        <div className="mx-auto max-w-xl px-4 py-4 flex items-center justify-between gap-3">
          <img src={logoBlanco} alt="SAIE" className="h-10 w-auto shrink-0" />
          <Link
            to="/"
            className="inline-flex items-center gap-2 min-h-11 px-3 rounded-lg text-sm font-medium no-underline text-white hover:bg-white/10 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white transition-colors"
          >
            <span aria-hidden="true">&larr;</span>
            <span>Volver al inicio</span>
          </Link>
        </div>
      </header>

      <main
        aria-label="Consulta de espacios"
        className="mx-auto max-w-xl px-4 py-6 sm:py-10 flex flex-col gap-6"
      >
        <div>
          <p className="m-0 mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-saie-primary">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Consulta pública, sin iniciar sesión
          </p>
          <h1 className="m-0 font-serif text-[28px] leading-9 sm:text-[32px] sm:leading-10 font-bold">
            Consulta de espacios
          </h1>
          <p className="m-0 mt-2 text-base text-saie-muted">
            Ingresa tu código de alumno o el código de un curso para ver dónde es la clase, en qué
            piso, con quién y a qué hora.
          </p>
        </div>

        <div className="saie-rise relative overflow-hidden bg-white border border-saie-divider rounded-2xl shadow-[0_2px_8px_rgba(34,34,34,0.08)] p-4 pt-5 sm:p-6 sm:pt-7">
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-saie-primary to-[#A8383A]"
          />
          <FormularioBusqueda
            mostrarErrorServidor={false}
            onCambio={() =>
              // Al editar el campo se quitan los avisos de la búsqueda anterior (error o sin
              // resultado), pero no una lista de clases que la persona todavía está leyendo.
              setFase((actual) =>
                actual.tipo === 'error' || actual.tipo === 'sinResultado'
                  ? { tipo: 'inicial' }
                  : actual,
              )
            }
            onCargando={(cargando) => {
              if (cargando) setFase({ tipo: 'cargando' });
            }}
            onBuscar={(resultado) => setFase({ tipo: 'resultado', resultado })}
            onError={(mensaje, estado) =>
              setFase(
                estado === 404 ? { tipo: 'sinResultado', mensaje } : { tipo: 'error', mensaje },
              )
            }
          />
        </div>

        {fase.tipo === 'inicial' && <QueVeras />}

        {fase.tipo === 'cargando' && <TarjetaResultado cargando />}

        {fase.tipo === 'sinResultado' && (
          <EstadoUnico>
            <TarjetaResultado sinResultado mensajeSinResultado={fase.mensaje} />
          </EstadoUnico>
        )}

        {fase.tipo === 'error' && (
          <EstadoUnico>
            <TarjetaResultado error={fase.mensaje} />
          </EstadoUnico>
        )}

        {fase.tipo === 'resultado' && <Resultados resultado={fase.resultado} />}
      </main>
    </div>
  );
};

export default Consulta;

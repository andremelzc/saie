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
  | { tipo: 'error' };

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
          <h1 className="m-0 font-serif text-[28px] leading-9 sm:text-[32px] sm:leading-10 font-bold">
            Consulta de espacios
          </h1>
          <p className="m-0 mt-2 text-base text-saie-muted">
            Ingresa tu código de alumno o el código de un curso para ver dónde es la clase, en qué
            piso, con quién y a qué hora.
          </p>
        </div>

        <div className="bg-white border border-saie-divider rounded-2xl shadow-[0_2px_8px_rgba(34,34,34,0.08)] p-4 sm:p-6">
          <FormularioBusqueda
            onCargando={(cargando) => {
              if (cargando) setFase({ tipo: 'cargando' });
            }}
            onBuscar={(resultado) => setFase({ tipo: 'resultado', resultado })}
            onError={(mensaje, estado) =>
              setFase(estado === 404 ? { tipo: 'sinResultado', mensaje } : { tipo: 'error' })
            }
          />
        </div>

        {fase.tipo === 'cargando' && <TarjetaResultado cargando />}

        {fase.tipo === 'sinResultado' && (
          <EstadoUnico>
            <TarjetaResultado sinResultado mensajeSinResultado={fase.mensaje} />
          </EstadoUnico>
        )}

        {fase.tipo === 'error' && (
          <EstadoUnico>
            <TarjetaResultado error="Verifica tu conexión e inténtalo nuevamente en unos momentos." />
          </EstadoUnico>
        )}

        {fase.tipo === 'resultado' && <Resultados resultado={fase.resultado} />}
      </main>
    </div>
  );
};

export default Consulta;

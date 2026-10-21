import React from 'react';
import type { ItemConsultaAsignacion, TipoEspacio } from '../../types/consulta';
import { ESTADO_CLASE_ASIGNADA, ETIQUETA_TIPO_ESPACIO, etiquetaDia } from '../../utils/etiquetas';
import { formatearRango } from '../../utils/horario';
import { BadgeEstado } from '../ui/BadgeEstado';

export interface TarjetaResultadoProps {
  asignacion?: ItemConsultaAsignacion | null;
  sinResultado?: boolean;
  mensajeSinResultado?: string;
  /** Estado de carga: muestra un esqueleto mientras llega la respuesta. */
  cargando?: boolean;
  /** Estado de error: muestra este mensaje en lugar del resultado. */
  error?: string | null;
  /**
   * Oculta la cabecera del curso: se usa cuando la tarjeta va dentro de un bloque de curso y el
   * nombre ya aparece en el título del bloque (evita repetirlo en cada sección).
   */
  ocultarCurso?: boolean;
  className?: string;
}

const TRAZO_LAB =
  'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z';
const TRAZO_AULA =
  'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253';

/** Tipo de espacio con ícono y texto: la distinción no depende solo del color. */
const BadgeTipoEspacio: React.FC<{ tipo: TipoEspacio }> = ({ tipo }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-saie-divider bg-white px-2.5 py-1 text-sm font-semibold text-saie-text">
    <svg
      className="h-3.5 w-3.5 text-saie-primary"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d={tipo === 'LABORATORIO' ? TRAZO_LAB : TRAZO_AULA} />
    </svg>
    <span>{ETIQUETA_TIPO_ESPACIO[tipo]}</span>
  </span>
);

/** Aviso dentro de la tarjeta: en revisión o todavía sin aula (nunca los dos a la vez). */
const NotaEstado: React.FC<{
  tono: 'advertencia' | 'neutro';
  etiqueta: string;
  titulo: string;
  texto: string;
}> = ({ tono, etiqueta, titulo, texto }) => (
  <div
    role="note"
    aria-label={etiqueta}
    className={`rounded-xl border px-3.5 py-3 text-sm ${
      tono === 'advertencia'
        ? 'border-saie-warning-strong/30 bg-saie-warning-soft text-saie-warning-strong'
        : 'border-saie-divider bg-saie-canvas text-saie-text'
    }`}
  >
    <p className="m-0 font-semibold">{titulo}</p>
    <p className="m-0 mt-0.5">{texto}</p>
  </div>
);

export const TarjetaResultado: React.FC<TarjetaResultadoProps> = ({
  asignacion,
  sinResultado = false,
  mensajeSinResultado,
  cargando = false,
  error = null,
  ocultarCurso = false,
  className = '',
}) => {
  // Estado "Cargando": esqueleto accesible (sin animación si el usuario la redujo)
  if (cargando) {
    return (
      <div
        role="status"
        aria-label="Consultando espacios"
        aria-busy="true"
        className={`w-full max-w-xl mx-auto p-4 sm:p-6 bg-white border border-saie-divider rounded-xl shadow-[0_2px_8px_rgba(34,34,34,0.08)] flex flex-col gap-3 ${className}`}
      >
        <div
          aria-hidden="true"
          className="h-5 w-1/3 rounded bg-saie-divider animate-pulse motion-reduce:animate-none"
        />
        <div
          aria-hidden="true"
          className="h-6 w-2/3 rounded bg-saie-divider animate-pulse motion-reduce:animate-none"
        />
        <div
          aria-hidden="true"
          className="h-16 w-full rounded-xl bg-saie-canvas animate-pulse motion-reduce:animate-none"
        />
        <span className="text-sm text-saie-muted">Consultando espacios…</span>
      </div>
    );
  }

  // Estado "Error": mensaje claro con ícono (no depende solo del color). Es una alerta porque
  // la persona necesita enterarse en cuanto aparece, y va alineada a la izquierda para leerse
  // como un aviso, no como una pantalla vacía.
  if (error) {
    return (
      <div
        role="alert"
        aria-label="Error de consulta"
        className={`w-full max-w-xl mx-auto p-4 sm:p-5 bg-white border border-saie-danger/30 border-l-4 border-l-saie-danger rounded-xl shadow-[0_2px_8px_rgba(34,34,34,0.08)] flex items-start gap-3.5 ${className}`}
      >
        <div className="w-10 h-10 shrink-0 rounded-full bg-saie-danger-soft border border-saie-danger/30 flex items-center justify-center text-saie-danger">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="min-w-0">
          <h3 className="m-0 text-base font-bold text-saie-text">
            No se pudo completar la consulta
          </h3>
          <p className="m-0 mt-1 text-sm text-saie-muted break-words">{error}</p>
        </div>
      </div>
    );
  }

  // Estado "Sin resultado" claro y descriptivo
  if (sinResultado || !asignacion) {
    return (
      <div
        role="status"
        aria-label="Sin resultados de consulta"
        className={`w-full max-w-xl mx-auto p-6 sm:p-8 bg-white border border-saie-divider rounded-xl shadow-[0_2px_8px_rgba(34,34,34,0.08)] flex flex-col items-center text-center ${className}`}
      >
        <div className="w-12 h-12 rounded-full bg-saie-canvas border border-saie-divider flex items-center justify-center text-saie-primary mb-3">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-saie-text">Sin resultados encontrados</h3>
        <p className="text-sm text-saie-muted mt-1 max-w-sm">
          {mensajeSinResultado ||
            'No se encontraron asignaciones activas para el código consultado. Verifica los datos e intenta nuevamente.'}
        </p>
      </div>
    );
  }

  const {
    codigoCurso,
    nombreCurso,
    codigoSeccion,
    periodo,
    docenteNombre,
    horarios = [],
    espacios = [],
    estadoAsignacion,
  } = asignacion;

  const tieneEspacios = espacios.length > 0;
  const esBloqueMultiple = espacios.length > 1;

  // Extracción de datos generales de ubicación cuando es un espacio único
  const espacioPrincipal = espacios[0];

  return (
    <article
      aria-label={`Resultado de consulta para ${codigoCurso || 'curso'} sección ${codigoSeccion}`}
      className={`w-full max-w-xl mx-auto bg-white border border-saie-divider rounded-xl shadow-[0_2px_8px_rgba(34,34,34,0.08)] p-4 sm:p-6 flex flex-col gap-4 text-saie-text transition-all ${className}`}
    >
      {/* Cabecera del Curso y Estado */}
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-saie-divider pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {!ocultarCurso && (
              <span className="text-sm font-bold text-saie-primary bg-saie-canvas px-2 py-0.5 rounded-sm border border-saie-divider">
                {codigoCurso || 'CURSO'}
              </span>
            )}
            <span className="text-sm font-medium text-saie-muted">Sección {codigoSeccion}</span>
            {periodo && <span className="text-sm text-saie-muted">• {periodo}</span>}
          </div>
          {!ocultarCurso && (
            <h3 className="text-base sm:text-lg font-bold text-saie-text mt-1 leading-snug break-words">
              {nombreCurso || 'Curso sin denominación'}
            </h3>
          )}
        </div>

        <div className="self-start sm:self-auto shrink-0">
          <BadgeEstado tono={ESTADO_CLASE_ASIGNADA[estadoAsignacion].tono} tamano="md">
            {ESTADO_CLASE_ASIGNADA[estadoAsignacion].etiqueta}
          </BadgeEstado>
        </div>
      </header>

      {estadoAsignacion === 'ESCALADA' ? (
        <NotaEstado
          tono="advertencia"
          etiqueta="Detalle de la revisión de esta clase"
          titulo="Tu clase está en revisión"
          texto="Coordinación Académica está revisando el aula o laboratorio de esta sección. Cuando se confirme, aparecerá aquí."
        />
      ) : (
        (!tieneEspacios || estadoAsignacion === 'PENDIENTE') && (
          <NotaEstado
            tono="neutro"
            etiqueta="Aviso de aula sin asignar"
            titulo="Aún no hay aula asignada"
            texto="La facultad todavía no confirma el aula o laboratorio de esta sección. Vuelve a consultar más tarde."
          />
        )
      )}

      {/* Los 6 campos requeridos de la consulta */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
        {/* Campo 1, 2, 3, 4: Ubicación y Espacio(s) */}
        {tieneEspacios && (
          <div className="sm:col-span-2 p-3.5 rounded-xl bg-saie-canvas border border-saie-divider flex flex-col gap-2">
            <span className="text-sm font-semibold text-saie-muted uppercase tracking-wider flex items-center gap-1.5">
              <svg
                className="w-4 h-4 text-saie-primary shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <span>
                {esBloqueMultiple ? 'Varios espacios para esta clase' : 'Espacio asignado'}
              </span>
            </span>

            {esBloqueMultiple ? (
              /* Caso borde: Bloque de varios espacios (se listan todos con sus 4 atributos) */
              <ul className="flex flex-col gap-2" aria-label="Lista de espacios asignados">
                {espacios.map((esp) => (
                  <li
                    key={esp.id || esp.identificador}
                    className="p-2.5 rounded-lg bg-white border border-saie-divider flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <BadgeTipoEspacio tipo={esp.tipo} />
                      <span className="font-bold text-saie-text font-mono text-sm">
                        {esp.identificador}
                      </span>
                    </div>
                    <div className="text-sm text-saie-muted flex flex-wrap items-center gap-x-2">
                      <span>{esp.pabellon}</span>
                      <span>•</span>
                      <span>Piso {esp.piso}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              /* Espacio individual: 1. Tipo, 2. Pabellón, 3. Piso, 4. Identificador */
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <BadgeTipoEspacio tipo={espacioPrincipal.tipo} />
                  <span className="text-base font-bold text-saie-text font-mono">
                    {espacioPrincipal.identificador}
                  </span>
                </div>
                <div className="text-sm font-medium text-saie-muted flex flex-wrap items-center gap-x-2">
                  <span>{espacioPrincipal.pabellon}</span>
                  <span>•</span>
                  <span>Piso {espacioPrincipal.piso}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Campo 5: Horario */}
        <div className="p-3 rounded-lg border border-saie-divider bg-white flex items-start gap-3">
          <div className="p-2 rounded-lg bg-saie-canvas text-saie-primary shrink-0 mt-0.5">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <span className="text-sm font-semibold text-saie-muted block uppercase tracking-wider">
              Horario
            </span>
            {horarios.length > 0 ? (
              <ul className="mt-0.5 flex flex-col gap-0.5" aria-label="Horarios programados">
                {horarios.map((h, idx) => (
                  <li key={idx} className="font-semibold text-saie-text text-sm">
                    {etiquetaDia(h.diaSemana)}{' '}
                    <span className="font-normal text-saie-muted">
                      {formatearRango(h.horaInicio, h.horaFin)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-sm text-saie-muted italic mt-0.5 block">
                Horario por confirmar
              </span>
            )}
          </div>
        </div>

        {/* Campo 6: Docente (con caso borde sin nombre registrado) */}
        <div className="p-3 rounded-lg border border-saie-divider bg-white flex items-start gap-3">
          <div className="p-2 rounded-lg bg-saie-canvas text-saie-primary shrink-0 mt-0.5">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <span className="text-sm font-semibold text-saie-muted block uppercase tracking-wider">
              Docente
            </span>
            {docenteNombre ? (
              <span className="font-semibold text-saie-text text-sm mt-0.5 block break-words">
                {docenteNombre}
              </span>
            ) : (
              /* Caso borde: Docente sin nombre registrado */
              <span className="text-sm text-saie-muted italic mt-0.5 block">
                Docente por asignar
              </span>
            )}
          </div>
        </div>
      </section>
    </article>
  );
};

export default TarjetaResultado;

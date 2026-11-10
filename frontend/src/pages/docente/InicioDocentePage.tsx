import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PaginaDocente from '../../components/docente/PaginaDocente';
import { BadgeEstadoClase, EstadoVacio } from '../../components/estudiante/ElementosHorario';
import { EstadoError } from '../../components/ui/EstadoError';
import { RUTAS } from '../../config/rutas';
import { useCarga } from '../../hooks/useCarga';
import { CLAVE_HORARIO_DOCENTE, obtenerHorarioDocente } from '../../services/docente';
import type { DiaSemana } from '../../types/consulta';
import type { HorarioDocenteDTO } from '../../types/docente';
import { proximaClaseDocente } from '../../utils/docente';
import type { ProximaClase } from '../../utils/docente';
import { fechaLarga } from '../../utils/fechas';
import {
  ABREVIATURA_DIA,
  cuentaRegresiva,
  DIAS_LECTIVOS,
  diaDeFecha,
  ETIQUETA_DIA,
  estadoDeClase,
  fechaActual,
  formatearMinutos,
  formatearRango,
  minutosDeFecha,
  resumenSemana,
  resumenUbicacion,
  saludoSegunHora,
  sesionesDeDia,
} from '../../utils/horario';

const UN_MINUTO_MS = 60_000;

const TarjetaProximaClase: React.FC<{ proxima: ProximaClase | null; ahora: number }> = ({
  proxima,
  ahora,
}) => {
  if (!proxima) {
    return (
      <div className="flex flex-col gap-1">
        <h2 className="m-0 font-serif text-xl font-bold">No tienes clases programadas</h2>
        <p className="m-0 text-sm text-white/85">
          Cuando se asignen aulas a tus secciones, tu próxima clase aparecerá aquí.
        </p>
      </div>
    );
  }

  const { sesion, dia, esHoy } = proxima;
  const estado = esHoy ? estadoDeClase(sesion, ahora) : 'PROXIMA';
  const enCurso = estado === 'EN_CURSO';
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-sm font-bold text-white/85">
          {enCurso ? 'Clase en curso' : 'Tu próxima clase'}
        </p>
        {esHoy && <BadgeEstadoClase estado={estado} />}
      </div>
      <h2 className="m-0 font-serif text-2xl font-bold leading-8">{sesion.nombreCurso}</h2>
      <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-white/90">
        <li className="flex flex-wrap items-center gap-2">
          <span className="font-medium">
            {esHoy ? 'Hoy' : ETIQUETA_DIA[dia]} ·{' '}
            {formatearRango(sesion.horaInicio, sesion.horaFin)}
          </span>
          {esHoy && (
            <span
              className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold"
              aria-live="polite"
            >
              {cuentaRegresiva(sesion, ahora)}
            </span>
          )}
        </li>
        <li>
          Sección {sesion.codigoSeccion} · {resumenUbicacion(sesion.espacios)}
        </li>
      </ul>
    </div>
  );
};

/** Las cuatro cifras del docente en el periodo, en una rejilla de 2×2. */
function cifrasDocente(horario: HorarioDocenteDTO): { valor: string; etiqueta: string }[] {
  const r = resumenSemana(horario);
  const secciones = horario.asignacionesActivas.length;
  const alumnos = horario.asignacionesActivas.reduce((t, a) => t + a.numeroAlumnos, 0);
  return [
    {
      valor: String(secciones),
      etiqueta: secciones === 1 ? 'sección activa' : 'secciones activas',
    },
    {
      valor: String(r.clases),
      etiqueta: r.clases === 1 ? 'clase por semana' : 'clases por semana',
    },
    { valor: String(alumnos), etiqueta: alumnos === 1 ? 'alumno a cargo' : 'alumnos a cargo' },
    { valor: formatearMinutos(r.minutos), etiqueta: 'de clase a la semana' },
  ];
}

/** Tira de lunes a sábado: cuántas clases hay cada día y cuál es hoy. */
const SemanaDeUnVistazo: React.FC<{ horario: HorarioDocenteDTO; hoy: DiaSemana }> = ({
  horario,
  hoy,
}) => (
  <section aria-labelledby="titulo-semana" className="flex min-w-0 flex-col gap-2">
    <h2 id="titulo-semana" className="m-0 text-sm font-bold text-saie-text">
      Tu semana de un vistazo
    </h2>
    <ul className="m-0 grid list-none grid-cols-6 gap-2 p-0">
      {DIAS_LECTIVOS.map((d) => {
        const cantidad = (horario.dias[d] ?? []).length;
        const esHoy = d === hoy;
        return (
          <li key={d}>
            <Link
              to={RUTAS.horarioDocente}
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
              <span aria-hidden="true" className="text-2xl font-bold leading-none tabular-nums">
                {cantidad}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  </section>
);

/**
 * Portada del portal docente (Issue 7.8), con el mismo esquema que la del alumno: la clase en
 * curso o la próxima con su cuenta regresiva, las cifras del periodo, la semana de un vistazo y
 * las clases de hoy. Los datos salen de GET /docente/horario (Issue 7.12).
 */
export const InicioDocentePage: React.FC<{ ahora?: Date }> = ({ ahora }) => {
  const { datos, cargando, error, recargar } = useCarga(obtenerHorarioDocente, {
    clave: CLAVE_HORARIO_DOCENTE,
  });
  const [referencia, setReferencia] = useState<Date>(ahora ?? fechaActual);

  // La cuenta regresiva se actualiza cada minuto (salvo en pruebas, con una hora fija).
  useEffect(() => {
    if (ahora) return undefined;
    const temporizador = setInterval(() => setReferencia(fechaActual()), UN_MINUTO_MS);
    return () => clearInterval(temporizador);
  }, [ahora]);

  const minutos = minutosDeFecha(referencia);
  const hoy = diaDeFecha(referencia);
  const proxima = datos ? proximaClaseDocente(datos, hoy, minutos) : null;
  const clasesHoy = useMemo(() => (datos ? sesionesDeDia(datos, hoy) : []), [datos, hoy]);
  const hayClases = datos ? resumenSemana(datos).clases > 0 : false;

  return (
    <PaginaDocente
      titulo="Portal del docente"
      descripcion={datos?.periodo ? `Periodo lectivo ${datos.periodo}` : undefined}
    >
      {error && <EstadoError mensaje={error} onReintentar={recargar} />}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <section
          aria-label="Próxima clase"
          aria-busy={cargando && !datos}
          className="flex min-w-0 flex-col gap-3 rounded-2xl bg-gradient-to-br from-saie-primary to-saie-primary-dark p-4 text-white lg:col-span-7"
        >
          <div className="min-w-0">
            <p className="m-0 text-xs text-white/80">{fechaLarga(referencia)}</p>
            <p className="m-0 text-2xl font-bold leading-8">{saludoSegunHora(referencia)}</p>
          </div>
          {error ? (
            <p className="m-0 text-sm text-white/90">No pudimos cargar tu horario.</p>
          ) : cargando && !datos ? (
            <p className="m-0 text-sm text-white/85">Cargando tu próxima clase…</p>
          ) : (
            <TarjetaProximaClase proxima={proxima} ahora={minutos} />
          )}
        </section>

        <div className="grid min-w-0 grid-cols-2 gap-3 lg:col-span-5">
          {cargando && !datos
            ? [0, 1, 2, 3].map((n) => (
                <div
                  key={n}
                  aria-hidden="true"
                  className="saie-esqueleto h-[68px] rounded-xl border border-saie-divider"
                />
              ))
            : datos &&
              cifrasDocente(datos).map((c) => (
                <div
                  key={c.etiqueta}
                  className="rounded-xl border border-saie-divider bg-white p-3 shadow-sm"
                >
                  <p className="m-0 text-2xl font-bold leading-none tabular-nums">{c.valor}</p>
                  <p className="m-0 mt-1 text-xs font-medium text-saie-muted">{c.etiqueta}</p>
                </div>
              ))}
        </div>
      </div>

      {datos && hayClases && <SemanaDeUnVistazo horario={datos} hoy={hoy} />}

      {datos && (
        <section aria-labelledby="titulo-hoy" className="flex flex-col gap-2">
          <h2 id="titulo-hoy" className="m-0 text-sm font-bold text-saie-text">
            Tus clases de hoy
          </h2>
          {clasesHoy.length === 0 ? (
            <EstadoVacio
              compacto
              titulo="Hoy no tienes clases"
              descripcion="Revisa tu horario de la semana o el estado de tu laboratorio."
            />
          ) : (
            <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {clasesHoy.map((s) => (
                <li
                  key={`${s.seccionId}-${s.horaInicio}`}
                  className="flex flex-col gap-1 rounded-xl border border-saie-divider bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-saie-muted tabular-nums">
                      {formatearRango(s.horaInicio, s.horaFin)}
                    </span>
                    <BadgeEstadoClase estado={estadoDeClase(s, minutos)} />
                  </div>
                  <p className="m-0 font-bold">{s.nombreCurso}</p>
                  <p className="m-0 text-sm text-saie-muted">
                    Sección {s.codigoSeccion} · {resumenUbicacion(s.espacios)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </PaginaDocente>
  );
};

export default InicioDocentePage;

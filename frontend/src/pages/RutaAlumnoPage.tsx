import React, { useCallback, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import CabeceraPantalla from '../components/estudiante/CabeceraPantalla';
import { EsqueletoCarga, Icono } from '../components/estudiante/ElementosHorario';
import ListaEspaciosPiso from '../components/estudiante/ListaEspaciosPiso';
import PlanoPiso from '../components/estudiante/PlanoPiso';
import { RUTAS } from '../config/rutas';
import { useCarga } from '../hooks/useCarga';
import { obtenerRuta } from '../services/estudiante';
import type { RutaReferenciaDTO, TipoTramoRuta } from '../types/ruta';
import { formatearDuracion, resolverIdPlano } from '../utils/plano';

const TRAZOS_TRAMO: Record<TipoTramoRuta, string> = {
  ENTRADA_PABELLON:
    'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m3-3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21',
  CAMBIO_PISO: 'M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25',
  ESPACIO_ASIGNADO:
    'M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z',
};

const TRAZO_ALERTA = 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
const TRAZO_ACCESIBLE = 'M5 13l4 4L19 7';
const TRAZO_RELOJ = 'M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z';
const TRAZO_RUTA = 'M9 6.75V15m6-6v8.25M3 6.7v12.5l6 -2.5 6 2.5 6 -2.5V4.2l-6 2.5 -6 -2.5z';

const Tramos: React.FC<{ ruta: RutaReferenciaDTO }> = ({ ruta }) => {
  const tramos = [...ruta.tramos].sort((a, b) => a.orden - b.orden);
  return (
    <ol className="saie-stagger m-0 flex list-none flex-col p-0">
      {tramos.map((t, i) => {
        const ultimo = i === tramos.length - 1;
        return (
          <li key={t.orden} className="relative flex gap-4 pb-4 last:pb-0">
            {!ultimo && (
              <span
                aria-hidden="true"
                className="absolute left-[21px] top-11 h-[calc(100%-2.75rem)] w-0.5 border-l-2 border-dashed border-saie-primary/35"
              />
            )}
            <span
              className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white shadow-[0_2px_8px_rgba(34,34,34,0.2)] ${
                ultimo ? 'bg-saie-primary ring-4 ring-saie-primary/20' : 'bg-saie-primary-dark'
              }`}
            >
              <Icono trazo={TRAZOS_TRAMO[t.tipo]} className="h-5 w-5" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-2xl border border-saie-divider bg-white p-4 shadow-[0_2px_8px_rgba(34,34,34,0.06)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="m-0 text-base font-bold text-saie-text">
                  {`${t.orden}. ${t.titulo}`}
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-saie-canvas px-2.5 py-0.5 text-xs font-bold text-saie-muted">
                  <Icono trazo={TRAZO_RELOJ} />
                  {formatearDuracion(t.tiempoEstimadoSegundos)}
                </span>
              </div>
              <p className="m-0 text-sm text-saie-text">{t.descripcion}</p>
              {t.esAccesible && (
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#E8F5E9] px-2.5 py-0.5 text-xs font-medium text-[#1B5E20]">
                  <Icono trazo={TRAZO_ACCESIBLE} />
                  Tramo accesible
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};

const Contenido: React.FC<{ ruta: RutaReferenciaDTO }> = ({ ruta }) => {
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const destinos = useMemo(
    () =>
      ruta.tramos
        .filter((t) => t.tipo === 'ESPACIO_ASIGNADO' && t.identificador)
        .map((t) => ({
          id: t.espacioId ?? t.identificador!,
          identificador: t.identificador!,
          tipo: t.tipoEspacio ?? ('AULA_TEORICA' as const),
          idPlano: resolverIdPlano(
            t.pabellon ?? ruta.pabellon ?? '',
            t.identificador!,
            t.piso ?? ruta.pisoDestino ?? 1,
          ),
        })),
    [ruta],
  );

  if (ruta.estado === 'RUTA_NO_DISPONIBLE') {
    return (
      <p
        role="status"
        className="m-0 flex items-start gap-2 rounded-xl border border-saie-divider bg-white p-4 text-sm text-saie-text"
      >
        <Icono trazo={TRAZO_ALERTA} className="mt-0.5 h-5 w-5 shrink-0 text-saie-primary" />
        <span>{ruta.mensaje ?? 'Todavía no hay una ruta disponible para esta clase.'}</span>
      </p>
    );
  }

  const piso = ruta.pisoDestino ?? 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="saie-rise flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-[0_2px_8px_rgba(34,34,34,0.06)]">
        <span className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-saie-primary/10 text-saie-primary"
          >
            <Icono trazo={TRAZO_RELOJ} className="h-6 w-6" />
          </span>
          <span className="leading-tight">
            <span className="block text-xs font-medium uppercase tracking-wide text-saie-muted">
              Tiempo estimado
            </span>
            <span className="font-serif text-2xl font-bold text-saie-primary">
              {formatearDuracion(ruta.tiempoEstimadoTotalSegundos)}
            </span>
          </span>
        </span>
        <span className="flex flex-wrap gap-2 text-sm">
          {ruta.pabellon && (
            <span className="rounded-full bg-saie-canvas px-3 py-1 font-medium text-saie-text">
              {`${ruta.pabellon}, piso ${piso}`}
            </span>
          )}
          {ruta.movilidadReducida && (
            <span className="rounded-full bg-[#E8F5E9] px-3 py-1 font-medium text-[#1B5E20]">
              Ruta adaptada a movilidad reducida
            </span>
          )}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <section aria-labelledby="titulo-tramos" className="flex flex-col gap-3">
          <h2 id="titulo-tramos" className="m-0 text-xl font-bold">
            Cómo llegar
          </h2>
          <Tramos ruta={ruta} />
        </section>

        <section aria-labelledby="titulo-plano" className="flex flex-col gap-3">
          <h2 id="titulo-plano" className="m-0 text-xl font-bold">
            Tu espacio en el plano
          </h2>
          <PlanoPiso
            piso={piso}
            etiqueta={`Plano del piso ${piso} con tu espacio resaltado`}
            espacios={destinos.map((d) => ({ id: d.idPlano, tipo: d.tipo }))}
            resaltados={destinos.map((d) => d.idPlano)}
            seleccionado={seleccionado}
            onSeleccionar={setSeleccionado}
            fallback={
              <p role="status" className="m-0 p-4 text-sm text-saie-text">
                Tu navegador no puede mostrar el plano en 3D. Sigue los pasos de la izquierda.
              </p>
            }
          />
          <ListaEspaciosPiso
            titulo="Espacios de tu clase"
            espacios={destinos.map((d) => ({
              id: d.id,
              identificador: d.identificador,
              tipo: d.tipo,
              resaltado: true,
            }))}
          />
        </section>
      </div>
    </div>
  );
};

/** Ruta de referencia (Issues 3.14 y 3.15) hacia el espacio asignado de una clase del alumno. */
export const RutaAlumnoPage: React.FC = () => {
  const { asignacionId = '' } = useParams<{ asignacionId: string }>();
  const cargador = useCallback(() => obtenerRuta(asignacionId), [asignacionId]);
  const { datos, cargando, error, recargar } = useCarga(cargador);

  return (
    <div className="min-h-screen bg-saie-canvas text-saie-text">
      <CabeceraPantalla
        titulo="Cómo llegar a mi aula"
        subtitulo="Ruta de referencia desde la entrada del pabellón"
        volverA={RUTAS.horarioAlumno}
        etiquetaVolver="Volver a mi horario"
        trazoIcono={TRAZO_RUTA}
      />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6">
        {cargando && <EsqueletoCarga texto="Cargando la ruta…" />}
        {error && (
          <div
            role="alert"
            className="flex flex-col items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-saie-danger"
          >
            <p className="m-0 flex items-start gap-2">
              <Icono trazo={TRAZO_ALERTA} className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{`No pudimos cargar la ruta. ${error}`}</span>
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={recargar}
                className="min-h-11 cursor-pointer rounded-xl bg-saie-primary px-5 text-sm font-medium text-white hover:bg-saie-primary-dark"
              >
                Reintentar
              </button>
              <Link
                to={RUTAS.horarioAlumno}
                className="inline-flex min-h-11 items-center rounded-xl border border-saie-primary px-5 text-sm font-medium text-saie-primary no-underline"
              >
                Volver a mi horario
              </Link>
            </div>
          </div>
        )}
        {!cargando && !error && datos && <Contenido ruta={datos} />}
      </main>
    </div>
  );
};

export default RutaAlumnoPage;

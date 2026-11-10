import React, { useMemo, useState } from 'react';
import Mapa2D from '../mapa2d/Mapa2D';
import { PLANOS_SVG } from '../mapa2d/planos';
import { Aviso } from '../ui/Aviso';
import { BadgeEstado } from '../ui/BadgeEstado';
import type { RutaReferencia } from './tipos';
import { calcularTrazado, formatearDuracion } from './trazado';

export interface VistaMapaRutaProps {
  ruta: RutaReferencia;
  /** Planos por piso. Por defecto, los de `assets/planos/`. */
  planos?: Record<number, string>;
  className?: string;
}

const LeyendaRuta: React.FC = () => (
  <ul
    aria-label="Leyenda de la ruta"
    className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0 text-sm text-saie-text"
  >
    <li className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="inline-block h-0 w-7 border-t-4 border-dashed border-indigo-600"
      />
      Recorrido
    </li>
    <li className="flex items-center gap-2">
      <span aria-hidden="true" className="inline-block h-4 w-4 rounded-full bg-indigo-600" />
      Punto del recorrido (número del paso)
    </li>
    <li className="flex items-center gap-2">
      <span aria-hidden="true" className="inline-block h-4 w-4 rounded-full bg-rose-700" />
      Tu aula o laboratorio
    </li>
    <li className="flex items-center gap-2">
      <span aria-hidden="true" className="inline-block h-4 w-4 rounded-full bg-blue-900" />
      Entrada del pabellón
    </li>
  </ul>
);

/**
 * Ruta de referencia hacia el espacio asignado (Issue 3.19): el plano del piso con el recorrido
 * encima, la entrada del pabellón como punto de partida, el destino, el tiempo estimado y los
 * pasos escritos (el dibujo solo no basta). Si la ruta no está disponible, dice por qué en vez de
 * mostrar un plano vacío. El recorrido es esquemático: une puntos de referencia, no pasillos.
 */
export const VistaMapaRuta: React.FC<VistaMapaRutaProps> = ({
  ruta,
  planos = PLANOS_SVG,
  className = '',
}) => {
  const trazado = useMemo(() => calcularTrazado(ruta, planos), [ruta, planos]);
  const pisoInicial = trazado.pasos[0]?.piso ?? 1;
  const [piso, setPiso] = useState<number | null>(null);
  const [enfoque, setEnfoque] = useState<{ id: string; n: number } | null>(null);
  const [pasoActivo, setPasoActivo] = useState<number | null>(null);
  const pisoMostrado = piso ?? pisoInicial;

  if (ruta.estado !== 'DISPONIBLE' || trazado.pasos.length === 0) {
    return (
      <Aviso tono="advertencia" role="alert" className={className}>
        <strong className="block">Ruta no disponible</strong>
        {ruta.mensaje ?? 'No pudimos calcular la ruta hacia este espacio.'} Consulta tu horario o
        pregunta en la entrada del pabellón.
      </Aviso>
    );
  }

  const irAlPaso = (i: number) => {
    const paso = trazado.pasos[i];
    setPasoActivo(i);
    setPiso(paso.piso);
    const id = paso.focoId;
    if (id) setEnfoque((previo) => ({ id, n: (previo?.n ?? 0) + 1 }));
  };

  return (
    <div className={`grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] ${className}`}>
      <div className="flex min-w-0 flex-col gap-3">
        <Mapa2D
          espacios={[]}
          resaltados={trazado.destinos}
          piso={pisoMostrado}
          onPisoCambiado={setPiso}
          planos={planos}
          capaRuta={trazado.capa}
          enfocar={enfoque}
          leyenda={false}
        />
        <LeyendaRuta />
      </div>

      <section aria-label="Pasos de la ruta" className="flex flex-col gap-3">
        <div className="rounded-xl border border-saie-divider bg-white p-4 shadow-sm">
          <p className="m-0 text-sm text-saie-muted">Tiempo estimado de caminata</p>
          <p className="m-0 text-2xl font-bold text-saie-text" aria-live="polite">
            {formatearDuracion(ruta.tiempoEstimadoTotalSegundos)}
          </p>
          <p className="m-0 mt-1 text-sm text-saie-muted">
            {ruta.pabellon}
            {ruta.pisoDestino ? `, piso ${ruta.pisoDestino}` : ''}
            {ruta.movilidadReducida ? ' · ruta accesible por ascensor' : ''}
          </p>
        </div>

        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {trazado.pasos.map(({ tramo }, i) => (
            <li
              key={tramo.orden}
              className={`rounded-xl border bg-white p-3 ${
                pasoActivo === i ? 'border-saie-primary' : 'border-saie-divider'
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white"
                >
                  {tramo.orden}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-sm font-semibold text-saie-text">
                    <span className="sr-only">Paso {tramo.orden}: </span>
                    {tramo.titulo}
                  </p>
                  <p className="m-0 mt-1 text-sm text-saie-muted">{tramo.descripcion}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-saie-muted">
                      {formatearDuracion(tramo.tiempoEstimadoSegundos)}
                    </span>
                    {tramo.tipo === 'CAMBIO_PISO' && tramo.esAccesible && (
                      <BadgeEstado tono="exito">Accesible</BadgeEstado>
                    )}
                    <button
                      type="button"
                      aria-label={`Ver el paso ${tramo.orden} en el plano`}
                      aria-pressed={pasoActivo === i}
                      onClick={() => irAlPaso(i)}
                      className="min-h-9 cursor-pointer rounded-lg px-2 text-sm font-medium text-saie-primary hover:bg-saie-primary/5"
                    >
                      Ver en el plano
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
};

export default VistaMapaRuta;

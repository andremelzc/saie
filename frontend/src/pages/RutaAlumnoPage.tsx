import React, { useCallback, useId, useMemo, useState } from 'react';
import LayoutEstudiante from '../components/estudiante/LayoutEstudiante';
import { EsqueletoCarga } from '../components/estudiante/ElementosHorario';
import { CLASE_CAMPO_MAPA } from '../components/mapa2d/controles';
import { ENLACE_PLANOS } from '../components/mapa2d/ocupacionReal';
import { rutaConIdsDePlano } from '../components/mapa2d/enlacePlano';
import { PLANOS_SVG } from '../components/mapa2d/planos';
import { origenesDeRuta } from '../components/ruta/origenes';
import { ORIGEN_ENTRADA, type OrigenRuta } from '../components/ruta/trazado';
import VistaMapaRuta from '../components/ruta/VistaMapaRuta';
import { Aviso } from '../components/ui/Aviso';
import { EstadoError } from '../components/ui/EstadoError';
import { useCarga } from '../hooks/useCarga';
import { obtenerCursos, obtenerRuta } from '../services/estudiante';
import type { CursoMatriculadoDTO } from '../types/horario';

const etiquetaDe = (c: CursoMatriculadoDTO) => {
  const lugar = c.espacios.map((e) => e.identificador).join(', ');
  return `${c.nombreCurso} · sección ${c.codigoSeccion}${lugar ? ` · ${lugar}` : ''}`;
};

/** Valor de «Dónde estás» que significa la entrada principal. */
const VALOR_ENTRADA = 'entrada';

/**
 * Pantalla de ruta hacia el espacio asignado (Issues 3.19 y 3.20). Primero se dice dónde se está:
 * la entrada principal de la facultad (lo habitual) o cualquier aula o espacio del plano. Luego se
 * elige una de las clases con aula y se ve el recorrido sobre el plano. El backend entrega los
 * espacios de la clase y si la ruta debe ser accesible (`GET /api/v1/estudiante/ruta/:asignacionId`);
 * el recorrido por los pasillos, el patio y los pisos se arma en el plano. Es de referencia: une
 * los puntos principales, no cada pasillo.
 */
export const RutaAlumnoPage: React.FC = () => {
  const id = useId();
  const cursosCarga = useCarga(obtenerCursos, { clave: 'cursos-para-ruta' });
  const conAula = useMemo(
    () => (cursosCarga.datos?.cursos ?? []).filter((c) => c.asignacionId),
    [cursosCarga.datos],
  );
  const gruposOrigen = useMemo(() => origenesDeRuta(PLANOS_SVG), []);

  const [elegida, setElegida] = useState<string | null>(null);
  const [desde, setDesde] = useState<string>(VALOR_ENTRADA);
  const asignacionId =
    conAula.find((c) => c.asignacionId === elegida)?.asignacionId ??
    conAula[0]?.asignacionId ??
    null;
  const origen: OrigenRuta = useMemo(
    () => (desde === VALOR_ENTRADA ? ORIGEN_ENTRADA : { tipo: 'espacio', id: desde }),
    [desde],
  );

  const pedirRuta = useCallback(
    () =>
      obtenerRuta(asignacionId as string).then((r) =>
        rutaConIdsDePlano(r, ENLACE_PLANOS, PLANOS_SVG),
      ),
    [asignacionId],
  );
  const rutaCarga = useCarga(pedirRuta, {
    clave: `ruta:${asignacionId}`,
    habilitado: asignacionId !== null,
  });
  // Si dices que ya estás en el aula de la clase, no hay recorrido que dibujar.
  const yEstasAlli =
    desde !== VALOR_ENTRADA &&
    (rutaCarga.datos?.tramos ?? []).some(
      (t) => t.tipo === 'ESPACIO_ASIGNADO' && t.espacioId === desde,
    );

  return (
    <LayoutEstudiante
      titulo="Ruta hacia mi aula"
      subtitulo="Dinos dónde estás y te mostramos cómo llegar a tu aula o laboratorio."
    >
      {cursosCarga.error && !cursosCarga.datos ? (
        <EstadoError mensaje={cursosCarga.error} onReintentar={cursosCarga.recargar} />
      ) : !cursosCarga.datos ? (
        <EsqueletoCarga texto="Cargando tus clases…" filas={2} />
      ) : conAula.length === 0 ? (
        <Aviso tono="info">
          Todavía no tienes una clase con aula asignada, así que no hay ruta que mostrar. Consulta
          tu horario más tarde.
        </Aviso>
      ) : (
        <>
          <section
            aria-label="Punto de partida y destino"
            className="grid grid-cols-1 gap-3 rounded-xl border border-saie-divider bg-white p-4 md:grid-cols-2"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor={`${id}-desde`} className="text-sm font-medium text-saie-text">
                ¿Dónde estás?
              </label>
              <select
                id={`${id}-desde`}
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className={`${CLASE_CAMPO_MAPA} w-full`}
              >
                <option value={VALOR_ENTRADA}>En la entrada principal de la facultad</option>
                {gruposOrigen.map((g) => (
                  <optgroup key={g.titulo} label={g.titulo}>
                    {g.opciones.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.nombre}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor={`${id}-clase`} className="text-sm font-medium text-saie-text">
                ¿A qué clase vas?
              </label>
              <select
                id={`${id}-clase`}
                value={asignacionId ?? ''}
                onChange={(e) => setElegida(e.target.value)}
                className={`${CLASE_CAMPO_MAPA} w-full`}
              >
                {conAula.map((c) => (
                  <option key={c.asignacionId as string} value={c.asignacionId as string}>
                    {etiquetaDe(c)}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {rutaCarga.error && !rutaCarga.datos ? (
            <EstadoError mensaje={rutaCarga.error} onReintentar={rutaCarga.recargar} />
          ) : rutaCarga.datos ? (
            yEstasAlli ? (
              <Aviso tono="info">
                Ya estás en el aula de esta clase: no hay recorrido que mostrar.
              </Aviso>
            ) : (
              <>
                <Aviso tono="info">
                  El recorrido es de referencia: une los puntos principales, no cada pasillo.
                </Aviso>
                <VistaMapaRuta ruta={rutaCarga.datos} origen={origen} />
              </>
            )
          ) : (
            <div role="status" aria-busy="true">
              <span className="sr-only">Calculando la ruta…</span>
              <div
                aria-hidden="true"
                className="saie-esqueleto h-96 rounded-xl border border-saie-divider"
              />
            </div>
          )}
        </>
      )}
    </LayoutEstudiante>
  );
};

export default RutaAlumnoPage;

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import LayoutEstudiante from '../components/estudiante/LayoutEstudiante';
import { EsqueletoCarga } from '../components/estudiante/ElementosHorario';
import { ENLACE_PLANOS } from '../components/mapa2d/ocupacionReal';
import { rutaConIdsDePlano } from '../components/mapa2d/enlacePlano';
import { PLANOS_SVG } from '../components/mapa2d/planos';
import { ordenarPorProxima } from '../components/ruta/clases';
import { leerOrigen, origenesDeRuta } from '../components/ruta/origenes';
import { fechaActual } from '../utils/horario';
import { ORIGEN_ENTRADA, precalentarRutas, type OrigenRuta } from '../components/ruta/trazado';
import { useTrazado } from '../components/ruta/useTrazado';
import {
  ORIGEN_POR_DEFECTO,
  SelectorClase,
  SelectorOrigen,
} from '../components/ruta/SelectoresRuta';
import VistaMapaRuta from '../components/ruta/VistaMapaRuta';
import { Aviso } from '../components/ui/Aviso';
import { EstadoError } from '../components/ui/EstadoError';
import { useCarga } from '../hooks/useCarga';
import { obtenerCursos, obtenerRuta } from '../services/estudiante';

const VALOR_ENTRADA = ORIGEN_POR_DEFECTO;

/**
 * Pantalla de ruta hacia el espacio asignado (Issues 3.19 y 3.20). Primero se dice dónde se está:
 * la entrada principal de la facultad (lo habitual) o cualquier aula o espacio del plano. Luego se
 * elige una de las clases con aula y se ve el recorrido sobre el plano. El backend entrega los
 * espacios de la clase y si la ruta debe ser accesible (`GET /api/v1/estudiante/ruta/:asignacionId`);
 * el recorrido por los pasillos, el patio y los pisos se arma en el plano. Es de referencia: une
 * los puntos principales, no cada pasillo.
 */
export const RutaAlumnoPage: React.FC = () => {
  const cursosCarga = useCarga(obtenerCursos, { clave: 'cursos-para-ruta' });
  // La clase de la que se parte es la que toca ahora o la próxima, no la primera de la lista.
  const [ahora] = useState(fechaActual);
  const conAula = useMemo(
    () =>
      ordenarPorProxima(
        (cursosCarga.datos?.cursos ?? []).filter((c) => c.asignacionId),
        ahora,
      ),
    [cursosCarga.datos, ahora],
  );
  const gruposOrigen = useMemo(() => origenesDeRuta(PLANOS_SVG), []);

  const [elegida, setElegida] = useState<string | null>(null);
  const [desde, setDesde] = useState<string>(VALOR_ENTRADA);
  const [buscandoLugar, setBuscandoLugar] = useState(false);
  const asignacionId =
    conAula.find((c) => c.asignacionId === elegida)?.asignacionId ??
    conAula[0]?.asignacionId ??
    null;
  const origen: OrigenRuta = useMemo(
    () => (desde === VALOR_ENTRADA ? ORIGEN_ENTRADA : { tipo: 'espacio', ...leerOrigen(desde) }),
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
  // `useCarga` conserva lo anterior mientras llega lo nuevo (sirve en las listas). Aquí sería la
  // ruta de otra clase: solo vale la que corresponde a la clase elegida.
  const rutaVigente =
    rutaCarga.datos &&
    (rutaCarga.datos.asignacionId === undefined
      ? !rutaCarga.cargando
      : rutaCarga.datos.asignacionId === asignacionId)
      ? rutaCarga.datos
      : null;
  // El recorrido se calcula después de pintar, para poder mostrar «Calculando…» mientras tanto.
  const { trazado, calculando } = useTrazado(rutaVigente, PLANOS_SVG, origen);
  // Al abrir la pantalla se deja listo, en ratos libres, lo que la primera ruta tendría que calcular.
  useEffect(() => precalentarRutas(PLANOS_SVG), []);
  // Si dices que ya estás en el aula de la clase, no hay recorrido que dibujar.
  const yEstasAlli =
    desde !== VALOR_ENTRADA &&
    (rutaVigente?.tramos ?? []).some(
      (t) => t.tipo === 'ESPACIO_ASIGNADO' && t.espacioId === leerOrigen(desde).id,
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
            className="flex flex-col gap-5 rounded-xl border border-saie-divider bg-white p-4"
          >
            <SelectorOrigen
              grupos={gruposOrigen}
              valor={desde}
              onCambiar={setDesde}
              buscandoLugar={buscandoLugar}
              onBuscandoLugar={setBuscandoLugar}
            />
            <SelectorClase
              cursos={conAula}
              valor={asignacionId}
              onCambiar={setElegida}
              ahora={ahora}
            />
          </section>

          {rutaCarga.error && !rutaVigente ? (
            <EstadoError mensaje={rutaCarga.error} onReintentar={rutaCarga.recargar} />
          ) : rutaVigente && yEstasAlli ? (
            <Aviso tono="info">
              Ya estás en el aula de esta clase: no hay recorrido que mostrar.
            </Aviso>
          ) : rutaVigente && trazado && !calculando ? (
            <>
              <Aviso tono="info">
                El recorrido es de referencia: une los puntos principales, no cada pasillo.
              </Aviso>
              <VistaMapaRuta ruta={rutaVigente} origen={origen} trazado={trazado} />
            </>
          ) : (
            <div role="status" aria-busy="true" className="relative">
              <div
                aria-hidden="true"
                className="saie-esqueleto h-96 rounded-xl border border-saie-divider"
              />
              <p className="absolute inset-0 m-0 flex items-center justify-center text-sm font-medium text-saie-muted">
                Calculando la ruta…
              </p>
            </div>
          )}
        </>
      )}
    </LayoutEstudiante>
  );
};

export default RutaAlumnoPage;

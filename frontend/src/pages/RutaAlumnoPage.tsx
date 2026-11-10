import React, { useCallback, useId, useMemo, useState } from 'react';
import LayoutEstudiante from '../components/estudiante/LayoutEstudiante';
import { ENLACE_PLANOS } from '../components/mapa2d/ocupacionReal';
import { rutaConIdsDePlano } from '../components/mapa2d/enlacePlano';
import { PLANOS_SVG } from '../components/mapa2d/planos';
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

/**
 * Pantalla de ruta hacia el espacio asignado (Issues 3.19 y 3.20): el alumno elige una de sus
 * clases con aula y ve el recorrido que entrega `GET /api/v1/estudiante/ruta/:asignacionId`
 * sobre el plano. El backend decide si la ruta es accesible según la matrícula. El recorrido es
 * de referencia: une los puntos principales, no cada pasillo.
 */
export const RutaAlumnoPage: React.FC = () => {
  const id = useId();
  const cursosCarga = useCarga(obtenerCursos, { clave: 'cursos-para-ruta' });
  const conAula = useMemo(
    () => (cursosCarga.datos?.cursos ?? []).filter((c) => c.asignacionId),
    [cursosCarga.datos],
  );

  const [elegida, setElegida] = useState<string | null>(null);
  const asignacionId =
    conAula.find((c) => c.asignacionId === elegida)?.asignacionId ??
    conAula[0]?.asignacionId ??
    null;

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

  return (
    <LayoutEstudiante
      titulo="Ruta hacia mi aula"
      subtitulo="Cómo llegar desde la entrada del pabellón hasta tu aula o laboratorio."
    >
      {cursosCarga.error && !cursosCarga.datos ? (
        <EstadoError mensaje={cursosCarga.error} onReintentar={cursosCarga.recargar} />
      ) : !cursosCarga.datos ? (
        <p role="status" className="text-saie-muted">
          Cargando tus clases…
        </p>
      ) : conAula.length === 0 ? (
        <Aviso tono="info">
          Todavía no tienes una clase con aula asignada, así que no hay ruta que mostrar. Consulta
          tu horario más tarde.
        </Aviso>
      ) : (
        <>
          <Aviso tono="info">
            El recorrido es de referencia: une los puntos principales, no cada pasillo.
          </Aviso>

          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor={`${id}-clase`} className="text-sm font-medium text-saie-text">
              Clase
            </label>
            <select
              id={`${id}-clase`}
              value={asignacionId ?? ''}
              onChange={(e) => setElegida(e.target.value)}
              className="min-h-11 max-w-full rounded-lg border border-saie-divider bg-white px-3 text-sm text-saie-text"
            >
              {conAula.map((c) => (
                <option key={c.asignacionId as string} value={c.asignacionId as string}>
                  {etiquetaDe(c)}
                </option>
              ))}
            </select>
          </div>

          {rutaCarga.error && !rutaCarga.datos ? (
            <EstadoError mensaje={rutaCarga.error} onReintentar={rutaCarga.recargar} />
          ) : rutaCarga.datos ? (
            <VistaMapaRuta ruta={rutaCarga.datos} />
          ) : (
            <p role="status" className="text-saie-muted">
              Calculando la ruta…
            </p>
          )}
        </>
      )}
    </LayoutEstudiante>
  );
};

export default RutaAlumnoPage;

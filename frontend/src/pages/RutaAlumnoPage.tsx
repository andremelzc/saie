import React, { useId, useMemo, useState } from 'react';
import LayoutEstudiante from '../components/estudiante/LayoutEstudiante';
import VistaMapaRuta from '../components/ruta/VistaMapaRuta';
import { ASIGNACIONES_EJEMPLO, rutaDeEjemplo } from '../components/ruta/rutaEjemplo';
import { Aviso } from '../components/ui/Aviso';

/**
 * Pantalla de ruta hacia el espacio asignado (Issue 3.19): plano del piso con el recorrido, la
 * entrada del pabellón como punto de partida, el destino y el tiempo estimado. Todavía usa datos
 * de ejemplo con la forma de `RutaReferenciaDTO`; se conecta con
 * `GET /api/v1/estudiante/ruta/:asignacionId` en el Issue 3.20.
 */
export const RutaAlumnoPage: React.FC = () => {
  const id = useId();
  const [asignacionId, setAsignacionId] = useState(ASIGNACIONES_EJEMPLO[0].id);
  const [accesible, setAccesible] = useState(false);
  const asignacion =
    ASIGNACIONES_EJEMPLO.find((a) => a.id === asignacionId) ?? ASIGNACIONES_EJEMPLO[0];
  const ruta = useMemo(() => rutaDeEjemplo(asignacion, accesible), [asignacion, accesible]);

  return (
    <LayoutEstudiante
      titulo="Ruta hacia mi aula"
      subtitulo="Cómo llegar desde la entrada del pabellón hasta tu aula o laboratorio."
    >
      <Aviso tono="info">
        Estás viendo datos de ejemplo: la ruta se conectará con tus clases reales en el siguiente
        paso. El recorrido es de referencia: une los puntos principales, no cada pasillo.
      </Aviso>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={`${id}-clase`} className="text-sm font-medium text-saie-text">
            Clase de ejemplo
          </label>
          <select
            id={`${id}-clase`}
            value={asignacionId}
            onChange={(e) => setAsignacionId(e.target.value)}
            className="min-h-11 max-w-full rounded-lg border border-saie-divider bg-white px-3 text-sm text-saie-text"
          >
            {ASIGNACIONES_EJEMPLO.map((a) => (
              <option key={a.id} value={a.id}>
                {a.etiqueta}
              </option>
            ))}
          </select>
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-saie-text">
          <input
            type="checkbox"
            checked={accesible}
            onChange={(e) => setAccesible(e.target.checked)}
            className="h-5 w-5"
          />
          Necesito una ruta accesible (ascensor)
        </label>
      </div>

      <VistaMapaRuta ruta={ruta} />
    </LayoutEstudiante>
  );
};

export default RutaAlumnoPage;

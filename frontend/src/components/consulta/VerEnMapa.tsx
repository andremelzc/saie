import React, { useId, useMemo, useState } from 'react';
import type { EspacioAsignadoDTO } from '../../types/consulta';
import { resolverIdPlano } from '../../utils/plano';
import PlanoPiso from '../estudiante/PlanoPiso';

/**
 * Botón «Ver en mapa» (HU-03): abre el plano del piso de la clase con su espacio resaltado; si la
 * sección ocupa un bloque de salas contiguas, todas aparecen resaltadas. Funciona sin sesión.
 */
export const VerEnMapa: React.FC<{ espacios: EspacioAsignadoDTO[] }> = ({ espacios }) => {
  const [abierto, setAbierto] = useState(false);
  const idPanel = useId();

  const piso = espacios[0]?.piso;
  const delPiso = useMemo(() => espacios.filter((e) => e.piso === piso), [espacios, piso]);
  const ids = useMemo(
    () => delPiso.map((e) => resolverIdPlano(e.pabellon, e.identificador, e.piso)),
    [delPiso],
  );

  if (espacios.length === 0 || piso === undefined) return null;

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        aria-expanded={abierto}
        aria-controls={idPanel}
        onClick={() => setAbierto((v) => !v)}
        className="inline-flex min-h-11 w-fit cursor-pointer items-center gap-2 rounded-xl border border-saie-primary bg-white px-4 text-sm font-medium text-saie-primary hover:bg-saie-canvas"
      >
        {abierto ? 'Ocultar mapa' : 'Ver en mapa'}
      </button>
      {abierto && (
        <div id={idPanel} className="flex flex-col gap-2">
          <PlanoPiso
            piso={piso}
            etiqueta={`Plano del piso ${piso} con el espacio resaltado`}
            espacios={delPiso.map((e, i) => ({ id: ids[i], tipo: e.tipo }))}
            resaltados={ids}
            fallback={
              <p role="status" className="m-0 p-4 text-sm text-saie-text">
                Tu navegador no puede mostrar el plano en 3D.
              </p>
            }
          />
          <p className="m-0 text-sm text-saie-muted">
            {delPiso.length > 1
              ? `Salas resaltadas: ${delPiso.map((e) => e.identificador).join(', ')} (piso ${piso}).`
              : `Espacio resaltado: ${delPiso[0].identificador} (piso ${piso}).`}
          </p>
        </div>
      )}
    </div>
  );
};

export default VerEnMapa;

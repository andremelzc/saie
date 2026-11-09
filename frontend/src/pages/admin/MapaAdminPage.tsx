import React, { useMemo } from 'react';
import LayoutAdmin from '../../components/admin/LayoutAdmin';
import VistaMapa from '../../components/mapa2d/VistaMapa';
import PanelEspacio from '../../components/mapa2d/PanelEspacio';
import { espaciosDeEjemplo } from '../../components/mapa2d/datosEjemplo';
import { semillaDeFranja } from '../../components/mapa2d/franja';
import { PLANOS_SVG } from '../../components/mapa2d/planos';
import { Aviso } from '../../components/ui/Aviso';
import { useMapaEnUrl } from '../../hooks/useMapaEnUrl';

/**
 * Mapa visual de ocupación por piso para Coordinación (Issue 4.13): el plano de cada piso con
 * los espacios coloreados según su estado y el detalle al elegir uno. La vista, el piso, el
 * espacio y la franja viajan en la URL. Todavía usa datos de ejemplo; se conecta con el endpoint
 * de ocupación en el Issue 4.14 (la franja ya usa los nombres del endpoint: dia, horaInicio, horaFin).
 */
export const MapaAdminPage: React.FC = () => {
  const url = useMapaEnUrl();
  const semilla = semillaDeFranja(url.franja);
  const espacios = useMemo(() => espaciosDeEjemplo(PLANOS_SVG, { semilla }), [semilla]);

  return (
    <LayoutAdmin titulo="Mapa de ocupación por piso" subtitulo="Coordinación Académica">
      <div className="flex flex-col gap-4">
        <Aviso tono="info">
          Estás viendo datos de ejemplo: el mapa se conectará con la ocupación real en el siguiente
          paso.
        </Aviso>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <VistaMapa
            espacios={espacios}
            seleccionado={url.espacio}
            onSeleccionar={url.setEspacio}
            vista={url.vista}
            onVistaCambiada={url.setVista}
            piso={url.piso}
            onPisoCambiado={url.setPiso}
            franja={url.franja}
            onFranjaCambiada={url.setFranja}
          />
          <PanelEspacio
            espacio={espacios.find((e) => e.id === url.espacio)}
            onCerrar={() => url.setEspacio(null)}
            hojaMovil
            className="self-start max-lg:bottom-3"
          />
        </div>
      </div>
    </LayoutAdmin>
  );
};

export default MapaAdminPage;

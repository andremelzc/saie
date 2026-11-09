import React, { useMemo, useState } from 'react';
import LayoutAdmin from '../../components/admin/LayoutAdmin';
import VistaMapa from '../../components/mapa2d/VistaMapa';
import PanelEspacio from '../../components/mapa2d/PanelEspacio';
import { espaciosDeEjemplo } from '../../components/mapa2d/datosEjemplo';
import { PLANOS_SVG } from '../../components/mapa2d/planos';
import { Aviso } from '../../components/ui/Aviso';

/**
 * Mapa visual de ocupación por piso para Coordinación (Issue 4.13): el plano de cada piso con
 * los espacios coloreados según su estado y el detalle al elegir uno. Todavía usa datos de
 * ejemplo; se conecta con el endpoint de ocupación en el Issue 4.14.
 */
export const MapaAdminPage: React.FC = () => {
  const espacios = useMemo(() => espaciosDeEjemplo(PLANOS_SVG), []);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);

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
            seleccionado={seleccionado}
            onSeleccionar={setSeleccionado}
          />
          <PanelEspacio
            espacio={espacios.find((e) => e.id === seleccionado)}
            onCerrar={() => setSeleccionado(null)}
            className="self-start"
          />
        </div>
      </div>
    </LayoutAdmin>
  );
};

export default MapaAdminPage;

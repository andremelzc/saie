import React, { useMemo, useState } from 'react';
import LayoutEstudiante from '../components/estudiante/LayoutEstudiante';
import VistaMapa from '../components/mapa2d/VistaMapa';
import PanelEspacio from '../components/mapa2d/PanelEspacio';
import { espaciosDeEjemplo } from '../components/mapa2d/datosEjemplo';
import { PLANOS_SVG } from '../components/mapa2d/planos';
import { Aviso } from '../components/ui/Aviso';

/**
 * Mapa de ocupación del alumno (Issue 3.18): solo lectura, por piso y pabellón, con el estado de
 * cada aula y laboratorio (disponible u ocupado). Todavía usa datos de ejemplo; se conecta con
 * `GET /api/v1/estudiante/mapa-ocupacion` en el Issue 3.20.
 */
export const MapaOcupacionPage: React.FC = () => {
  const espacios = useMemo(() => espaciosDeEjemplo(PLANOS_SVG, { conAlertas: false }), []);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);

  return (
    <LayoutEstudiante
      titulo="Mapa de ocupación"
      subtitulo="Consulta qué aulas y laboratorios están libres, por piso y pabellón."
    >
      <Aviso tono="info">
        Estás viendo datos de ejemplo: el mapa se conectará con la ocupación real en el siguiente
        paso.
      </Aviso>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <VistaMapa
          espacios={espacios}
          seleccionado={seleccionado}
          onSeleccionar={setSeleccionado}
          estadosLeyenda={['DISPONIBLE', 'OCUPADO']}
        />
        <PanelEspacio
          espacio={espacios.find((e) => e.id === seleccionado)}
          onCerrar={() => setSeleccionado(null)}
          className="self-start"
        />
      </div>
    </LayoutEstudiante>
  );
};

export default MapaOcupacionPage;

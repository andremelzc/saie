import React, { useMemo } from 'react';
import LayoutEstudiante from '../components/estudiante/LayoutEstudiante';
import VistaMapa from '../components/mapa2d/VistaMapa';
import PanelEspacio from '../components/mapa2d/PanelEspacio';
import { espaciosDeEjemplo } from '../components/mapa2d/datosEjemplo';
import { semillaDeFranja } from '../components/mapa2d/franja';
import { PLANOS_SVG } from '../components/mapa2d/planos';
import { Aviso } from '../components/ui/Aviso';
import { useMapaEnUrl } from '../hooks/useMapaEnUrl';

/**
 * Mapa de ocupación del alumno (Issue 3.18): solo lectura, por piso y pabellón, con el estado de
 * cada aula y laboratorio (disponible u ocupado). La vista, el piso, el espacio y la franja viajan
 * en la URL. Todavía usa datos de ejemplo; se conecta con `GET /api/v1/estudiante/mapa-ocupacion`
 * en el Issue 3.20 (la franja ya usa los nombres del endpoint: dia, horaInicio, horaFin).
 */
export const MapaOcupacionPage: React.FC = () => {
  const url = useMapaEnUrl();
  const semilla = semillaDeFranja(url.franja);
  const espacios = useMemo(
    () => espaciosDeEjemplo(PLANOS_SVG, { conAlertas: false, semilla }),
    [semilla],
  );

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
          seleccionado={url.espacio}
          onSeleccionar={url.setEspacio}
          estadosLeyenda={['DISPONIBLE', 'OCUPADO']}
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
          className="self-start max-lg:bottom-24"
        />
      </div>
    </LayoutEstudiante>
  );
};

export default MapaOcupacionPage;

import React from 'react';
import LayoutEstudiante from '../components/estudiante/LayoutEstudiante';
import VistaMapa from '../components/mapa2d/VistaMapa';
import PanelEspacio from '../components/mapa2d/PanelEspacio';
import { EstadoError } from '../components/ui/EstadoError';
import { ZonaActualizable } from '../components/ui/ZonaActualizable';
import { useMapaEnUrl } from '../hooks/useMapaEnUrl';
import { useOcupacionMapa } from '../hooks/useOcupacionMapa';
import { obtenerMapaOcupacion } from '../services/estudiante';

/**
 * Mapa de ocupación del alumno (Issue 3.18): solo lectura, por piso y pabellón, con el estado de
 * cada aula y laboratorio (disponible u ocupado) que entrega `GET /api/v1/estudiante/mapa-ocupacion`
 * (Issue 3.13). La vista, el piso, el espacio y la franja viajan en la URL; sin franja, es el
 * momento actual en hora de Lima.
 */
export const MapaOcupacionPage: React.FC = () => {
  const url = useMapaEnUrl();
  const { datos, cargando, error, recargar } = useOcupacionMapa(
    obtenerMapaOcupacion,
    'alumno',
    url.franja,
  );
  const espacios = datos?.espacios;

  return (
    <LayoutEstudiante
      titulo="Mapa de ocupación"
      subtitulo="Consulta qué aulas y laboratorios están libres, por piso y pabellón."
    >
      {!espacios ? (
        error ? (
          <EstadoError mensaje={error} onReintentar={recargar} />
        ) : (
          <p role="status" className="text-saie-muted">
            Cargando el mapa…
          </p>
        )
      ) : (
        <ZonaActualizable actualizando={cargando}>
          {error && <EstadoError mensaje={error} onReintentar={recargar} />}
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
        </ZonaActualizable>
      )}
    </LayoutEstudiante>
  );
};

export default MapaOcupacionPage;

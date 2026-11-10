import React from 'react';
import LayoutAdmin from '../../components/admin/LayoutAdmin';
import VistaMapa from '../../components/mapa2d/VistaMapa';
import PanelEspacio from '../../components/mapa2d/PanelEspacio';
import { Aviso } from '../../components/ui/Aviso';
import { EsqueletoCarga } from '../../components/ui/EstadosCarga';
import { EstadoError } from '../../components/ui/EstadoError';
import { ZonaActualizable } from '../../components/ui/ZonaActualizable';
import { useMapaEnUrl } from '../../hooks/useMapaEnUrl';
import { useOcupacionMapa } from '../../hooks/useOcupacionMapa';
import { obtenerMapaOcupacionAdmin } from '../../services/admin';

/**
 * Mapa visual de ocupación por piso para Coordinación (Issues 4.13 y 4.14): el plano de cada
 * piso con los espacios coloreados según su estado real (`GET /api/v1/admin/mapa-ocupacion`) y el
 * detalle (sección, docente o alerta) al elegir uno. La vista, el piso, el espacio y la franja
 * viajan en la URL; sin franja, es el momento actual.
 */
export const MapaAdminPage: React.FC = () => {
  const url = useMapaEnUrl();
  const { datos, cargando, error, recargar } = useOcupacionMapa(
    obtenerMapaOcupacionAdmin,
    'admin',
    url.franja,
  );
  const espacios = datos?.espacios;

  return (
    <LayoutAdmin titulo="Mapa de ocupación por piso" subtitulo="Coordinación Académica">
      {!espacios ? (
        error ? (
          <EstadoError mensaje={error} onReintentar={recargar} />
        ) : (
          <EsqueletoCarga texto="Cargando el mapa…" forma="texto" filas={6} />
        )
      ) : (
        <ZonaActualizable actualizando={cargando}>
          <div className="flex flex-col gap-4">
            {error && <EstadoError mensaje={error} onReintentar={recargar} />}
            {datos.sinFigura.length > 0 && (
              <Aviso tono="info">
                El plano no dibuja estos espacios, así que no aparecen en el mapa:{' '}
                {datos.sinFigura.join(', ')}.
              </Aviso>
            )}
            {datos.deshabilitados.length > 0 && (
              <Aviso tono="info">
                Fuera de servicio (se ven sin datos): {datos.deshabilitados.join(', ')}.
              </Aviso>
            )}
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
        </ZonaActualizable>
      )}
    </LayoutAdmin>
  );
};

export default MapaAdminPage;

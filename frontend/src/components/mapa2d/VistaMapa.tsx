import React, { useState } from 'react';
import { SelectorSegmentado } from '../estudiante/SelectorSegmentado';
import Mapa3DLazy from '../mapa3d/Mapa3DLazy';
import type { EstadoOcupacion } from '../mapa3d/tipos';
import Mapa2D, { LeyendaMapa } from './Mapa2D';
import VentanaMapa from './VentanaMapa';
import { ESTADO_TEXTO, type EspacioMapa2D } from './etiquetas';
import { PLANOS_SVG, PLANOS_URL } from './planos';

type Vista = '2d' | '3d';
type Piso = number | 'todos';

const OPCIONES: { valor: Vista; etiqueta: string }[] = [
  { valor: '2d', etiqueta: 'Plano 2D' },
  { valor: '3d', etiqueta: 'Maqueta 3D' },
];

const TRAZO_AMPLIAR = 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5';

export interface VistaMapaProps {
  espacios: EspacioMapa2D[];
  seleccionado: string | null;
  onSeleccionar: (id: string | null) => void;
  resaltados?: string[];
  /** Estados que muestra la leyenda del plano 2D. */
  estadosLeyenda?: EstadoOcupacion[];
}

/**
 * Mapa de ocupación con dos vistas sobre los mismos planos: el plano 2D (por defecto) y la
 * maqueta 3D opcional, que se descarga solo al elegirla y, sin WebGL, muestra el plano 2D. La
 * selección, la vista y el piso son los mismos dentro y fuera de la ventana ampliada, que cubre
 * casi toda la página y deja solo el mapa.
 */
export const VistaMapa: React.FC<VistaMapaProps> = ({
  espacios,
  seleccionado,
  onSeleccionar,
  resaltados,
  estadosLeyenda,
}) => {
  const [vista, setVista] = useState<Vista>('2d');
  const [piso, setPiso] = useState<Piso | undefined>(undefined);
  const [ampliado, setAmpliado] = useState(false);
  const elegido = espacios.find((e) => e.id === seleccionado);

  const selector = (orientacion: 'horizontal' | 'vertical') => (
    <SelectorSegmentado
      etiquetaGrupo="Vista del mapa"
      opciones={OPCIONES}
      valor={vista}
      onCambiar={setVista}
      orientacion={orientacion}
      className={orientacion === 'vertical' ? 'w-full' : ''}
    />
  );
  const descripcion = (
    <p aria-live="polite" className="m-0 text-sm text-saie-text">
      {elegido
        ? `${elegido.nombre ?? elegido.id}: ${ESTADO_TEXTO[elegido.estado].toLowerCase()}`
        : 'Elige un aula o laboratorio para ver su estado.'}
    </p>
  );

  const mapa = (enVentana: boolean) =>
    vista === '2d' ? (
      <Mapa2D
        planos={PLANOS_SVG}
        espacios={espacios}
        seleccionado={seleccionado}
        resaltados={resaltados}
        onSeleccionar={onSeleccionar}
        estadosLeyenda={estadosLeyenda}
        pisoInicial={typeof piso === 'number' ? piso : undefined}
        onPisoCambiado={setPiso}
        disposicion={enVentana ? 'lateral' : 'arriba'}
        barraLateral={enVentana ? selector('vertical') : undefined}
        pieLateral={enVentana ? descripcion : undefined}
      />
    ) : (
      <div
        className={`overflow-hidden rounded-xl border border-saie-divider bg-white ${
          enVentana ? 'h-[calc(100vh-8rem)] min-h-96' : 'h-[70vh] min-h-96'
        }`}
      >
        <Mapa3DLazy
          planos={PLANOS_URL}
          espacios={espacios}
          seleccionado={seleccionado}
          resaltados={resaltados}
          onSeleccionar={onSeleccionar}
          pisoInicial={piso ?? 'todos'}
          onPisoCambiado={setPiso}
          fallback={
            <Mapa2D
              planos={PLANOS_SVG}
              espacios={espacios}
              seleccionado={seleccionado}
              resaltados={resaltados}
              onSeleccionar={onSeleccionar}
              estadosLeyenda={estadosLeyenda}
              pisoInicial={typeof piso === 'number' ? piso : undefined}
              onPisoCambiado={setPiso}
            />
          }
        />
      </div>
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {selector('horizontal')}
        <button
          type="button"
          onClick={() => setAmpliado(true)}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-saie-divider bg-white px-4 text-sm font-medium text-saie-text hover:bg-saie-primary/5"
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={TRAZO_AMPLIAR} />
          </svg>
          Ampliar mapa
        </button>
      </div>

      {ampliado ? (
        <>
          <p className="m-0 rounded-xl border border-dashed border-saie-divider p-6 text-center text-sm text-saie-muted">
            El mapa está ampliado.
          </p>
          <VentanaMapa titulo="Mapa de ocupación" onCerrar={() => setAmpliado(false)}>
            {vista === '2d' ? (
              mapa(true)
            ) : (
              // La maqueta ocupa la altura de la ventana y los controles quedan a un lado.
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                <div className="order-2 min-w-0 flex-1 lg:order-1">{mapa(true)}</div>
                <aside
                  aria-label="Controles del mapa"
                  className="order-1 flex flex-col gap-4 lg:order-2 lg:w-60 lg:shrink-0"
                >
                  {selector('vertical')}
                  <LeyendaMapa estados={estadosLeyenda} vertical />
                  {descripcion}
                </aside>
              </div>
            )}
          </VentanaMapa>
        </>
      ) : (
        mapa(false)
      )}
    </div>
  );
};

export default VistaMapa;

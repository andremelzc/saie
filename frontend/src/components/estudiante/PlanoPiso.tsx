import React, { useState } from 'react';
import Mapa3DLazy from '../mapa3d/Mapa3DLazy';
import LeyendaPlano from './LeyendaPlano';
import Plano2D from './Plano2D';
import type { EspacioPlano } from './Plano2D';
import SelectorSegmentado from './SelectorSegmentado';
import type { OpcionSegmentada } from './SelectorSegmentado';
import plano1 from '@planos/piso-1.svg?url';
import plano2 from '@planos/piso-2.svg?url';
import plano3 from '@planos/piso-3.svg?url';

const PLANOS_3D: Record<number, string> = { 1: plano1, 2: plano2, 3: plano3 };

const sinAviso = () => {};

type Modo = '2d' | '3d';

const OPCIONES_MODO: OpcionSegmentada<Modo>[] = [
  { valor: '2d', etiqueta: 'Plano' },
  { valor: '3d', etiqueta: 'Maqueta 3D' },
];

export interface PlanoPisoProps {
  /** Piso que se muestra. */
  piso: number;
  /** Espacios del piso; `id` es el id de la figura en el plano. Sin `estado`, solo se ubican. */
  espacios: EspacioPlano[];
  /** Ids a resaltar (el espacio o el bloque de salas del alumno). */
  resaltados?: string[];
  seleccionado?: string | null;
  onSeleccionar?: (id: string | null) => void;
  /** Qué mostrar si el navegador no tiene WebGL (solo en la maqueta 3D). */
  fallback: React.ReactNode;
  etiqueta: string;
  className?: string;
}

/**
 * Plano del piso con los espacios dados. Por defecto es un plano 2D claro, con leyenda, que se
 * puede acercar y tocar; la maqueta 3D queda como vista alternativa para quien la quiera.
 */
export const PlanoPiso: React.FC<PlanoPisoProps> = ({
  piso,
  espacios,
  resaltados = [],
  seleccionado = null,
  onSeleccionar,
  fallback,
  etiqueta,
  className = '',
}) => {
  const [modo, setModo] = useState<Modo>('2d');
  const conEstados = espacios.some((e) => e.estado !== undefined);

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LeyendaPlano conEstados={conEstados} conMiAula={resaltados.length > 0} />
        <SelectorSegmentado
          opciones={OPCIONES_MODO}
          valor={modo}
          onCambiar={setModo}
          etiquetaGrupo="Tipo de vista del plano"
        />
      </div>

      {modo === '2d' ? (
        <Plano2D
          piso={piso}
          etiqueta={etiqueta}
          espacios={espacios}
          resaltados={resaltados}
          seleccionado={seleccionado}
          onSeleccionar={onSeleccionar}
        />
      ) : (
        <div
          role="group"
          aria-label={`${etiqueta} (maqueta 3D)`}
          className="h-[60vh] min-h-80 overflow-hidden rounded-2xl border border-saie-divider bg-white"
        >
          <Mapa3DLazy
            planos={PLANOS_3D}
            espacios={espacios.map((e) => ({
              id: e.id,
              tipo: e.tipo,
              estado: e.estado ?? 'DISPONIBLE',
            }))}
            resaltados={resaltados}
            {...(onSeleccionar ? { seleccionado, onSeleccionar } : {})}
            pisoInicial={piso}
            onAviso={sinAviso}
            fallback={fallback}
          />
        </div>
      )}
    </div>
  );
};

export default PlanoPiso;

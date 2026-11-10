import React from 'react';
import { BadgeEstado, type TonoBadge } from '../ui/BadgeEstado';
import type { EstadoOcupacion } from '../mapa3d/tipos';
import { ESTADO_TEXTO, PABELLON_TEXTO, TIPO_TEXTO, type EspacioMapa2D } from './etiquetas';
import { pabellonDe } from './plano';

const TONO: Record<EstadoOcupacion, TonoBadge> = {
  DISPONIBLE: 'exito',
  OCUPADO: 'neutro',
  ALERTA_ACTIVA: 'advertencia',
};

export interface PanelEspacioProps {
  /** Espacio elegido en el mapa, o `undefined` si no hay ninguno. */
  espacio?: EspacioMapa2D;
  /** Texto cuando no hay selección. */
  vacio?: string;
  /** Si se da, aparece el botón «Cerrar detalle». */
  onCerrar?: () => void;
  /**
   * En pantallas pequeñas, con un espacio elegido, el detalle se fija sobre el borde inferior (como
   * una hoja) en vez de quedar bajo el mapa. La posición vertical se da en `className`.
   */
  hojaMovil?: boolean;
  className?: string;
}

/** Detalle del espacio elegido en el mapa. Es una región `aria-live`: anuncia cada cambio. */
export const PanelEspacio: React.FC<PanelEspacioProps> = ({
  espacio,
  vacio = 'Elige un aula o laboratorio del plano para ver su detalle.',
  onCerrar,
  hojaMovil = false,
  className = '',
}) => {
  const pabellon = espacio ? pabellonDe(espacio.id) : null;
  return (
    <aside
      aria-label="Detalle del espacio"
      aria-live="polite"
      className={`rounded-xl border border-saie-divider bg-white p-5 shadow-sm ${
        hojaMovil && espacio
          ? 'max-lg:fixed max-lg:inset-x-3 max-lg:z-40 max-lg:max-h-[45vh] max-lg:overflow-auto max-lg:shadow-lg'
          : ''
      } ${className}`}
    >
      {!espacio ? (
        <p className="text-sm text-saie-muted">{vacio}</p>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold text-saie-text">{espacio.nombre ?? espacio.id}</h2>
            {onCerrar && (
              <button
                type="button"
                onClick={onCerrar}
                className="min-h-11 shrink-0 rounded-lg px-3 text-sm font-medium text-saie-primary hover:bg-saie-primary/5"
              >
                Cerrar detalle
              </button>
            )}
          </div>
          <div className="mt-2">
            <BadgeEstado tono={TONO[espacio.estado]}>{ESTADO_TEXTO[espacio.estado]}</BadgeEstado>
          </div>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-saie-muted">Código</dt>
            <dd className="font-medium text-saie-text">{espacio.id}</dd>
            <dt className="text-saie-muted">Tipo</dt>
            <dd className="font-medium text-saie-text">{TIPO_TEXTO[espacio.tipo]}</dd>
            {pabellon && (
              <>
                <dt className="text-saie-muted">Pabellón</dt>
                <dd className="font-medium text-saie-text">{PABELLON_TEXTO[pabellon]}</dd>
              </>
            )}
            {espacio.piso !== undefined && (
              <>
                <dt className="text-saie-muted">Piso</dt>
                <dd className="font-medium text-saie-text">{espacio.piso}</dd>
              </>
            )}
            {espacio.aforo !== undefined && (
              <>
                <dt className="text-saie-muted">Aforo</dt>
                <dd className="font-medium text-saie-text">{espacio.aforo} personas</dd>
              </>
            )}
            {espacio.detalle && (
              <>
                <dt className="text-saie-muted">Detalle</dt>
                <dd className="font-medium text-saie-text">{espacio.detalle}</dd>
              </>
            )}
          </dl>
        </>
      )}
    </aside>
  );
};

export default PanelEspacio;

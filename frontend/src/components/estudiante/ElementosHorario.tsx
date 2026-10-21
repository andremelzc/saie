import React from 'react';
import type { EspacioAsignadoDTO } from '../../types/consulta';
import type { EstadoAsignacionDTO } from '../../types/horario';
import { estadoAMostrar, etiquetaTipoEspacio } from '../../utils/horario';
import { ESTADO_CLASE_ASIGNADA } from '../../utils/etiquetas';
import { BadgeEstado } from '../ui/BadgeEstado';
import type { EstadoClase } from '../../utils/horario';

/** Trazos de íconos lineales (24 px, trazo de 2 px) usados en las vistas del alumno. */
const TRAZO_PIN =
  'M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z';
const TRAZO_CALENDARIO =
  'M8 7V3m8 4V3M4 11h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z';

export const Icono: React.FC<{ trazo: string; className?: string }> = ({
  trazo,
  className = 'h-3.5 w-3.5',
}) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d={trazo} />
  </svg>
);

const CLASES_BADGE =
  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium tracking-[0.2px]';

/**
 * Badge de estado de la asignación. Usa el badge y el vocabulario comunes, así un mismo estado se
 * ve igual en el horario, en la consulta pública y en el panel.
 */
export const BadgeEstadoAsignacion: React.FC<{ estado: EstadoAsignacionDTO }> = ({ estado }) => {
  const { etiqueta, tono } = ESTADO_CLASE_ASIGNADA[estado];
  return <BadgeEstado tono={tono}>{etiqueta}</BadgeEstado>;
};

const ESTILOS_CLASE: Record<EstadoClase, { etiqueta: string; clases: string }> = {
  EN_CURSO: { etiqueta: 'En curso', clases: 'bg-saie-primary text-white' },
  PROXIMA: { etiqueta: 'Próxima', clases: 'bg-saie-primary/10 text-saie-primary' },
  FINALIZADA: { etiqueta: 'Finalizada', clases: 'bg-saie-canvas text-saie-muted' },
};

/** Estado de una clase del día (en curso, próxima o finalizada). */
export const BadgeEstadoClase: React.FC<{ estado: EstadoClase }> = ({ estado }) => {
  const { etiqueta, clases } = ESTILOS_CLASE[estado];
  return <span className={`${CLASES_BADGE} ${clases}`}>{etiqueta}</span>;
};

export interface UbicacionEspaciosProps {
  espacios: EspacioAsignadoDTO[];
  estado: EstadoAsignacionDTO;
  className?: string;
}

/** Lista de espacios asignados, o el badge de «Sin aula asignada». */
export const UbicacionEspacios: React.FC<UbicacionEspaciosProps> = ({
  espacios,
  estado,
  className = '',
}) => {
  const estadoBadge = estadoAMostrar(estado, espacios.length);

  return (
    <div className={`flex flex-col items-start gap-1.5 ${className}`}>
      {espacios.map((espacio) => (
        <p key={espacio.id} className="m-0 flex items-start gap-1.5 text-sm text-saie-text">
          <Icono trazo={TRAZO_PIN} className="mt-0.5 h-4 w-4 shrink-0 text-saie-primary" />
          <span>
            <strong className="font-semibold">
              {`${etiquetaTipoEspacio(espacio.tipo)} ${espacio.identificador}`}
            </strong>
            <span className="text-saie-muted">
              {` · ${espacio.pabellon}, piso ${espacio.piso}`}
            </span>
          </span>
        </p>
      ))}
      {estadoBadge && <BadgeEstadoAsignacion estado={estadoBadge} />}
    </div>
  );
};

export interface EstadoVacioProps {
  titulo: string;
  descripcion: string;
  /** Acción que resuelve el vacío (p. ej. «Limpiar filtros» o «Ir a Carga de datos»). */
  accion?: React.ReactNode;
}

/** Estado vacío uniforme (Guía de diseño 1.7): título breve, explicación y salida. */
export const EstadoVacio: React.FC<EstadoVacioProps> = ({ titulo, descripcion, accion }) => (
  <div
    role="status"
    className="saie-fundido flex flex-col items-center gap-2 rounded-2xl border border-dashed border-saie-divider bg-white px-6 py-10 text-center"
  >
    <span
      aria-hidden="true"
      className="saie-flota flex h-16 w-16 items-center justify-center rounded-2xl bg-saie-canvas text-saie-primary"
    >
      <Icono trazo={TRAZO_CALENDARIO} className="h-8 w-8" />
    </span>
    <h3 className="m-0 font-serif text-xl font-bold text-saie-text">{titulo}</h3>
    <p className="m-0 max-w-sm text-sm text-saie-muted">{descripcion}</p>
    {accion && <div className="mt-2">{accion}</div>}
  </div>
);

/** Esqueleto de carga con la forma del contenido; respeta «Reducir movimiento». */
export const EsqueletoCarga: React.FC<{ texto?: string }> = ({
  texto = 'Cargando tu horario…',
}) => (
  <div role="status" aria-busy="true" className="flex flex-col gap-3">
    <span className="sr-only">{texto}</span>
    {[0, 1, 2].map((posicion) => (
      <div
        key={posicion}
        aria-hidden="true"
        className="saie-esqueleto h-24 rounded-xl border border-saie-divider"
      />
    ))}
  </div>
);

/** Barra con el avance de la clase en curso (0 a 1). */
export const BarraProgresoClase: React.FC<{ valor: number; className?: string }> = ({
  valor,
  className = '',
}) => {
  const porcentaje = Math.round(Math.min(1, Math.max(0, valor)) * 100);
  return (
    <span
      role="progressbar"
      aria-label="Avance de la clase"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={porcentaje}
      className={`block h-1.5 w-full overflow-hidden rounded-full bg-saie-primary/10 ${className}`}
    >
      <span
        className="saie-barra block h-full rounded-full bg-saie-primary"
        style={{ width: `${porcentaje}%` }}
      />
    </span>
  );
};

/** Punto guinda con un anillo que se expande: la clase está en curso ahora mismo. */
export const PuntoEnVivo: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span
    aria-hidden="true"
    className={`saie-vivo inline-block h-2.5 w-2.5 rounded-full bg-saie-primary text-saie-primary ${className}`}
  />
);

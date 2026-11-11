import React from 'react';
import type { EspacioAsignadoDTO } from '../../types/consulta';
import type { EstadoAsignacionDTO } from '../../types/horario';
import { estadoAMostrar, etiquetaTipoEspacio } from '../../utils/horario';
import type { EstadoClase } from '../../utils/horario';
import { EstadoAsignacion } from '../ui/EstadoAsignacion';
import { Icono } from '../ui/Icono';

// Se reexportan para no romper las importaciones del portal del alumno y del docente.
export { Icono } from '../ui/Icono';
export { EsqueletoCarga, EstadoVacio } from '../ui/EstadosCarga';
export type { EstadoVacioProps, FormaEsqueleto } from '../ui/EstadosCarga';

/** Trazos de íconos lineales (24 px, trazo de 2 px) usados en las vistas del alumno. */
const TRAZO_PIN =
  'M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z';

const CLASES_BADGE =
  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium tracking-[0.2px]';

const ESTILOS_CLASE: Record<EstadoClase, { etiqueta: string; clases: string }> = {
  EN_CURSO: { etiqueta: 'En curso', clases: 'bg-saie-primary text-white' },
  PROXIMA: { etiqueta: 'Próxima', clases: 'bg-saie-primary/10 text-saie-primary' },
  FINALIZADA: { etiqueta: 'Finalizada', clases: 'bg-saie-canvas-dark text-saie-muted' },
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
      {estadoBadge && <EstadoAsignacion estado={estadoBadge} />}
    </div>
  );
};

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

import React from 'react';
import BadgeEstado from './BadgeEstado';
import { describirEstadoAsignacion } from '../../utils/diccionarios';

export interface EstadoAsignacionProps {
  /** Código del backend (VIGENTE, ESCALADA, PENDIENTE, HISTORICA). Sin asignación = null. */
  estado: string | null | undefined;
  /**
   * Cantidad de espacios que trae la asignación. Si se informa y es 0, una asignación VIGENTE
   * se muestra como «Sin aula asignada»: nunca se presenta como confirmada sin un espacio.
   */
  cantidadEspacios?: number;
  className?: string;
  conIcono?: boolean;
  tamano?: 'sm' | 'md';
}

/** Código que corresponde mostrar, según el estado y los espacios que realmente llegaron. */
function codigoEstadoAsignacion(
  estado: string | null | undefined,
  cantidadEspacios?: number,
): string {
  if (!estado) return 'PENDIENTE';
  if (estado === 'VIGENTE' && cantidadEspacios === 0) return 'PENDIENTE';
  return estado;
}

/**
 * Único badge del estado de una asignación (Issue 3.57, hallazgo VIS-02). Texto y tono salen
 * del diccionario `ESTADO_ASIGNACION`; el color, el ícono y el texto los pone `BadgeEstado`.
 */
export const EstadoAsignacion: React.FC<EstadoAsignacionProps> = ({
  estado,
  cantidadEspacios,
  className,
  conIcono,
  tamano,
}) => {
  const { etiqueta, tono } = describirEstadoAsignacion(
    codigoEstadoAsignacion(estado, cantidadEspacios),
  );
  return (
    <BadgeEstado tono={tono} className={className} conIcono={conIcono} tamano={tamano}>
      {etiqueta}
    </BadgeEstado>
  );
};

export default EstadoAsignacion;

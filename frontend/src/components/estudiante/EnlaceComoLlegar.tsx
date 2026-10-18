import React from 'react';
import { Link } from 'react-router-dom';
import { rutaDeAsignacion } from '../../config/rutas';

/** Enlace «Cómo llegar» a la ruta de una clase; no se muestra si aún no hay espacio asignado. */
export const EnlaceComoLlegar: React.FC<{
  asignacionId?: string | null;
  nombreCurso: string;
  className?: string;
}> = ({ asignacionId, nombreCurso, className = '' }) => {
  if (!asignacionId) return null;
  return (
    <Link
      to={rutaDeAsignacion(asignacionId)}
      aria-label={`Cómo llegar a ${nombreCurso}`}
      className={`inline-flex min-h-11 w-fit items-center gap-1.5 text-sm font-medium text-saie-primary underline-offset-4 hover:underline ${className}`}
    >
      <span>Cómo llegar</span>
      <span aria-hidden="true">&rarr;</span>
    </Link>
  );
};

export default EnlaceComoLlegar;

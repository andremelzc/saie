import React, { useCallback } from 'react';
import { useCarga } from '../../hooks/useCarga';
import { obtenerHistorial } from '../../services/admin';
import { describirEstadoAsignacion } from '../../utils/diccionarios';
import { formatearFechaAlerta } from '../../utils/fechas';
import { lineaTiempoDeSeccion } from '../../utils/lineaTiempo';
import { EsqueletoCarga } from '../ui/EstadosCarga';
import { BadgeEstado } from '../ui/BadgeEstado';
import { AvisoError } from './LayoutAdmin';

/**
 * Línea de tiempo de una sección (Issue 4.46): cada cambio de su asignación, del más antiguo al
 * más reciente, con el aula, el estado y la fecha en lenguaje llano.
 */
export const LineaTiempoSeccion: React.FC<{ seccionId: string }> = ({ seccionId }) => {
  const cargar = useCallback(() => obtenerHistorial({ seccionId, limite: 200 }), [seccionId]);
  const { datos, cargando, error, recargar } = useCarga(cargar, {
    clave: `historial-seccion:${seccionId}`,
  });

  if (error) return <AvisoError mensaje={error} onReintentar={recargar} />;
  if (cargando && !datos)
    return <EsqueletoCarga texto="Cargando la línea de tiempo…" forma="lista" />;

  const pasos = lineaTiempoDeSeccion(datos?.items ?? []);
  if (pasos.length === 0) {
    return <p className="m-0 text-sm text-saie-muted">Esta sección todavía no tiene cambios.</p>;
  }

  return (
    <ol aria-label="Línea de tiempo de la sección" className="m-0 flex list-none flex-col p-0">
      {pasos.map((paso, i) => {
        const estado = describirEstadoAsignacion(paso.estado);
        return (
          <li key={paso.id} className="relative flex gap-3 pb-5 last:pb-0">
            {i < pasos.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute left-[7px] top-5 h-[calc(100%-1.25rem)] w-0.5 bg-saie-divider"
              />
            )}
            <span
              aria-hidden="true"
              className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${
                paso.actual ? 'border-saie-primary bg-saie-primary' : 'border-saie-divider bg-white'
              }`}
            />
            <div className="flex min-w-0 flex-col gap-1">
              <p className="m-0 text-sm font-semibold text-saie-text">{paso.titulo}</p>
              {paso.detalle && <p className="m-0 text-sm text-saie-muted">{paso.detalle}</p>}
              <div className="flex flex-wrap items-center gap-2">
                <BadgeEstado tono={estado.tono}>
                  {paso.actual ? `${estado.etiqueta} · actual` : estado.etiqueta}
                </BadgeEstado>
                <time dateTime={paso.fecha} className="text-sm text-saie-muted">
                  {formatearFechaAlerta(paso.fecha)}
                </time>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default LineaTiempoSeccion;

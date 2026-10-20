import React from 'react';
import type { ReglaVerificacion, ResultadoVerificacionDTO } from '../../types/admin';

/** Nombre legible de cada regla dura del verificador (Issue 2.17). */
const ETIQUETAS: Record<ReglaVerificacion, string> = {
  DOBLE_RESERVA: 'Sin doble reserva',
  CAPACIDAD_SUFICIENTE: 'Capacidad suficiente',
  TIPO_HOMOGENEO: 'Tipo de espacio correcto',
  BLOQUE_CONTIGUO: 'Bloque contiguo',
  SOFTWARE_COMPLETO: 'Software completo',
  ESCALADA_CON_MOTIVO: 'Escaladas con motivo',
  UNA_VIGENTE_POR_SECCION: 'Una asignación vigente por sección',
};

const TRAZO_CHECK = 'M4.5 12.75l6 6 9-13.5';
const TRAZO_X = 'M6 18L18 6M6 6l12 12';

const IconoEstado: React.FC<{ conforme: boolean; className?: string }> = ({
  conforme,
  className = 'h-4 w-4',
}) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d={conforme ? TRAZO_CHECK : TRAZO_X} />
  </svg>
);

export interface VeredictoVerificacionProps {
  /** Resultado del verificador; `null` cuando la corrida no tuvo nada que verificar. */
  verificacion: ResultadoVerificacionDTO | null;
}

/**
 * Issue 2.17 — veredicto visible del verificador posterior a una corrida de asignación.
 *
 * Muestra el estado global (conforme / no conforme), cuántas asignaciones se revisaron y el
 * detalle de las siete reglas duras. Las reglas con hallazgos se despliegan para leer la sección
 * afectada y el motivo, de modo que el panel explique por sí mismo el resultado de la corrida.
 */
export const VeredictoVerificacion: React.FC<VeredictoVerificacionProps> = ({ verificacion }) => {
  if (!verificacion) {
    return (
      <section
        aria-label="Veredicto del verificador"
        className="rounded-xl border border-dashed border-saie-divider bg-white px-4 py-3 text-sm text-saie-muted"
      >
        No hubo asignaciones que verificar en esta corrida.
      </section>
    );
  }

  const { conforme, totalRevisadas, totalViolaciones, reglas } = verificacion;
  const tono = conforme
    ? {
        caja: 'border-saie-success/40 bg-saie-success-soft',
        icono: 'bg-saie-success text-white',
        texto: 'text-saie-success-strong',
      }
    : {
        caja: 'border-saie-danger/40 bg-saie-danger-soft',
        icono: 'bg-saie-danger text-white',
        texto: 'text-saie-danger-strong',
      };

  return (
    <section
      aria-labelledby="titulo-verificador"
      className={`flex flex-col gap-4 rounded-2xl border p-4 sm:p-5 ${tono.caja}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tono.icono}`}
          >
            <IconoEstado conforme={conforme} className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 id="titulo-verificador" className="m-0 text-base font-bold text-saie-text">
              Veredicto del verificador
            </h2>
            <p className={`m-0 mt-0.5 text-sm font-semibold ${tono.texto}`}>
              {conforme
                ? 'Conforme: la corrida cumple las 7 reglas duras.'
                : `No conforme: ${totalViolaciones} violación(es) en ${reglas.filter((r) => r.violaciones.length > 0).length} regla(s).`}
            </p>
            <p className="m-0 mt-0.5 text-xs text-saie-muted">
              {totalRevisadas} asignación(es) revisada(s) · {totalViolaciones} violación(es)
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
            conforme ? 'bg-saie-success text-white' : 'bg-saie-danger text-white'
          }`}
        >
          <IconoEstado conforme={conforme} className="h-3.5 w-3.5" />
          {conforme ? 'CONFORME' : 'NO CONFORME'}
        </span>
      </div>

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {reglas.map((regla) => {
          const cumple = regla.violaciones.length === 0;
          const noAplica = regla.revisadas === 0;
          return (
            <li
              key={regla.regla}
              className="rounded-xl border border-saie-divider bg-white px-3 py-2"
            >
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    cumple ? 'bg-saie-success-soft text-saie-success-strong' : 'bg-saie-danger-soft text-saie-danger-strong'
                  }`}
                >
                  <IconoEstado conforme={cumple} />
                </span>
                <span className="font-medium text-saie-text">{ETIQUETAS[regla.regla]}</span>
                <span className="ml-auto text-xs text-saie-muted">
                  {noAplica ? 'No aplica' : `${regla.cumplen}/${regla.revisadas} cumplen`}
                </span>
              </div>

              {regla.violaciones.length > 0 && (
                <details className="mt-2 border-t border-saie-divider pt-2">
                  <summary className="cursor-pointer text-xs font-semibold text-saie-danger">
                    Ver {regla.violaciones.length} violación(es)
                  </summary>
                  <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0 text-xs text-saie-text">
                    {regla.violaciones.map((violacion, indice) => (
                      <li
                        key={`${violacion.asignacionId}-${indice}`}
                        className="rounded-lg bg-saie-danger-soft px-2.5 py-1.5"
                      >
                        <strong className="font-semibold">{violacion.codigoSeccion}</strong>:{' '}
                        {violacion.detalle}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          );
        })}
      </ul>

      <p className="m-0 text-xs text-saie-muted">
        Verificación automática posterior a la corrida (Issue 2.17). Las violaciones quedan
        registradas en la auditoría.
      </p>
    </section>
  );
};

export default VeredictoVerificacion;

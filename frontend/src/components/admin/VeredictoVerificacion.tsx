import React, { useState } from 'react';
import type { ResultadoVerificacionDTO } from '../../types/admin';
import {
  ETIQUETA_REGLA_VERIFICACION,
  plural,
  textoResumenVerificacion,
} from '../../utils/etiquetas';
import { Boton } from '../ui/Boton';
import { Drawer } from '../ui/Drawer';

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

/** Reglas con al menos un problema. */
function reglasConProblemas(verificacion: ResultadoVerificacionDTO): number {
  return verificacion.reglas.filter((r) => r.violaciones.length > 0).length;
}

export interface VeredictoVerificacionProps {
  /** Resultado del verificador; `null` cuando la corrida no tuvo nada que verificar. */
  verificacion: ResultadoVerificacionDTO | null;
}

/**
 * Issue 2.17 — detalle del verificador posterior a una corrida de asignación: el estado global y
 * las siete reglas duras. Las reglas con problemas se despliegan para leer la sección afectada.
 * Es la vista de detalle: en las pantallas se muestra `ResumenVerificacion`.
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

  return (
    <section aria-labelledby="titulo-verificador" className="flex flex-col gap-4">
      <div
        className={`flex items-start gap-3 rounded-xl border p-4 ${
          conforme
            ? 'border-saie-success/30 bg-saie-success-soft'
            : 'border-saie-danger/30 bg-saie-danger-soft'
        }`}
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${
            conforme ? 'bg-saie-success' : 'bg-saie-danger'
          }`}
        >
          <IconoEstado conforme={conforme} className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 id="titulo-verificador" className="m-0 text-base font-bold text-saie-text">
            Veredicto del verificador
          </h3>
          <p
            className={`m-0 mt-0.5 text-sm font-semibold ${
              conforme ? 'text-saie-success-strong' : 'text-saie-danger-strong'
            }`}
          >
            {conforme
              ? 'Todo correcto: se cumplen las 7 reglas.'
              : `${plural(totalViolaciones, 'problema')} en ${plural(reglasConProblemas(verificacion), 'regla')}.`}
          </p>
          <p className="m-0 mt-0.5 text-xs text-saie-muted">
            {plural(totalRevisadas, 'asignación revisada', 'asignaciones revisadas')}
          </p>
        </div>
      </div>

      <ul className="m-0 flex list-none flex-col divide-y divide-saie-divider rounded-xl border border-saie-divider bg-white p-0">
        {reglas.map((regla) => {
          const cumple = regla.violaciones.length === 0;
          const noAplica = regla.revisadas === 0;
          return (
            <li key={regla.regla} className="px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    cumple
                      ? 'bg-saie-success-soft text-saie-success-strong'
                      : 'bg-saie-danger-soft text-saie-danger-strong'
                  }`}
                >
                  <IconoEstado conforme={cumple} />
                </span>
                <span className="font-medium text-saie-text">
                  {ETIQUETA_REGLA_VERIFICACION[regla.regla]}
                </span>
                <span className="ml-auto text-xs text-saie-muted">
                  {noAplica ? 'No aplica' : `${regla.cumplen}/${regla.revisadas} cumplen`}
                </span>
              </div>

              {regla.violaciones.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-semibold text-saie-danger-strong">
                    Ver{' '}
                    {plural(regla.violaciones.length, 'sección afectada', 'secciones afectadas')}
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
        Verificación automática posterior a la corrida. Los problemas quedan registrados en la
        auditoría.
      </p>
    </section>
  );
};

export interface ResumenVerificacionProps extends VeredictoVerificacionProps {
  className?: string;
}

/**
 * Resultado del verificador en una línea, con «Ver detalles» para abrir el desglose por regla
 * en un panel lateral. No ocupa más espacio del que merece y no esconde el veredicto.
 */
export const ResumenVerificacion: React.FC<ResumenVerificacionProps> = ({
  verificacion,
  className = '',
}) => {
  const [abierto, setAbierto] = useState(false);
  const conforme = verificacion?.conforme ?? true;
  const tono = !verificacion
    ? 'border-saie-divider bg-white text-saie-muted'
    : conforme
      ? 'border-saie-success/30 bg-saie-success-soft text-saie-success-strong'
      : 'border-saie-danger/30 bg-saie-danger-soft text-saie-danger-strong';

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border px-3 py-1.5 ${tono} ${className}`}
    >
      <p className="m-0 flex min-w-0 items-center gap-2 text-sm font-semibold">
        {verificacion && <IconoEstado conforme={conforme} className="h-4 w-4 shrink-0" />}
        <span>{textoResumenVerificacion(verificacion)}</span>
      </p>
      {verificacion && (
        <Boton
          variante="fantasma"
          tamano="sm"
          onClick={() => setAbierto(true)}
          className="-mr-2 text-current!"
        >
          Ver detalles
        </Boton>
      )}
      <Drawer
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo="Detalle de la verificación"
      >
        <VeredictoVerificacion verificacion={verificacion} />
      </Drawer>
    </div>
  );
};

export default VeredictoVerificacion;

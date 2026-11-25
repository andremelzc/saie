import React, { useState } from 'react';
import type { CambioAulaDocenteDTO } from '../../types/docente';
import {
  avisosPendientes,
  guardarAvisoVisto,
  leerAvisosVistos,
  textoEspacios,
  tituloCambio,
} from '../../utils/avisosCambioAula';
import { formatearFechaCorta } from '../../utils/fechas';
import { Boton } from '../ui/Boton';

/**
 * Issue 7.18 (riesgo R24): avisa al docente que una de sus secciones cambió de aula, para que no
 * vaya al aula anterior. Cada aviso se cierra con «Entendido».
 */
export const AvisosCambioAula: React.FC<{ cambios: CambioAulaDocenteDTO[] }> = ({ cambios }) => {
  const [vistos, setVistos] = useState<string[]>(leerAvisosVistos);
  const pendientes = avisosPendientes(cambios, vistos);
  if (pendientes.length === 0) return null;

  return (
    <section aria-labelledby="titulo-cambios-aula" className="flex flex-col gap-2">
      <h2 id="titulo-cambios-aula" className="m-0 text-sm font-bold text-saie-text">
        {pendientes.length === 1 ? 'Cambio de aula' : 'Cambios de aula'}
      </h2>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {pendientes.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-saie-warning-strong/30 bg-saie-warning-soft p-4 text-saie-warning-strong"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <p className="m-0 font-bold">
                {tituloCambio(c)}
                <span className="font-normal"> · {c.nombreCurso}</span>
              </p>
              <p className="m-0 text-sm">
                <span className="font-semibold">Antes:</span> {textoEspacios(c.espaciosAnteriores)}
              </p>
              <p className="m-0 text-sm">
                <span className="font-semibold">Ahora:</span> {textoEspacios(c.espaciosNuevos)}
              </p>
              <p className="m-0 text-xs">Cambio del {formatearFechaCorta(c.fecha)}</p>
            </div>
            <Boton
              variante="secundario"
              tamano="sm"
              onClick={() => setVistos(guardarAvisoVisto(c.id))}
              aria-label={`Entendido: ${tituloCambio(c)}`}
            >
              Entendido
            </Boton>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default AvisosCambioAula;

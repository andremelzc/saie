import React from 'react';
import type { DiaSemana } from '../../types/consulta';
import { ETIQUETA_DIA } from '../../utils/horario';
import { DIAS_FRANJA, idCampoFranja, nuevaFranja } from '../../utils/franjasSeccion';
import type { FranjaEditable } from '../../utils/franjasSeccion';
import { Boton } from '../ui/Boton';
import { CLASE_CAMPO, CLASE_ETIQUETA } from '../ui/campos';

export interface EditorHorarioSeccionProps {
  /** Prefijo de los ids de los campos (uno por sección). */
  idBase: string;
  franjas: FranjaEditable[];
  onCambiar: (franjas: FranjaEditable[]) => void;
  /** Error de cada franja, por su clave (ver `validarFranjas`). */
  errores: Record<string, string>;
  deshabilitado?: boolean;
}

/**
 * Issue 4.62 — editor del horario de una sección: una fila por franja (día, inicio y fin), con
 * «Agregar franja» y «Quitar». Los errores se muestran debajo de cada fila.
 */
export const EditorHorarioSeccion: React.FC<EditorHorarioSeccionProps> = ({
  idBase,
  franjas,
  onCambiar,
  errores,
  deshabilitado = false,
}) => {
  const actualizar = (clave: string, cambio: Partial<FranjaEditable>) =>
    onCambiar(franjas.map((f) => (f.clave === clave ? { ...f, ...cambio } : f)));

  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className={CLASE_ETIQUETA}>Horario</legend>
      <p className="m-0 text-sm text-saie-muted">
        Al guardar un horario distinto, la sección se vuelve a asignar con el horario nuevo.
      </p>

      {franjas.length === 0 ? (
        <p className="m-0 rounded-xl border border-dashed border-saie-divider p-3 text-sm text-saie-muted">
          Sin franjas: la sección no tendrá clases ni aula hasta que agregues una.
        </p>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {franjas.map((f, i) => {
            const numero = i + 1;
            const error = errores[f.clave];
            const idError = `${idBase}-${f.clave}-error`;
            const descripcion = error ? idError : undefined;
            return (
              <li
                key={f.clave}
                className="flex flex-col gap-1 rounded-xl border border-saie-divider bg-white p-3"
              >
                <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-saie-muted">Día</span>
                    <select
                      id={idCampoFranja(idBase, f.clave)}
                      value={f.diaSemana}
                      onChange={(e) =>
                        actualizar(f.clave, { diaSemana: e.target.value as DiaSemana })
                      }
                      aria-label={`Día de la franja ${numero}`}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={descripcion}
                      disabled={deshabilitado}
                      className={CLASE_CAMPO}
                    >
                      {DIAS_FRANJA.map((d) => (
                        <option key={d} value={d}>
                          {ETIQUETA_DIA[d]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-saie-muted">Inicio</span>
                    <input
                      type="time"
                      step={300}
                      value={f.horaInicio}
                      onChange={(e) => actualizar(f.clave, { horaInicio: e.target.value })}
                      aria-label={`Hora de inicio de la franja ${numero}`}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={descripcion}
                      disabled={deshabilitado}
                      className={`${CLASE_CAMPO} tabular-nums`}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-saie-muted">Fin</span>
                    <input
                      type="time"
                      step={300}
                      value={f.horaFin}
                      onChange={(e) => actualizar(f.clave, { horaFin: e.target.value })}
                      aria-label={`Hora de fin de la franja ${numero}`}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={descripcion}
                      disabled={deshabilitado}
                      className={`${CLASE_CAMPO} tabular-nums`}
                    />
                  </label>
                  <Boton
                    variante="cancelar"
                    tamano="sm"
                    onClick={() => onCambiar(franjas.filter((x) => x.clave !== f.clave))}
                    disabled={deshabilitado}
                    aria-label={`Quitar la franja ${numero}`}
                  >
                    Quitar
                  </Boton>
                </div>
                {error && (
                  <p id={idError} className="m-0 text-sm font-medium text-saie-danger">
                    {error}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <div>
        <Boton
          variante="secundario"
          tamano="sm"
          onClick={() => onCambiar([...franjas, nuevaFranja(franjas)])}
          disabled={deshabilitado}
        >
          Agregar franja
        </Boton>
      </div>
    </fieldset>
  );
};

export default EditorHorarioSeccion;

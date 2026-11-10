import React, { useCallback, useId, useState } from 'react';
import { useCarga } from '../../hooks/useCarga';
import { useValorDiferido } from '../../hooks/useValorDiferido';
import { obtenerSecciones } from '../../services/admin';
import { CLASE_CAMPO } from '../ui/campos';
import { Campo } from '../ui/Campo';

/** Sección elegida en el buscador: su id (para filtrar) y un nombre legible (para el chip). */
export interface SeccionElegida {
  id: string;
  nombre: string;
}

export interface BuscadorSeccionProps {
  onElegir: (seccion: SeccionElegida) => void;
  className?: string;
}

const MINIMO = 2;

/**
 * Buscador de sección o curso (Issue 4.46): escribe un código o nombre y elige una sección de
 * la lista (`GET /admin/secciones?q=`). Los resultados son botones: se alcanzan con Tab y se
 * eligen con Enter, sin un combobox a medias.
 */
export const BuscadorSeccion: React.FC<BuscadorSeccionProps> = ({ onElegir, className = '' }) => {
  const [texto, setTexto] = useState('');
  const consulta = useValorDiferido(texto.trim());
  const idResultados = useId();
  const habilitado = consulta.length >= MINIMO;

  const cargar = useCallback(() => obtenerSecciones({ q: consulta, limite: 8 }), [consulta]);
  const { datos, cargando, error } = useCarga(cargar, {
    clave: `buscador-seccion:${consulta}`,
    habilitado,
  });
  const resultados = habilitado ? (datos?.items ?? []) : [];
  const mostrar = habilitado && texto.trim().length >= MINIMO;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <Campo etiqueta="Sección o curso">
        <input
          type="search"
          placeholder="Ej. CC-101 o Programación"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          aria-controls={mostrar ? idResultados : undefined}
          className={CLASE_CAMPO}
        />
      </Campo>
      {mostrar && (
        <div id={idResultados} className="rounded-xl border border-saie-divider bg-white p-1">
          <p className="sr-only" aria-live="polite">
            {cargando ? 'Buscando…' : `${resultados.length} resultados`}
          </p>
          {error ? (
            <p className="m-0 px-2 py-1.5 text-sm text-saie-danger-strong">{error}</p>
          ) : cargando && resultados.length === 0 ? (
            <p className="m-0 px-2 py-1.5 text-sm text-saie-muted">Buscando…</p>
          ) : resultados.length === 0 ? (
            <p className="m-0 px-2 py-1.5 text-sm text-saie-muted">
              Ninguna sección coincide con «{texto.trim()}».
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-col p-0" aria-label="Secciones encontradas">
              {resultados.map((s) => {
                const nombre = `${s.codigoCurso} · ${s.codigoSeccion}`;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onElegir({ id: s.id, nombre: `${nombre} (${s.nombreCurso})` });
                        setTexto('');
                      }}
                      className="flex min-h-11 w-full flex-col items-start rounded-lg px-2 py-1.5 text-left text-sm hover:bg-saie-canvas focus-visible:bg-saie-canvas"
                    >
                      <span className="font-semibold">{nombre}</span>
                      <span className="text-saie-muted">
                        {s.nombreCurso} · {s.periodo}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default BuscadorSeccion;

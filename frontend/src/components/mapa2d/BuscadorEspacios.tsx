import React, { useId, useMemo, useState } from 'react';
import { ESTADO_TEXTO, PABELLON_TEXTO, type EspacioMapa2D } from './etiquetas';
import { normalizar } from './indice';
import { pabellonDe } from './plano';

export interface BuscadorEspaciosProps {
  espacios: EspacioMapa2D[];
  /** Piso de cada espacio (el plano es la fuente: `EspacioMapa2D.piso` puede faltar). */
  pisoDe: (id: string) => number | undefined;
  /** Se elige un resultado: el mapa debe ir a su piso, centrarlo y seleccionarlo. */
  onElegir: (id: string) => void;
  className?: string;
}

const MAX_RESULTADOS = 8;

/**
 * Buscador de aulas y laboratorios por código o nombre («204», «lab redes», «nuevo 101»). Es un
 * combobox con lista de resultados: flechas para moverse, Enter para elegir y Escape para cerrar.
 */
export const BuscadorEspacios: React.FC<BuscadorEspaciosProps> = ({
  espacios,
  pisoDe,
  onElegir,
  className = '',
}) => {
  const id = useId();
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);

  const resultados = useMemo(() => {
    const palabras = normalizar(texto).split(/\s+/).filter(Boolean);
    if (palabras.length === 0) return [];
    return espacios
      .filter((e) => {
        const pab = pabellonDe(e.id);
        const pistas = normalizar(
          [
            e.id,
            e.nombre ?? '',
            pab ? PABELLON_TEXTO[pab] : '',
            e.tipo === 'LABORATORIO' ? 'laboratorio lab' : 'aula',
          ].join(' '),
        );
        return palabras.every((p) => pistas.includes(p));
      })
      .sort((a, b) => a.id.localeCompare(b.id, 'es', { numeric: true }))
      .slice(0, MAX_RESULTADOS);
  }, [espacios, texto]);

  const lista = abierto && texto.trim() !== '';
  const idOpcion = (i: number) => `${id}-op-${i}`;

  const elegir = (e: EspacioMapa2D) => {
    onElegir(e.id);
    setTexto('');
    setAbierto(false);
  };

  return (
    <div className={`relative ${className}`}>
      <label htmlFor={`${id}-entrada`} className="mb-1 block text-sm font-medium text-saie-text">
        Buscar aula o laboratorio
      </label>
      <input
        id={`${id}-entrada`}
        type="search"
        role="combobox"
        aria-expanded={lista}
        aria-controls={`${id}-lista`}
        aria-autocomplete="list"
        aria-activedescendant={lista && resultados.length > 0 ? idOpcion(activo) : undefined}
        autoComplete="off"
        placeholder="Ej.: 204 o laboratorio"
        value={texto}
        onChange={(ev) => {
          setTexto(ev.target.value);
          setAbierto(true);
          setActivo(0);
        }}
        onBlur={() => setAbierto(false)}
        onKeyDown={(ev) => {
          if (ev.key === 'ArrowDown' && resultados.length) {
            ev.preventDefault();
            setAbierto(true);
            setActivo((a) => (a + 1) % resultados.length);
          } else if (ev.key === 'ArrowUp' && resultados.length) {
            ev.preventDefault();
            setActivo((a) => (a - 1 + resultados.length) % resultados.length);
          } else if (ev.key === 'Enter' && lista && resultados[activo]) {
            ev.preventDefault();
            elegir(resultados[activo]);
          } else if (ev.key === 'Escape' && abierto) {
            ev.stopPropagation();
            setAbierto(false);
          }
        }}
        className="min-h-11 w-full rounded-lg border border-saie-divider bg-white px-3 text-sm text-saie-text placeholder:text-saie-muted"
      />
      <ul
        id={`${id}-lista`}
        role="listbox"
        aria-label="Resultados de la búsqueda"
        hidden={!lista}
        className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-auto rounded-lg border border-saie-divider bg-white p-1 shadow-lg"
      >
        {lista && resultados.length === 0 && (
          <li role="presentation" className="px-3 py-2 text-sm text-saie-muted">
            Sin resultados para «{texto.trim()}».
          </li>
        )}
        {lista &&
          resultados.map((e, i) => {
            const pab = pabellonDe(e.id);
            const piso = pisoDe(e.id) ?? e.piso;
            return (
              <li
                key={e.id}
                id={idOpcion(i)}
                role="option"
                aria-selected={i === activo}
                // `mousedown` y no `click`: el campo pierde el foco antes y cerraría la lista.
                onMouseDown={(ev) => {
                  ev.preventDefault();
                  elegir(e);
                }}
                className={`cursor-pointer rounded-md px-3 py-2 text-sm ${i === activo ? 'bg-saie-primary/10' : ''}`}
              >
                <span className="font-medium text-saie-text">{e.nombre ?? e.id}</span>
                <span className="block text-xs text-saie-muted">
                  {[
                    pab ? PABELLON_TEXTO[pab] : null,
                    piso ? `Piso ${piso}` : null,
                    ESTADO_TEXTO[e.estado],
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </li>
            );
          })}
      </ul>
    </div>
  );
};

export default BuscadorEspacios;

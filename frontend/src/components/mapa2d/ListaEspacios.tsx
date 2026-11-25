import React, { useMemo } from 'react';
import { ESTADO_TEXTO, PABELLON_TEXTO, TIPO_TEXTO, type EspacioMapa2D } from './etiquetas';
import { pabellonDe } from './plano';

export interface ListaEspaciosProps {
  espacios: EspacioMapa2D[];
  /** Piso en el que está dibujada la figura de un espacio. */
  pisoDe: (id: string) => number | undefined;
  /** Piso mostrado en la maqueta; con `todos` (o sin piso) se listan todos, agrupados por piso. */
  piso?: number | 'todos';
  seleccionado: string | null;
  /** Elegir un espacio: lo selecciona y lleva la vista hasta él. */
  onElegir: (id: string) => void;
  className?: string;
}

const porNombre = (a: EspacioMapa2D, b: EspacioMapa2D) =>
  (pabellonDe(a.id) ?? '').localeCompare(pabellonDe(b.id) ?? '') ||
  (a.nombre ?? a.id).localeCompare(b.nombre ?? b.id, 'es', { numeric: true });

/**
 * Lista de aulas y laboratorios por piso, con el mismo estado que el plano. Es la alternativa de
 * la maqueta 3D para el teclado y los lectores de pantalla (el lienzo 3D no se puede recorrer con
 * Tab): cada espacio es un botón y elegirlo lo selecciona y lleva la cámara hasta él.
 */
export const ListaEspacios: React.FC<ListaEspaciosProps> = ({
  espacios,
  pisoDe,
  piso,
  seleccionado,
  onElegir,
  className = '',
}) => {
  const grupos = useMemo(() => {
    const porPiso = new Map<number, EspacioMapa2D[]>();
    for (const e of espacios) {
      const p = pisoDe(e.id);
      if (p === undefined || (typeof piso === 'number' && p !== piso)) continue;
      porPiso.set(p, [...(porPiso.get(p) ?? []), e]);
    }
    return [...porPiso.entries()]
      .sort(([a], [b]) => a - b)
      .map(([p, lista]) => [p, [...lista].sort(porNombre)] as const);
  }, [espacios, pisoDe, piso]);

  return (
    <section
      aria-label="Lista de espacios"
      className={`rounded-xl border border-saie-divider bg-white p-3 ${className}`}
    >
      <h2 className="m-0 text-base font-semibold text-saie-text">Lista de espacios</h2>
      <p className="m-0 mt-1 text-sm text-saie-muted">
        Alternativa a la maqueta para el teclado y los lectores de pantalla.
      </p>
      {grupos.length === 0 ? (
        <p className="m-0 mt-3 text-sm text-saie-muted">No hay espacios que mostrar.</p>
      ) : (
        <div className="mt-2 flex max-h-72 flex-col gap-3 overflow-auto">
          {grupos.map(([p, lista]) => (
            <div key={p}>
              <h3 className="m-0 text-sm font-semibold text-saie-text">Piso {p}</h3>
              <ul className="m-0 mt-1 flex list-none flex-col gap-1 p-0">
                {lista.map((e) => {
                  const pabellon = pabellonDe(e.id);
                  const activo = e.id === seleccionado;
                  return (
                    <li key={e.id}>
                      <button
                        type="button"
                        aria-pressed={activo}
                        onClick={() => onElegir(e.id)}
                        className={`flex min-h-11 w-full cursor-pointer flex-wrap items-center justify-between gap-x-3 rounded-lg border px-3 py-1 text-left text-sm text-saie-text hover:bg-saie-primary/5 ${
                          activo ? 'border-saie-primary bg-saie-primary/5' : 'border-saie-divider'
                        }`}
                      >
                        <span className="font-medium">
                          {e.nombre ?? e.id}
                          {pabellon && (
                            <span className="font-normal text-saie-muted">
                              {' '}
                              · {PABELLON_TEXTO[pabellon]}
                            </span>
                          )}
                        </span>
                        <span className="text-saie-muted">
                          {TIPO_TEXTO[e.tipo]} · {ESTADO_TEXTO[e.estado]}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default ListaEspacios;

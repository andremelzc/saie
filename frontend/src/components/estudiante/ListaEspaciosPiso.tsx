import React from 'react';
import { etiquetaTipoEspacio } from '../../utils/horario';
import type { TipoEspacio } from '../../types/consulta';

export interface EspacioLista {
  id: string;
  identificador: string;
  tipo: TipoEspacio;
  /** Libre u ocupado; si se omite, solo se lista el espacio. */
  estado?: 'DISPONIBLE' | 'OCUPADO';
  resaltado?: boolean;
}

export interface ListaEspaciosPisoProps {
  espacios: EspacioLista[];
  titulo: string;
  /** Espacio seleccionado en el plano. */
  seleccionado?: string | null;
  /** Si se da, cada espacio es un botón que lo selecciona en el plano. */
  onSeleccionar?: (id: string) => void;
  className?: string;
}

const ETIQUETA_ESTADO = { DISPONIBLE: 'Libre', OCUPADO: 'Ocupado' } as const;

/**
 * Lista de los espacios del plano. Es también su alternativa accesible: sirve a lectores de
 * pantalla, al teclado y a quien no tiene WebGL, y al tocar un espacio lo marca en el plano.
 */
export const ListaEspaciosPiso: React.FC<ListaEspaciosPisoProps> = ({
  espacios,
  titulo,
  seleccionado = null,
  onSeleccionar,
  className = '',
}) => (
  <section aria-label={titulo} className={`flex flex-col gap-2 ${className}`}>
    <h3 className="m-0 text-base font-bold text-saie-text">{titulo}</h3>
    <ul className="m-0 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
      {espacios.map((e) => {
        const activo = seleccionado === e.id;
        const contenido = (
          <>
            <span className="min-w-0">
              <strong className="font-semibold">{e.identificador}</strong>
              <span className="text-saie-muted">{` · ${etiquetaTipoEspacio(e.tipo)}`}</span>
              {e.resaltado && (
                <span className="ml-1.5 whitespace-nowrap rounded-full bg-saie-primary px-2 py-0.5 text-[11px] font-bold text-white">
                  Tu aula
                </span>
              )}
            </span>
            {e.estado && (
              <span
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  e.estado === 'DISPONIBLE'
                    ? 'bg-[#E8F5E9] text-[#1B5E20]'
                    : 'bg-[#EEF1F5] text-[#33415C]'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 rounded-full ${e.estado === 'DISPONIBLE' ? 'bg-[#1E8E4E]' : 'saie-rayado border border-[#5B6B7F]'}`}
                />
                {ETIQUETA_ESTADO[e.estado]}
              </span>
            )}
          </>
        );
        const clases = `flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2.5 text-left text-sm text-saie-text transition-colors ${
          activo
            ? 'border-2 border-saie-text bg-saie-canvas'
            : e.resaltado
              ? 'border-2 border-saie-primary'
              : 'border-saie-divider'
        }`;
        return (
          <li key={e.id}>
            {onSeleccionar ? (
              <button
                type="button"
                aria-pressed={activo}
                onClick={() => onSeleccionar(e.id)}
                className={`${clases} min-h-11 cursor-pointer hover:bg-saie-canvas`}
              >
                {contenido}
              </button>
            ) : (
              <div className={clases}>{contenido}</div>
            )}
          </li>
        );
      })}
    </ul>
  </section>
);

export default ListaEspaciosPiso;

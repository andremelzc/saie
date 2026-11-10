import React, { useId, useMemo } from 'react';
import { SelectorSegmentado } from '../estudiante/SelectorSegmentado';
import BuscadorEspacios from '../mapa2d/BuscadorEspacios';
import type { EspacioMapa2D } from '../mapa2d/etiquetas';
import { pabellonDe } from '../mapa2d/plano';
import { clasesBoton } from '../ui/clasesBoton';
import type { CursoMatriculadoDTO } from '../../types/horario';
import type { GrupoOrigen } from './origenes';

/** Valor de «dónde estás» que significa la entrada principal. */
export const ORIGEN_POR_DEFECTO = 'entrada';

const NOMBRE_PABELLON = { ANT: 'Pabellón antiguo', NUE: 'Pabellón nuevo' } as const;

const OPCIONES_DESDE = [
  { valor: 'entrada', etiqueta: 'Entrada principal' },
  { valor: 'lugar', etiqueta: 'Otro lugar' },
];

interface SelectorOrigenProps {
  grupos: GrupoOrigen[];
  /** `entrada` o el id de un espacio del plano. */
  valor: string;
  onCambiar: (valor: string) => void;
  /** Si se quiere partir de «otro lugar» aunque todavía no se haya elegido uno. */
  buscandoLugar: boolean;
  onBuscandoLugar: (buscando: boolean) => void;
}

/**
 * «¿Dónde estás?»: o en la entrada principal (lo habitual) o en otro lugar, que se busca por su
 * nombre en vez de recorrer una lista de más de cincuenta espacios.
 */
export const SelectorOrigen: React.FC<SelectorOrigenProps> = ({
  grupos,
  valor,
  onCambiar,
  buscandoLugar,
  onBuscandoLugar,
}) => {
  const idTitulo = useId();
  const espacios = useMemo<EspacioMapa2D[]>(
    () =>
      grupos.flatMap((g) =>
        g.opciones.map((o) => ({
          id: o.id,
          nombre: o.nombre,
          piso: o.piso,
          tipo: 'AULA_TEORICA' as const,
          estado: 'DISPONIBLE' as const,
        })),
      ),
    [grupos],
  );
  const pisoDe = useMemo(() => new Map(espacios.map((e) => [e.id, e.piso])), [espacios]);
  const elegido = espacios.find((e) => e.id === valor);
  const modo = valor !== ORIGEN_POR_DEFECTO || buscandoLugar ? 'lugar' : 'entrada';

  return (
    <div role="group" aria-labelledby={idTitulo} className="flex min-w-0 flex-col gap-2">
      <span id={idTitulo} className="text-sm font-medium text-saie-text">
        ¿Dónde estás?
      </span>
      <SelectorSegmentado
        etiquetaGrupo="Punto de partida"
        opciones={OPCIONES_DESDE}
        valor={modo}
        onCambiar={(v) => {
          if (v === 'entrada') {
            onBuscandoLugar(false);
            onCambiar(ORIGEN_POR_DEFECTO);
          } else {
            onBuscandoLugar(true);
          }
        }}
        className="self-start"
      />
      {modo === 'lugar' &&
        (elegido ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-saie-border bg-white px-3 py-2">
            <p className="m-0 min-w-0 text-sm text-saie-text">
              <strong className="font-semibold">{elegido.nombre}</strong>
              <span className="block text-saie-muted">
                {[
                  pabellonDe(elegido.id)
                    ? NOMBRE_PABELLON[pabellonDe(elegido.id) as 'ANT' | 'NUE']
                    : null,
                  elegido.piso ? `Piso ${elegido.piso}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </p>
            <button
              type="button"
              onClick={() => onCambiar(ORIGEN_POR_DEFECTO)}
              className={clasesBoton('fantasma', 'sm')}
            >
              Cambiar
            </button>
          </div>
        ) : (
          <BuscadorEspacios
            espacios={espacios}
            pisoDe={(id) => pisoDe.get(id)}
            onElegir={(id) => {
              onBuscandoLugar(false);
              onCambiar(id);
            }}
            etiqueta="Busca el aula o lugar donde estás"
            placeholder="Ej.: 108, biblioteca, auditorio"
            mostrarEstado={false}
          />
        ))}
    </div>
  );
};

const etiquetaLugar = (c: CursoMatriculadoDTO) => c.espacios.map((e) => e.identificador).join(', ');

interface SelectorClaseProps {
  cursos: CursoMatriculadoDTO[];
  /** `asignacionId` de la clase elegida. */
  valor: string | null;
  onCambiar: (asignacionId: string) => void;
}

/**
 * «¿A qué clase vas?»: las clases con aula, a la vista y de un toque, en vez de una lista
 * desplegable. Son un grupo de opciones (radio): flechas para moverse, como en cualquier formulario.
 */
export const SelectorClase: React.FC<SelectorClaseProps> = ({ cursos, valor, onCambiar }) => {
  const nombre = useId();
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
      <legend className="mb-1 p-0 text-sm font-medium text-saie-text">¿A qué clase vas?</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {cursos.map((c) => {
          const id = c.asignacionId as string;
          return (
            <label key={id} className="relative block cursor-pointer">
              <input
                type="radio"
                name={nombre}
                value={id}
                checked={valor === id}
                onChange={() => onCambiar(id)}
                className="peer sr-only"
              />
              <span className="flex min-h-14 flex-col justify-center rounded-xl border border-saie-border bg-white px-3 py-2 text-sm transition-colors hover:bg-saie-primary/5 peer-checked:border-saie-primary peer-checked:bg-saie-primary/5 peer-checked:ring-1 peer-checked:ring-saie-primary peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-saie-text">
                <strong className="font-semibold text-saie-text">{c.nombreCurso}</strong>
                <span className="text-saie-muted">
                  {`Sección ${c.codigoSeccion}`}
                  {etiquetaLugar(c) ? ` · ${etiquetaLugar(c)}` : ''}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
};

import React, { useId, useMemo, useState } from 'react';
import { SelectorSegmentado } from '../ui/SelectorSegmentado';
import BuscadorEspacios from '../mapa2d/BuscadorEspacios';
import type { EspacioMapa2D } from '../mapa2d/etiquetas';
import { pabellonDe } from '../mapa2d/plano';
import { clasesBoton } from '../ui/clasesBoton';
import type { CursoMatriculadoDTO } from '../../types/horario';
import { CLASE_CAMPO_MAPA } from '../mapa2d/controles';
import { etiquetaDeProxima } from './clases';
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
              Cambiar lugar
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
  /** Las clases con aula, ya ordenadas por cuándo toca la siguiente sesión. */
  cursos: CursoMatriculadoDTO[];
  /** `asignacionId` de la clase elegida. */
  valor: string | null;
  onCambiar: (asignacionId: string) => void;
  ahora: Date;
}

/**
 * «¿A qué clase vas?»: casi siempre es la que toca ahora o la próxima, así que esa viene elegida y
 * se ve de un vistazo. Solo quien va a otra la cambia, desde una lista corta ordenada por cuándo
 * empieza cada una. Así no hay que leer todas las clases para empezar.
 */
export const SelectorClase: React.FC<SelectorClaseProps> = ({
  cursos,
  valor,
  onCambiar,
  ahora,
}) => {
  const idTitulo = useId();
  const [cambiando, setCambiando] = useState(false);
  const actual = cursos.find((c) => c.asignacionId === valor) ?? cursos[0];
  if (!actual) return null;
  const proxima = actual.proximaSesion ? etiquetaDeProxima(actual.proximaSesion, ahora) : null;

  return (
    <div role="group" aria-labelledby={idTitulo} className="flex min-w-0 flex-col gap-2">
      <span id={idTitulo} className="text-sm font-medium text-saie-text">
        ¿A qué clase vas?
      </span>
      {cambiando ? (
        <select
          aria-labelledby={idTitulo}
          autoFocus
          value={actual.asignacionId as string}
          onChange={(e) => {
            onCambiar(e.target.value);
            setCambiando(false);
          }}
          onBlur={() => setCambiando(false)}
          className={`${CLASE_CAMPO_MAPA} w-full`}
        >
          {cursos.map((c) => (
            <option key={c.asignacionId as string} value={c.asignacionId as string}>
              {[
                c.nombreCurso,
                c.proximaSesion ? etiquetaDeProxima(c.proximaSesion, ahora) : null,
                etiquetaLugar(c),
              ]
                .filter(Boolean)
                .join(' · ')}
            </option>
          ))}
        </select>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-saie-border bg-white px-3 py-2">
          <p className="m-0 min-w-0 text-sm text-saie-text">
            <strong className="font-semibold">{actual.nombreCurso}</strong>
            <span className="block text-saie-muted">
              {[`Sección ${actual.codigoSeccion}`, etiquetaLugar(actual)]
                .filter(Boolean)
                .join(' · ')}
            </span>
            {proxima && <span className="block font-medium text-saie-primary">{proxima}</span>}
          </p>
          {cursos.length > 1 && (
            <button
              type="button"
              onClick={() => setCambiando(true)}
              className={clasesBoton('fantasma', 'sm')}
            >
              Cambiar clase
            </button>
          )}
        </div>
      )}
    </div>
  );
};

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import type { Pestana } from '../../utils/admin';
import { pestanasQueNoCaben } from '../../utils/barraPestanas';
import { Contenedor } from '../ui/Contenedor';
import { MenuMas } from '../ui/MenuMas';

function mismoConjunto(a: Set<string>, b: Set<string>): boolean {
  return a.size === b.size && [...a].every((x) => b.has(x));
}

const claseLink = ({ isActive }: { isActive: boolean }) =>
  `flex min-w-16 flex-col items-center gap-0.5 px-3 py-2 text-xs transition-colors lg:min-w-0 lg:flex-row lg:gap-2 lg:rounded-lg lg:px-4 lg:text-sm ${
    isActive
      ? 'bg-saie-primary/10 font-bold text-saie-primary lg:bg-saie-primary lg:font-medium lg:text-white'
      : 'font-medium text-saie-muted hover:text-saie-primary'
  }`;

/**
 * Barra de pestañas del panel (Issue 4.35, ampliada): se adapta al ancho REAL disponible en vez
 * de cortar en un ancho fijo. Mide cada pestaña y manda a «Más» solo las que no caben, a
 * cualquier tamaño de pantalla, texto grande o idioma. Las pestañas que no caben siguen en el
 * documento pero invisibles (así conservan su medida y no estorban a lectores de pantalla ni al
 * teclado). Sin medidas (p. ej. en pruebas) se muestran todas.
 */
export const BarraPestanas: React.FC<{ pestanas: Pestana[] }> = ({ pestanas }) => {
  const lista = useRef<HTMLElement>(null);
  const [ocultas, setOcultas] = useState<Set<string>>(new Set());
  const claves = useMemo(() => pestanas.map((p) => p.to).join('|'), [pestanas]);

  useLayoutEffect(() => {
    const ul = lista.current;
    if (!ul) return;
    const calcular = () => {
      const estilo = getComputedStyle(ul);
      const relleno =
        (parseFloat(estilo.paddingLeft) || 0) + (parseFloat(estilo.paddingRight) || 0);
      const espacio = parseFloat(estilo.columnGap) || 0;
      const items = Array.from(ul.querySelectorAll<HTMLElement>(':scope > li[data-pestana]'));
      const anchos = items.map((li) => li.getBoundingClientRect().width);
      const nuevas = pestanasQueNoCaben(
        pestanas,
        anchos,
        ul.clientWidth - relleno,
        anchos[0] ?? 0,
        espacio,
      );
      setOcultas((previas) => (mismoConjunto(previas, nuevas) ? previas : nuevas));
    };
    calcular();
    if (typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(calcular);
    observador.observe(ul);
    ul.querySelectorAll(':scope > li[data-pestana]').forEach((li) => observador.observe(li));
    return () => observador.disconnect();
  }, [pestanas, claves]);

  const enMas = pestanas.filter((p) => ocultas.has(p.to));

  return (
    <Contenedor
      como="ul"
      ref={lista}
      className="relative m-0 flex list-none justify-around gap-1 py-0 lg:justify-start lg:py-2"
    >
      {pestanas.map((p) => (
        <li
          key={p.to}
          data-pestana
          className={`flex flex-none ${ocultas.has(p.to) ? 'invisible absolute' : ''}`}
        >
          <NavLink
            to={p.to}
            end
            className={claseLink}
            tabIndex={ocultas.has(p.to) ? -1 : undefined}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d={p.trazo} />
            </svg>
            {p.etiqueta}
          </NavLink>
        </li>
      ))}
      {enMas.length > 0 && (
        <li className="flex flex-none">
          <MenuMas pestanas={enMas} variante="adaptable" />
        </li>
      )}
    </Contenedor>
  );
};

export default BarraPestanas;

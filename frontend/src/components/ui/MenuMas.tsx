import React, { useEffect, useId, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ICONOS } from './iconos';

/**
 * Pestaña «Más» de las barras inferiores del panel y del área del alumno (Issues 4.35 y 3.34):
 * agrupa las pestañas secundarias por debajo de `lg`. Es un botón de despliegue (`aria-expanded`), no un `role="menu"`: lleva
 * enlaces normales. Escape lo cierra y devuelve el foco al botón; también se cierra al elegir
 * un destino, al hacer clic fuera o al sacar el foco del menú.
 */
const TRAZO_MAS = ICONOS.masOpciones;

export interface EnlaceMas {
  to: string;
  etiqueta: string;
  trazo: string;
}

export const MenuMas: React.FC<{ pestanas: EnlaceMas[] }> = ({ pestanas }) => {
  const [abierto, setAbierto] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const idMenu = useId();
  const { pathname } = useLocation();

  const activa = pestanas.some((p) => pathname === p.to || pathname.startsWith(`${p.to}/`));

  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setAbierto(false);
      boton.current?.focus();
    };
    const alHacerClicFuera = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('keydown', alPulsar);
    document.addEventListener('mousedown', alHacerClicFuera);
    return () => {
      document.removeEventListener('keydown', alPulsar);
      document.removeEventListener('mousedown', alHacerClicFuera);
    };
  }, [abierto]);

  return (
    <div
      ref={contenedor}
      className="relative flex flex-1"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setAbierto(false);
      }}
    >
      <button
        ref={boton}
        type="button"
        aria-expanded={abierto}
        aria-controls={idMenu}
        onClick={() => setAbierto((a) => !a)}
        className={`flex min-h-14 flex-1 cursor-pointer flex-col items-center gap-0.5 border-0 bg-transparent px-2 py-2 text-xs transition-colors ${
          activa || abierto
            ? 'bg-saie-primary/10 font-bold text-saie-primary'
            : 'font-medium text-saie-muted hover:text-saie-primary'
        }`}
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
          <path d={TRAZO_MAS} />
        </svg>
        Más
      </button>
      {abierto && (
        <ul
          id={idMenu}
          className="absolute bottom-full right-0 m-0 mb-2 min-w-48 list-none rounded-xl border border-saie-border bg-white p-1 shadow-lg"
        >
          {pestanas.map((p) => (
            <li key={p.to}>
              <NavLink
                to={p.to}
                end
                onClick={() => setAbierto(false)}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm no-underline transition-colors ${
                    isActive
                      ? 'bg-saie-primary/10 font-bold text-saie-primary'
                      : 'font-medium text-saie-text hover:bg-saie-text/5'
                  }`
                }
              >
                <svg
                  className="h-5 w-5 shrink-0"
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
        </ul>
      )}
    </div>
  );
};

export default MenuMas;

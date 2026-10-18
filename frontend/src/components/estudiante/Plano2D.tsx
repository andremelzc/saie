import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { TipoEspacio } from '../../types/consulta';
import { PLANOS_SVG, prepararSvg } from '../../utils/planosSvg';

/** Un espacio del plano: `estado` se omite cuando solo se quiere ubicar (sin libre/ocupado). */
export interface EspacioPlano {
  id: string;
  tipo: TipoEspacio;
  estado?: 'DISPONIBLE' | 'OCUPADO';
}

export interface Plano2DProps {
  piso: number;
  espacios: EspacioPlano[];
  /** Ids de «tus» espacios: llevan contorno guinda, pulso y un pin. */
  resaltados?: string[];
  seleccionado?: string | null;
  onSeleccionar?: (id: string | null) => void;
  etiqueta: string;
  className?: string;
}

interface Vista {
  x: number;
  y: number;
  w: number;
  h: number;
}

const COLOR_LIBRE = { relleno: '#CDEBD6', trazo: '#1E8E4E' };
const COLOR_OCUPADO = { trazo: '#5B6B7F' };
const GUINDA = '#7B1113';
const MARGEN = 90;
const ANCHO_MINIMO = 520;
const ZOOM_MIN = 0.12;
const PASO_ZOOM = 1.4;
const UMBRAL_ARRASTRE_PX = 5;

function vistaBase(texto: string): Vista {
  const m = /viewBox="([^"]+)"/.exec(texto);
  const [x = 0, y = 0, w = 912, h = 818] = (m?.[1] ?? '').split(/[\s,]+/).map(Number);
  return { x, y, w, h };
}

const escaparAtributo = (id: string) => id.replace(/["\\]/g, '\\$&');

/** CSS dinámico: libre/ocupado, «tu espacio» y selección, solo para los espacios con datos. */
function cssDinamico(
  espacios: EspacioPlano[],
  resaltados: Set<string>,
  seleccionado: string | null,
): string {
  const reglas: string[] = [];
  const base = '.plano2d svg .espacio';
  for (const e of espacios) {
    const sel = `${base}[id="${escaparAtributo(e.id)}"]`;
    const decl = ['cursor:pointer', 'transition:fill .25s,stroke .25s,stroke-width .25s'];
    if (e.estado === 'DISPONIBLE') {
      decl.push(`fill:${COLOR_LIBRE.relleno}`, `stroke:${COLOR_LIBRE.trazo}`, 'stroke-width:2');
    } else if (e.estado === 'OCUPADO') {
      decl.push('fill:url(#saie-ocupado)', `stroke:${COLOR_OCUPADO.trazo}`, 'stroke-width:1.5');
    }
    reglas.push(`${sel}{${decl.join(';')}}`);
    reglas.push(`${sel}:hover{stroke:#222;stroke-width:3}`);
  }
  for (const id of resaltados) {
    const sel = `${base}[id="${escaparAtributo(id)}"]`;
    reglas.push(`${sel}{stroke:${GUINDA};stroke-width:3.5}`);
  }
  if (seleccionado) {
    const sel = `${base}[id="${escaparAtributo(seleccionado)}"]`;
    reglas.push(`${sel}{stroke:#222;stroke-width:4;stroke-dasharray:none}`);
  }
  return reglas.join('\n');
}

const alinear = (v: Vista, base: Vista): Vista => {
  const w = Math.min(Math.max(v.w, base.w * ZOOM_MIN), base.w);
  const h = (w / base.w) * base.h;
  const x = Math.min(Math.max(v.x, base.x - w * 0.25), base.x + base.w - w * 0.75);
  const y = Math.min(Math.max(v.y, base.y - h * 0.25), base.y + base.h - h * 0.75);
  return { x, y, w, h };
};

function cajaDe(svg: SVGSVGElement, ids: string[]): Vista | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const id of ids) {
    const nodo = svg.querySelector<SVGGraphicsElement>(`[id="${escaparAtributo(id)}"]`);
    if (!nodo || typeof nodo.getBBox !== 'function') continue;
    try {
      const b = nodo.getBBox();
      if (b.width === 0 && b.height === 0) continue;
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width);
      maxY = Math.max(maxY, b.y + b.height);
    } catch {
      // Sin layout (pruebas) o figura sin caja: se ignora.
    }
  }
  if (!Number.isFinite(minX)) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Encuadra una caja con margen y la proporción del plano. */
function encuadrar(caja: Vista, base: Vista): Vista {
  const proporcion = base.w / base.h;
  let w = caja.w + MARGEN * 2;
  let h = caja.h + MARGEN * 2;
  if (w / h < proporcion) w = h * proporcion;
  else h = w / proporcion;
  if (w < ANCHO_MINIMO) {
    w = ANCHO_MINIMO;
    h = w / proporcion;
  }
  return alinear({ x: caja.x + caja.w / 2 - w / 2, y: caja.y + caja.h / 2 - h / 2, w, h }, base);
}

const BotonControl: React.FC<{
  etiqueta: string;
  onClick: () => void;
  children: React.ReactNode;
  ancho?: boolean;
}> = ({ etiqueta, onClick, children, ancho = false }) => (
  <button
    type="button"
    aria-label={etiqueta}
    title={etiqueta}
    onClick={onClick}
    className={`flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-saie-divider bg-white/95 text-sm font-medium text-saie-text shadow-[0_2px_8px_rgba(34,34,34,0.12)] backdrop-blur hover:bg-saie-canvas ${ancho ? 'px-3' : 'w-11'}`}
  >
    {children}
  </button>
);

/**
 * Plano 2D del piso: el SVG de `assets/planos` incrustado, con cada espacio coloreado por su
 * estado (libre, ocupado), «tu espacio» marcado con un pin y la posibilidad de tocar un espacio
 * para ver su detalle. Se puede acercar, alejar y arrastrar. No usa WebGL, así que funciona en
 * cualquier dispositivo.
 */
export const Plano2D: React.FC<Plano2DProps> = ({
  piso,
  espacios,
  resaltados = [],
  seleccionado = null,
  onSeleccionar,
  etiqueta,
  className = '',
}) => {
  const textoOriginal = PLANOS_SVG[piso] ?? PLANOS_SVG[1];
  const html = useMemo(() => prepararSvg(textoOriginal), [textoOriginal]);
  const base = useMemo(() => vistaBase(textoOriginal), [textoOriginal]);
  const contenedor = useRef<HTMLDivElement>(null);
  const [vista, setVista] = useState<Vista>(base);
  const suprimirClic = useRef(false);
  const arrastre = useRef<{
    x: number;
    y: number;
    vista: Vista;
    ancho: number;
    movido: boolean;
  } | null>(null);

  const idsConDatos = useMemo(() => new Set(espacios.map((e) => e.id)), [espacios]);
  const idsResaltados = useMemo(() => new Set(resaltados), [resaltados]);
  const claveResaltados = resaltados.join('|');
  const claveEspacios = espacios.map((e) => e.id).join('|');

  const svgActual = () => contenedor.current?.querySelector('svg') ?? null;

  /** Encuadre inicial: los espacios resaltados, o todos los del piso si no hay resaltados. */
  const encuadreInicial = (): Vista => {
    const svg = svgActual();
    if (!svg) return base;
    const hayEstados = espacios.some((e) => e.estado !== undefined);
    const ids = resaltados.length > 0 && !hayEstados ? resaltados : espacios.map((e) => e.id);
    const caja = cajaDe(svg, ids);
    return caja ? encuadrar(caja, base) : base;
  };

  // Al cambiar de plano o de espacios, se vuelve a encuadrar.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- el encuadre depende del DOM ya pintado
    setVista(encuadreInicial());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, claveResaltados, claveEspacios]);

  useEffect(() => {
    svgActual()?.setAttribute('viewBox', `${vista.x} ${vista.y} ${vista.w} ${vista.h}`);
  }, [vista, html]);

  // Pin «Tu aula» sobre cada espacio resaltado.
  useEffect(() => {
    const svg = svgActual();
    if (!svg) return undefined;
    const NS = 'http://www.w3.org/2000/svg';
    const pines: SVGGElement[] = [];
    for (const id of resaltados) {
      const nodo = svg.querySelector<SVGGraphicsElement>(`[id="${escaparAtributo(id)}"]`);
      if (!nodo) continue;
      nodo.classList.add('plano2d-mia');
      if (typeof nodo.getBBox !== 'function') continue;
      try {
        const b = nodo.getBBox();
        if (b.width === 0 && b.height === 0) continue;
        const g = document.createElementNS(NS, 'g');
        g.setAttribute('class', 'plano2d-pin');
        g.setAttribute('pointer-events', 'none');
        g.setAttribute('aria-hidden', 'true');
        const cuerpo = document.createElementNS(NS, 'path');
        cuerpo.setAttribute(
          'd',
          `M${b.x + b.width / 2} ${b.y + 6} c-9 -11 -12 -17 -12 -22 a12 12 0 1 1 24 0 c0 5 -3 11 -12 22z`,
        );
        cuerpo.setAttribute('fill', GUINDA);
        cuerpo.setAttribute('stroke', '#fff');
        cuerpo.setAttribute('stroke-width', '2');
        const punto = document.createElementNS(NS, 'circle');
        punto.setAttribute('cx', String(b.x + b.width / 2));
        punto.setAttribute('cy', String(b.y - 16));
        punto.setAttribute('r', '4.5');
        punto.setAttribute('fill', '#fff');
        g.append(cuerpo, punto);
        svg.append(g);
        pines.push(g);
      } catch {
        // Sin layout: no se dibuja el pin, el contorno guinda basta.
      }
    }
    return () => {
      for (const g of pines) g.remove();
      for (const id of resaltados) {
        svg.querySelector(`[id="${escaparAtributo(id)}"]`)?.classList.remove('plano2d-mia');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, claveResaltados]);

  const css = useMemo(
    () => cssDinamico(espacios, idsResaltados, seleccionado),
    [espacios, idsResaltados, seleccionado],
  );

  const zoom = (factor: number) =>
    setVista((v) => {
      const w = v.w / factor;
      const h = v.h / factor;
      return alinear({ x: v.x + (v.w - w) / 2, y: v.y + (v.h - h) / 2, w, h }, base);
    });

  const alPulsar = (e: React.PointerEvent<HTMLDivElement>) => {
    const caja = e.currentTarget.getBoundingClientRect();
    arrastre.current = {
      x: e.clientX,
      y: e.clientY,
      vista,
      ancho: caja.width || 1,
      movido: false,
    };
  };

  const alMover = (e: React.PointerEvent<HTMLDivElement>) => {
    const a = arrastre.current;
    if (!a) return;
    const dx = e.clientX - a.x;
    const dy = e.clientY - a.y;
    if (!a.movido && Math.hypot(dx, dy) < UMBRAL_ARRASTRE_PX) return;
    a.movido = true;
    const escala = a.vista.w / a.ancho;
    setVista(alinear({ ...a.vista, x: a.vista.x - dx * escala, y: a.vista.y - dy * escala }, base));
  };

  const alSoltar = () => {
    // El clic que sigue a un arrastre no debe seleccionar nada.
    const movido = arrastre.current?.movido ?? false;
    arrastre.current = null;
    if (movido) {
      suprimirClic.current = true;
      setTimeout(() => {
        suprimirClic.current = false;
      }, 0);
    }
  };

  const alHacerClic = (e: React.MouseEvent<HTMLDivElement>) => {
    if (suprimirClic.current || !onSeleccionar) return;
    const nodo = (e.target as Element).closest('[id]');
    const id = nodo?.getAttribute('id');
    if (id && idsConDatos.has(id)) onSeleccionar(id === seleccionado ? null : id);
    else onSeleccionar(null);
  };

  const hayResaltados = resaltados.length > 0;
  const acercado = vista.w < base.w - 1;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-saie-divider bg-[#FAF6ED] ${className}`}
    >
      <style>{css}</style>
      <div
        ref={contenedor}
        role="group"
        aria-label={etiqueta}
        data-testid="plano-2d"
        onPointerDown={alPulsar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        onPointerLeave={alSoltar}
        onClick={alHacerClic}
        className="plano2d aspect-[912/818] max-h-[68vh] w-full cursor-grab touch-none select-none active:cursor-grabbing [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
        // El SVG es un activo propio del repositorio (assets/planos), no contenido del usuario.
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <div className="absolute right-3 top-3 flex flex-col gap-2">
        <BotonControl etiqueta="Acercar el plano" onClick={() => zoom(PASO_ZOOM)}>
          <span aria-hidden="true" className="text-xl leading-none">
            +
          </span>
        </BotonControl>
        <BotonControl etiqueta="Alejar el plano" onClick={() => zoom(1 / PASO_ZOOM)}>
          <span aria-hidden="true" className="text-xl leading-none">
            −
          </span>
        </BotonControl>
      </div>

      <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
        {hayResaltados && (
          <BotonControl
            etiqueta="Centrar en mi espacio"
            onClick={() => setVista(encuadreInicial())}
            ancho
          >
            <span aria-hidden="true">📍</span>
            <span>Mi aula</span>
          </BotonControl>
        )}
        {(acercado || hayResaltados) && (
          <BotonControl etiqueta="Ver todo el piso" onClick={() => setVista(base)} ancho>
            <span>Todo el piso</span>
          </BotonControl>
        )}
      </div>
    </div>
  );
};

export default Plano2D;

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { SelectorSegmentado } from '../estudiante/SelectorSegmentado';
import { idPanelPestana, idPestana } from '../estudiante/idsPestanas';
import {
  CLASES_RESERVABLES,
  COLOR_ACENTO_LABORATORIO,
  COLOR_BORDE,
  COLOR_CONTEXTO,
  COLOR_ESTADO,
  COLOR_MURO,
  COLOR_CONTORNO,
  COLOR_RESALTE,
  COLOR_SIN_DATOS,
} from '../mapa3d/config';
import type { EstadoOcupacion } from '../mapa3d/tipos';
import type { TrazoPiso } from './capaRuta';
import { ETIQUETA_PUERTA, IDS_ENTRADAS, NORTE_GRADOS } from './entradas';
import { ESTADO_TEXTO, PABELLON_TEXTO, TIPO_TEXTO, type EspacioMapa2D } from './etiquetas';
import { pasaFiltro, type FiltroMapa } from './filtros';
import {
  centroDe,
  leerPlano2D,
  pabellonDe,
  vecinoEnDireccion,
  type CajaPlano,
  type Direccion,
  type FiguraPlano2D,
  type Plano2D,
} from './plano';
import { PLANOS_SVG } from './planos';
import {
  acercar,
  centrarEn,
  desplazar,
  nivelZoom,
  pantallaAPlano,
  pxPorUnidad,
  PASO_ZOOM,
  type Pantalla,
} from './zoom';

export interface Mapa2DProps {
  /** Piso -> texto del SVG limpio de ese piso. Por defecto, los de `assets/planos/`. */
  planos?: Record<number, string>;
  /** Estado y tipo de cada espacio reservable (aulas y laboratorios). */
  espacios: EspacioMapa2D[];
  /** Espacio seleccionado (modo controlado). Si se omite, el componente lo gestiona. */
  seleccionado?: string | null;
  /** Ids a resaltar, p. ej. el espacio asignado a una sección. */
  resaltados?: string[];
  /** Piso inicial. Por defecto, el primero. */
  pisoInicial?: number;
  /** Piso mostrado (modo controlado). Si se da, manda sobre el que elija la persona. */
  piso?: number;
  /** Se emite al cambiar de piso. */
  onPisoCambiado?: (piso: number) => void;
  /**
   * `arriba` (por defecto) pone los controles sobre el plano; `lateral` los pone en una columna a
   * un lado, para usar mejor el espacio en una ventana ancha.
   */
  disposicion?: 'arriba' | 'lateral';
  /** Contenido extra al comienzo de la columna lateral (solo con `disposicion="lateral"`). */
  barraLateral?: React.ReactNode;
  /** Contenido extra al final de la columna lateral (solo con `disposicion="lateral"`). */
  pieLateral?: React.ReactNode;
  /** Se emite con el id del espacio al elegirlo, o `null` al pulsar fuera de una figura. */
  onSeleccionar?: (id: string | null) => void;
  /** Estados que muestra la leyenda. Por defecto, los tres. */
  estadosLeyenda?: EstadoOcupacion[];
  /** Lo que no cumpla el filtro se atenúa y deja de ser interactivo. */
  filtro?: FiltroMapa;
  /** Centra y acerca la vista en un espacio (cada `n` nuevo es una orden nueva). */
  enfocar?: { id: string; n: number } | null;
  /** Recorrido a dibujar sobre cada piso (pantalla de ruta). */
  capaRuta?: Record<number, TrazoPiso>;
  /** Número del paso de la ruta elegido: su punto lleva un anillo, sin mover la vista. */
  marcaActiva?: number | null;
  /** Con la rueda: `siempre` o solo con Ctrl/⌘ (para no atrapar el desplazamiento de la página). */
  rueda?: 'siempre' | 'con-ctrl';
  /** Muestra la leyenda de estados (por defecto, sí). La pantalla de ruta pone la suya. */
  leyenda?: boolean;
  className?: string;
}

const ESTADOS_TODOS: EstadoOcupacion[] = ['DISPONIBLE', 'OCUPADO', 'ALERTA_ACTIVA'];
const COLOR_FONDO_CONTEXTO = '#e2e8f0';
/** Colores de la ruta, de la guía: línea y puntos en guinda, destino en tinta, puertas en azul. */
const COLOR_RUTA = '#7b1113';
const COLOR_DESTINO = '#222222';
const COLOR_PUERTA = '#1f5fa8';
const ABREVIATURAS: Record<string, string> = { escalera: 'Esc.', ascensor: 'Asc.' };
const UMBRAL_ARRASTRE = 5;
const ZOOM_AL_ENFOCAR = 3;
const DIRECCION_TECLA: Record<string, Direccion> = {
  ArrowUp: 'arriba',
  ArrowDown: 'abajo',
  ArrowLeft: 'izquierda',
  ArrowRight: 'derecha',
};

/** Líneas de texto que se dibujan dentro de una figura. */
function lineasDeEtiqueta(f: FiguraPlano2D): string[] {
  if (CLASES_RESERVABLES.has(f.clase)) {
    const lineas = [f.id.split('-').slice(1).join('-')];
    if (f.clase === 'laboratorio') lineas.push('LAB');
    return lineas;
  }
  if (ABREVIATURAS[f.clase]) return [ABREVIATURAS[f.clase]];
  if (f.clase === 'patio' || f.clase === 'puerta' || !f.nombre) return [];
  return [f.nombre === 'Administrativo' ? 'Adm.' : f.nombre];
}

function relleno(f: FiguraPlano2D, espacio: EspacioMapa2D | undefined, idPatron: string): string {
  if (CLASES_RESERVABLES.has(f.clase)) {
    if (!espacio) return COLOR_SIN_DATOS;
    return espacio.estado === 'ALERTA_ACTIVA' ? `url(#${idPatron})` : COLOR_ESTADO[espacio.estado];
  }
  return COLOR_CONTEXTO[f.clase] ?? COLOR_FONDO_CONTEXTO;
}

/** Ícono de escalera (peldaños) o ascensor (flechas) en la parte alta de la figura. */
const IconoConexion: React.FC<{ figura: FiguraPlano2D }> = ({ figura: f }) => {
  const lado = Math.min(f.caja.ancho * 0.6, f.caja.alto * 0.32, 9);
  if (lado < 3) return null;
  const x = f.caja.x + f.caja.ancho / 2 - lado / 2;
  const y = f.caja.y + f.caja.alto * 0.08;
  const trazo = {
    fill: 'none',
    stroke: '#0f172a',
    strokeWidth: lado * 0.1,
    strokeLinejoin: 'round' as const,
  };
  return f.clase === 'escalera' ? (
    <polyline
      points={`${x},${y + lado} ${x},${y + lado * 0.66} ${x + lado * 0.33},${y + lado * 0.66} ${x + lado * 0.33},${y + lado * 0.33} ${x + lado * 0.66},${y + lado * 0.33} ${x + lado * 0.66},${y} ${x + lado},${y}`}
      {...trazo}
      pointerEvents="none"
    />
  ) : (
    <g pointerEvents="none" {...trazo}>
      <polygon
        points={`${x + lado * 0.5},${y} ${x + lado * 0.2},${y + lado * 0.4} ${x + lado * 0.8},${y + lado * 0.4}`}
        fill="#0f172a"
      />
      <polygon
        points={`${x + lado * 0.5},${y + lado} ${x + lado * 0.2},${y + lado * 0.6} ${x + lado * 0.8},${y + lado * 0.6}`}
        fill="#0f172a"
      />
    </g>
  );
};

interface FiguraMapaProps {
  figura: FiguraPlano2D;
  espacio: EspacioMapa2D | undefined;
  seleccionada: boolean;
  resaltada: boolean;
  /** `false` si el filtro la deja fuera: se ve atenuada y no se puede elegir. */
  visible: boolean;
  idPatron: string;
  onSeleccionar: (id: string) => void;
  onMover: (id: string, direccion: Direccion) => void;
  onTip: (id: string | null, x?: number, y?: number, deElemento?: Element) => void;
}

const FiguraMapa: React.FC<FiguraMapaProps> = ({
  figura: f,
  espacio,
  seleccionada,
  resaltada,
  visible,
  idPatron,
  onSeleccionar,
  onMover,
  onTip,
}) => {
  const interactiva = CLASES_RESERVABLES.has(f.clase) && espacio !== undefined && visible;
  const laboratorio = f.clase === 'laboratorio';
  const comunes = {
    fill: relleno(f, espacio, idPatron),
    stroke:
      seleccionada || resaltada
        ? COLOR_RESALTE
        : laboratorio
          ? COLOR_ACENTO_LABORATORIO
          : COLOR_BORDE,
    strokeWidth: seleccionada
      ? 2.4
      : resaltada
        ? 1.8
        : laboratorio
          ? 1.4
          : f.clase === 'patio'
            ? 0
            : 0.5,
    strokeDasharray: resaltada && !seleccionada ? '3 1.5' : undefined,
  };
  const forma = f.rect ? (
    <rect x={f.rect.x} y={f.rect.y} width={f.rect.ancho} height={f.rect.alto} {...comunes} />
  ) : (
    <polygon points={f.puntos ?? ''} {...comunes} />
  );

  const lineas = lineasDeEtiqueta(f);
  const conIcono = f.clase === 'escalera' || f.clase === 'ascensor';
  const tam = lineas.length
    ? Math.min(
        6.5,
        (f.caja.alto / (lineas.length + 0.6)) * 0.8,
        f.caja.ancho / (Math.max(...lineas.map((l) => l.length)) * 0.62),
      )
    : 0;
  const texto =
    tam >= 2.2
      ? lineas.map((linea, i) => (
          <text
            key={linea + i}
            x={f.caja.x + f.caja.ancho / 2}
            y={
              f.caja.y +
              f.caja.alto / 2 +
              (conIcono ? f.caja.alto * 0.12 : 0) +
              (i - (lineas.length - 1) / 2) * tam * 1.15
            }
            fontSize={tam}
            fontFamily="sans-serif"
            fontWeight={interactiva ? 600 : 400}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#0f172a"
            stroke="#ffffff"
            strokeWidth={tam * 0.22}
            strokeLinejoin="round"
            paintOrder="stroke"
            pointerEvents="none"
          >
            {linea}
          </text>
        ))
      : null;
  const icono = conIcono ? <IconoConexion figura={f} /> : null;

  if (!interactiva) {
    return (
      <g aria-hidden="true" pointerEvents="none" opacity={visible ? undefined : 0.22}>
        {forma}
        {icono}
        {texto}
      </g>
    );
  }

  const nombre = espacio.nombre ?? f.nombre ?? f.id;
  // Los dos pabellones repiten los números («Aula 101»): el lector de pantalla necesita distinguirlos.
  const pabellon = pabellonDe(f.id);
  const pabellonTexto = pabellon ? `${PABELLON_TEXTO[pabellon].toLowerCase()}, ` : '';
  return (
    <g
      role="button"
      tabIndex={0}
      data-id={f.id}
      aria-label={`${nombre}, ${pabellonTexto}${ESTADO_TEXTO[espacio.estado].toLowerCase()}`}
      aria-pressed={seleccionada}
      className="cursor-pointer outline-none [&:focus-visible>:first-child]:stroke-[#5c0d0e] [&:focus-visible>:first-child]:stroke-[2.6]"
      onClick={(e) => {
        e.stopPropagation();
        onSeleccionar(f.id);
      }}
      onPointerEnter={(e) => e.pointerType === 'mouse' && onTip(f.id, e.clientX, e.clientY)}
      onPointerMove={(e) => e.pointerType === 'mouse' && onTip(f.id, e.clientX, e.clientY)}
      onPointerLeave={() => onTip(null)}
      onFocus={(e) => onTip(f.id, undefined, undefined, e.currentTarget)}
      onBlur={() => onTip(null)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSeleccionar(f.id);
        } else if (DIRECCION_TECLA[e.key]) {
          e.preventDefault();
          onMover(f.id, DIRECCION_TECLA[e.key]);
        }
      }}
    >
      {forma}
      {texto}
    </g>
  );
};

/** Copia del contorno de una figura dibujada encima de todo lo demás: no recibe clics. */
const ContornoSuperpuesto: React.FC<{ figura: FiguraPlano2D; seleccionada: boolean }> = ({
  figura: f,
  seleccionada,
}) => {
  const trazo = (stroke: string, strokeWidth: number, strokeDasharray?: string) => {
    const comunes = {
      fill: 'none',
      stroke,
      strokeWidth,
      strokeDasharray,
      strokeLinejoin: 'round' as const,
      pointerEvents: 'none' as const,
    };
    return f.rect ? (
      <rect x={f.rect.x} y={f.rect.y} width={f.rect.ancho} height={f.rect.alto} {...comunes} />
    ) : (
      <polygon points={f.puntos ?? ''} {...comunes} />
    );
  };
  const grosor = seleccionada ? 2.4 : 1.6;
  return (
    <g aria-hidden="true">
      {/* Halo blanco bajo el trazo: se distingue sobre fondos claros y oscuros. */}
      {trazo('#ffffff', grosor + 2)}
      {trazo(COLOR_CONTORNO, grosor, seleccionada ? undefined : '3 1.5')}
    </g>
  );
};

/** Marca de una entrada o puerta al patio, sobre su puerta. */
const MarcadorEntrada: React.FC<{ figura: FiguraPlano2D; etiqueta: string }> = ({
  figura,
  etiqueta,
}) => {
  const c = centroDe(figura);
  return (
    <g aria-hidden="true" pointerEvents="none">
      <circle cx={c.x} cy={c.y} r={5.2} fill={COLOR_PUERTA} stroke="#ffffff" strokeWidth={1.2} />
      <path
        d={`M${c.x} ${c.y - 2.6} V${c.y + 2.2} M${c.x - 1.9} ${c.y + 0.4} L${c.x} ${c.y + 2.4} L${c.x + 1.9} ${c.y + 0.4}`}
        fill="none"
        stroke="#ffffff"
        strokeWidth={1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x={c.x}
        y={c.y + 10}
        fontSize={3.6}
        fontFamily="sans-serif"
        fontWeight={700}
        textAnchor="middle"
        fill={COLOR_PUERTA}
        stroke="#ffffff"
        strokeWidth={0.9}
        paintOrder="stroke"
      >
        {etiqueta}
      </text>
    </g>
  );
};

/** Recorrido de la ruta: línea discontinua con halo y puntos numerados. */
const RutaSobrePlano: React.FC<{ trazo: TrazoPiso; marcaActiva?: number | null }> = ({
  trazo,
  marcaActiva = null,
}) => {
  const puntos = trazo.puntos.map((p) => `${p.x},${p.y}`).join(' ');
  return (
    <g aria-hidden="true" pointerEvents="none">
      {trazo.puntos.length > 1 && (
        <>
          <polyline
            points={puntos}
            fill="none"
            stroke="#ffffff"
            strokeWidth={4.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={puntos}
            fill="none"
            stroke={COLOR_RUTA}
            strokeWidth={2.2}
            strokeDasharray="5 3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {trazo.marcas.map((m) => (
        <g key={`${m.numero}-${m.tipo}`}>
          {/* El paso elegido lleva un anillo: se ve sin acercar ni mover el plano. */}
          {m.numero === marcaActiva && (
            <>
              <circle
                cx={m.punto.x}
                cy={m.punto.y}
                r={11}
                fill="none"
                stroke="#ffffff"
                strokeWidth={4.4}
              />
              <circle
                cx={m.punto.x}
                cy={m.punto.y}
                r={11}
                fill="none"
                stroke={m.tipo === 'destino' ? COLOR_DESTINO : COLOR_RUTA}
                strokeWidth={2}
              />
            </>
          )}
          <circle
            cx={m.punto.x}
            cy={m.punto.y}
            r={m.tipo === 'destino' ? 6.4 : 5.4}
            fill={m.tipo === 'destino' ? COLOR_DESTINO : COLOR_RUTA}
            stroke="#ffffff"
            strokeWidth={1.4}
          />
          <text
            x={m.punto.x}
            y={m.punto.y}
            fontSize={5.4}
            fontWeight={700}
            fontFamily="sans-serif"
            textAnchor="middle"
            dominantBaseline="central"
            fill="#ffffff"
          >
            {m.numero}
          </text>
          <text
            x={m.punto.x}
            y={m.punto.y - 8.2}
            fontSize={4}
            fontWeight={700}
            fontFamily="sans-serif"
            textAnchor="middle"
            fill="#222222"
            stroke="#ffffff"
            strokeWidth={1}
            paintOrder="stroke"
          >
            {m.etiqueta}
          </text>
        </g>
      ))}
    </g>
  );
};

/** Flecha del norte, dibujada en la esquina de la vista actual. No hay escala: el plano no la tiene. */
const Norte: React.FC<{ vista: CajaPlano }> = ({ vista }) => {
  const u = vista.ancho / 150; // tamaño en pantalla constante: crece y se encoge con el zoom
  const texto = {
    fontSize: 2.4 * u,
    fontFamily: 'sans-serif',
    fill: '#0f172a',
    stroke: '#ffffff',
    strokeWidth: 0.7 * u,
    paintOrder: 'stroke' as const,
  };
  const cx = vista.x + vista.ancho - 6 * u;
  const cy = vista.y + 9 * u;
  return (
    <g aria-hidden="true" pointerEvents="none">
      <g transform={`rotate(${NORTE_GRADOS} ${cx} ${cy})`}>
        <polygon
          points={`${cx},${cy - 3.6 * u} ${cx + 1.8 * u},${cy + 2 * u} ${cx},${cy + 0.8 * u} ${cx - 1.8 * u},${cy + 2 * u}`}
          fill="#0f172a"
          stroke="#ffffff"
          strokeWidth={0.5 * u}
        />
        <text x={cx} y={cy - 4.6 * u} textAnchor="middle" fontWeight={700} {...texto}>
          N
        </text>
      </g>
    </g>
  );
};

/** Muestra de color de la leyenda. */
const Muestra: React.FC<{
  fill: string;
  stroke?: string;
  grosor?: number;
  defs?: React.ReactNode;
}> = ({ fill, stroke = COLOR_BORDE, grosor = 1, defs }) => (
  <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true" className="shrink-0">
    {defs && <defs>{defs}</defs>}
    <rect
      x="1"
      y="1"
      width="20"
      height="12"
      rx="2"
      fill={fill}
      stroke={stroke}
      strokeWidth={grosor}
    />
  </svg>
);

/**
 * Leyenda de estados y del marcador de laboratorio. Es autónoma (lleva su propio patrón de rayas),
 * así que se puede poner al lado del plano 2D o de la maqueta 3D.
 */
export const LeyendaMapa: React.FC<{
  estados?: EstadoOcupacion[];
  vertical?: boolean;
  /** Añade la marca de entrada del pabellón (solo existe en el plano 2D). */
  entradas?: boolean;
}> = ({ estados = ESTADOS_TODOS, vertical = false, entradas = false }) => {
  const idPatron = `leyenda-alerta-${useId().replace(/:/g, '')}`;
  return (
    <ul
      aria-label="Leyenda del mapa"
      className={`flex text-sm text-saie-text ${vertical ? 'flex-col gap-2' : 'flex-wrap gap-x-5 gap-y-2'}`}
    >
      {estados.map((estado) => (
        <li key={estado} className="flex items-center gap-2">
          <Muestra
            fill={estado === 'ALERTA_ACTIVA' ? `url(#${idPatron})` : COLOR_ESTADO[estado]}
            defs={
              estado === 'ALERTA_ACTIVA' ? <PatronAlerta id={idPatron} escala={1.6} /> : undefined
            }
          />
          {ESTADO_TEXTO[estado]}
        </li>
      ))}
      <li className="flex items-center gap-2">
        <Muestra fill={COLOR_SIN_DATOS} />
        Sin datos
      </li>
      <li className="flex items-center gap-2">
        <Muestra fill={COLOR_CONTEXTO.administrativo} />
        No reservable (baños, oficinas…)
      </li>
      <li className="flex items-center gap-2">
        <Muestra fill="#ffffff" stroke={COLOR_ACENTO_LABORATORIO} grosor={2} />
        Laboratorio (borde azul y «LAB»)
      </li>
      {entradas && (
        <li className="flex items-center gap-2">
          <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true" className="shrink-0">
            <circle cx="11" cy="7" r="6" fill={COLOR_PUERTA} />
          </svg>
          Entrada principal o puerta al patio
        </li>
      )}
    </ul>
  );
};

/** Patrón de rayas de la alerta: no depende solo del color (WCAG 1.4.1). */
const PatronAlerta: React.FC<{ id: string; escala?: number }> = ({ id, escala = 1 }) => (
  <pattern
    id={id}
    width={4 * escala}
    height={4 * escala}
    patternUnits="userSpaceOnUse"
    patternTransform="rotate(45)"
  >
    <rect width={4 * escala} height={4 * escala} fill={COLOR_ESTADO.ALERTA_ACTIVA} />
    <rect width={1.6 * escala} height={4 * escala} fill="#92400e" />
  </pattern>
);

/** Recuadro que envuelve lo dibujado (figuras y muros), con un margen pequeño. */
function cajaDeContenido(plano: Plano2D): CajaPlano {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const f of plano.figuras) {
    xs.push(f.caja.x, f.caja.x + f.caja.ancho);
    ys.push(f.caja.y, f.caja.y + f.caja.alto);
  }
  for (const muro of plano.muros) {
    for (const par of muro.trim().split(/\s+/)) {
      const [x, y] = par.split(',').map(Number);
      xs.push(x);
      ys.push(y);
    }
  }
  if (xs.length === 0) return plano.caja;
  const margen = 6;
  const x = Math.min(...xs) - margen;
  const y = Math.min(...ys) - margen;
  return { x, y, ancho: Math.max(...xs) + margen - x, alto: Math.max(...ys) + margen - y };
}

const BotonZoom: React.FC<{
  etiqueta: string;
  onClick: () => void;
  deshabilitado?: boolean;
  children: React.ReactNode;
}> = ({ etiqueta, onClick, deshabilitado, children }) => (
  <button
    type="button"
    aria-label={etiqueta}
    title={etiqueta}
    disabled={deshabilitado}
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-saie-border bg-white text-lg font-semibold text-saie-text hover:bg-saie-text/5 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {children}
  </button>
);

/**
 * Mapa 2D de ocupación por piso (Issues 4.13 y 3.18): dibuja el plano SVG del piso y colorea
 * cada aula y laboratorio según su estado. Es la vista por defecto y el respaldo de la 3D, y
 * comparte con ella el contrato de `espacios`, `seleccionado`, `resaltados` y `onSeleccionar`.
 *
 * Cada figura se enlaza con su espacio por el `id` del plano (`NUE-101`). El estado se distingue
 * por color y por patrón (la alerta va rayada), el laboratorio por su borde azul y el texto
 * «LAB», y cada espacio es un botón operable con el teclado (Tab, y las flechas para pasar al
 * espacio vecino). El plano se acerca y desplaza con rueda, gestos, botones o teclado.
 */
export const Mapa2D: React.FC<Mapa2DProps> = ({
  planos = PLANOS_SVG,
  espacios,
  seleccionado,
  resaltados = [],
  pisoInicial,
  piso: pisoControlado,
  onSeleccionar,
  onPisoCambiado,
  disposicion = 'arriba',
  barraLateral,
  pieLateral,
  estadosLeyenda = ESTADOS_TODOS,
  filtro,
  enfocar,
  capaRuta,
  marcaActiva,
  rueda,
  leyenda = true,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const idPatron = `mapa2d-alerta-${uid}`;
  const idBase = `mapa2d-${uid}`;
  const idAyuda = `${idBase}-ayuda`;
  const lateral = disposicion === 'lateral';
  const ruedaEfectiva = rueda ?? (lateral ? 'siempre' : 'con-ctrl');

  const pisos = useMemo(
    () =>
      Object.keys(planos)
        .map(Number)
        .sort((a, b) => a - b),
    [planos],
  );
  const [pisoElegido, setPisoElegido] = useState<number | undefined>(pisoInicial);
  const pisoPedido = pisoControlado ?? pisoElegido;
  const piso = pisoPedido !== undefined && pisos.includes(pisoPedido) ? pisoPedido : pisos[0];
  const [interna, setInterna] = useState<string | null>(null);
  const actual = seleccionado !== undefined ? seleccionado : interna;

  const lectura = useMemo<{ plano: Plano2D | null; error: boolean }>(() => {
    if (piso === undefined) return { plano: null, error: false };
    try {
      return { plano: leerPlano2D(planos[piso]), error: false };
    } catch {
      return { plano: null, error: true };
    }
  }, [planos, piso]);
  const { plano } = lectura;

  const porId = useMemo(() => new Map(espacios.map((e) => [e.id, e])), [espacios]);
  const iluminados = useMemo(() => new Set(resaltados), [resaltados]);
  const caja = useMemo(() => (plano ? cajaDeContenido(plano) : null), [plano]);

  // --- Zoom y desplazamiento ------------------------------------------------------------------
  const svgRef = useRef<SVGSVGElement>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [zp, setZp] = useState<{ piso: number; caja: CajaPlano } | null>(null);
  const vista = caja ? (zp && zp.piso === piso ? zp.caja : caja) : null;
  const zoom = caja && vista ? nivelZoom(caja, vista) : 1;

  const mover = useCallback(
    (fn: (v: CajaPlano, base: CajaPlano) => CajaPlano) => {
      if (!caja || piso === undefined) return;
      setZp((prev) => ({ piso, caja: fn(prev && prev.piso === piso ? prev.caja : caja, caja) }));
    },
    [caja, piso],
  );

  const medir = useCallback((): Pantalla & { left: number; top: number } => {
    const r = svgRef.current?.getBoundingClientRect();
    return { ancho: r?.width ?? 0, alto: r?.height ?? 0, left: r?.left ?? 0, top: r?.top ?? 0 };
  }, []);

  const acercarEn = useCallback(
    (factor: number, clientX?: number, clientY?: number) => {
      const m = medir();
      mover((v, base) => {
        const ancla =
          clientX === undefined || clientY === undefined
            ? { x: v.x + v.ancho / 2, y: v.y + v.alto / 2 }
            : pantallaAPlano(v, m, clientX - m.left, clientY - m.top);
        return acercar(base, v, factor, ancla);
      });
    },
    [mover, medir],
  );

  // La rueda necesita un oyente no pasivo para poder impedir el desplazamiento de la página.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const alRodar = (e: WheelEvent) => {
      if (ruedaEfectiva === 'con-ctrl' && !e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      acercarEn(Math.pow(1.0022, -e.deltaY), e.clientX, e.clientY);
    };
    svg.addEventListener('wheel', alRodar, { passive: false });
    return () => svg.removeEventListener('wheel', alRodar);
  }, [acercarEn, ruedaEfectiva, plano]);

  const punteros = useRef(new Map<number, { x: number; y: number }>());
  const gesto = useRef({ arrastrado: false, inicioX: 0, inicioY: 0, distancia: 0 });

  const alPulsar = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (punteros.current.size === 1) {
      gesto.current = { arrastrado: false, inicioX: e.clientX, inicioY: e.clientY, distancia: 0 };
    } else if (punteros.current.size === 2) {
      const [a, b] = [...punteros.current.values()];
      gesto.current.distancia = Math.hypot(a.x - b.x, a.y - b.y);
      gesto.current.arrastrado = true;
    }
  };

  const alMover = (e: React.PointerEvent<SVGSVGElement>) => {
    const previo = punteros.current.get(e.pointerId);
    if (!previo) return;
    const m = medir();
    if (punteros.current.size === 2) {
      punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const [a, b] = [...punteros.current.values()];
      const distancia = Math.hypot(a.x - b.x, a.y - b.y);
      if (gesto.current.distancia > 0 && distancia > 0) {
        acercarEn(distancia / gesto.current.distancia, (a.x + b.x) / 2, (a.y + b.y) / 2);
      }
      gesto.current.distancia = distancia;
      return;
    }
    if (!gesto.current.arrastrado) {
      if (
        Math.hypot(e.clientX - gesto.current.inicioX, e.clientY - gesto.current.inicioY) <
        UMBRAL_ARRASTRE
      )
        return;
      gesto.current.arrastrado = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    const dx = e.clientX - previo.x;
    const dy = e.clientY - previo.y;
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    mover((v, base) => {
      const k = pxPorUnidad(v, m);
      return desplazar(base, v, -dx / k, -dy / k);
    });
  };

  const alSoltar = (e: React.PointerEvent<SVGSVGElement>) => {
    punteros.current.delete(e.pointerId);
    if (punteros.current.size < 2) gesto.current.distancia = 0;
  };

  // --- Enfocar un espacio (buscador) -----------------------------------------------------------
  const [focoAplicado, setFocoAplicado] = useState<number | undefined>(undefined);
  if (enfocar && enfocar.n !== focoAplicado && plano && caja && piso !== undefined) {
    const figura = plano.figuras.find((f) => f.id === enfocar.id);
    if (figura) {
      setFocoAplicado(enfocar.n);
      setZp({ piso, caja: centrarEn(caja, centroDe(figura), ZOOM_AL_ENFOCAR) });
    }
  }

  // --- Selección, tooltip y teclado ------------------------------------------------------------
  const seleccionar = (id: string | null) => {
    if (seleccionado === undefined) setInterna(id);
    onSeleccionar?.(id);
  };

  const [tip, setTip] = useState<{ id: string; x: number; y: number } | null>(null);
  const alTip = (id: string | null, x?: number, y?: number, deElemento?: Element) => {
    if (id === null || gesto.current.arrastrado) {
      setTip(null);
      return;
    }
    const caja0 = contenedorRef.current?.getBoundingClientRect();
    if (!caja0) return;
    if (deElemento) {
      const r = deElemento.getBoundingClientRect();
      setTip({ id, x: r.left + r.width / 2 - caja0.left, y: r.top - caja0.top });
    } else if (x !== undefined && y !== undefined) {
      setTip({ id, x: x - caja0.left, y: y - caja0.top - 8 });
    }
  };

  const alMoverTeclado = (desde: string, direccion: Direccion) => {
    if (!plano) return;
    const candidatas = plano.figuras.filter((f) => {
      const e = porId.get(f.id);
      return CLASES_RESERVABLES.has(f.clase) && e && (!filtro || pasaFiltro(e, filtro));
    });
    const destino = vecinoEnDireccion(candidatas, desde, direccion);
    if (!destino) return;
    svgRef.current?.querySelector<SVGGElement>(`[data-id="${destino.id}"]`)?.focus();
  };

  const alTeclearMapa = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === '+' || e.key === '=') acercarEn(PASO_ZOOM);
    else if (e.key === '-' || e.key === '_') acercarEn(1 / PASO_ZOOM);
    else if (e.key === '0') setZp(null);
    else return;
    e.preventDefault();
  };

  if (pisos.length === 0 || lectura.error) {
    return (
      <p
        role="alert"
        className="rounded-lg border border-saie-danger/30 bg-saie-danger-soft p-4 text-saie-danger-strong"
      >
        {lectura.error ? 'No se pudo leer el plano de este piso.' : 'No hay planos disponibles.'}
      </p>
    );
  }

  const opcionesPiso = pisos.map((p) => ({ valor: String(p), etiqueta: `Piso ${p}` }));

  const selectorPiso = (
    <SelectorSegmentado
      etiquetaGrupo="Piso"
      idBase={idBase}
      opciones={opcionesPiso}
      valor={String(piso)}
      orientacion={lateral ? 'vertical' : 'horizontal'}
      className={lateral ? 'w-full' : ''}
      onCambiar={(v) => {
        setPisoElegido(Number(v));
        onPisoCambiado?.(Number(v));
      }}
    />
  );

  const espacioTip = tip ? porId.get(tip.id) : undefined;
  const trazo = capaRuta && piso !== undefined ? capaRuta[piso] : undefined;
  const aTocar = lateral || zoom > 1.01 ? 'none' : 'pan-y';

  return (
    <section
      aria-label="Mapa de ocupación"
      className={`flex gap-4 ${lateral ? 'flex-col lg:flex-row lg:items-start' : 'flex-col'} ${className}`}
    >
      {!lateral && <div className="flex flex-wrap items-center gap-3">{selectorPiso}</div>}

      <div
        ref={contenedorRef}
        role="tabpanel"
        id={idPanelPestana(idBase, String(piso))}
        aria-labelledby={idPestana(idBase, String(piso))}
        onKeyDown={alTeclearMapa}
        className={`relative overflow-hidden rounded-xl border border-saie-divider bg-white p-2 ${
          lateral ? 'order-2 min-w-0 flex-1 lg:order-1' : ''
        }`}
      >
        {plano && caja && vista && (
          <svg
            ref={svgRef}
            viewBox={`${vista.x} ${vista.y} ${vista.ancho} ${vista.alto}`}
            role="group"
            aria-label={`Plano del piso ${piso}`}
            aria-describedby={idAyuda}
            style={{ touchAction: aTocar }}
            className={`h-auto w-full select-none ${zoom > 1.01 ? 'cursor-grab active:cursor-grabbing' : ''} ${
              lateral ? 'max-h-[calc(100vh-9rem)]' : 'max-h-[75vh]'
            }`}
            onPointerDown={alPulsar}
            onPointerMove={alMover}
            onPointerUp={alSoltar}
            onPointerCancel={alSoltar}
            onClickCapture={(e) => {
              // Un arrastre no es un clic: no selecciona ni deselecciona.
              if (gesto.current.arrastrado) {
                e.stopPropagation();
                gesto.current.arrastrado = false;
              }
            }}
            onClick={() => seleccionar(null)}
          >
            <defs>
              <PatronAlerta id={idPatron} />
            </defs>
            {plano.figuras.map((f) => {
              const espacio = porId.get(f.id);
              return (
                <FiguraMapa
                  key={f.id}
                  figura={f}
                  espacio={espacio}
                  seleccionada={actual === f.id}
                  resaltada={iluminados.has(f.id)}
                  visible={!filtro || !espacio || pasaFiltro(espacio, filtro)}
                  idPatron={idPatron}
                  onSeleccionar={seleccionar}
                  onMover={alMoverTeclado}
                  onTip={alTip}
                />
              );
            })}
            {plano.muros.map((puntos, i) => (
              <polyline
                key={i}
                points={puntos}
                fill="none"
                stroke={COLOR_MURO}
                strokeWidth={2}
                strokeLinejoin="round"
                pointerEvents="none"
                aria-hidden="true"
              />
            ))}
            {/* Contornos por encima de todo (también de los muros): lo seleccionado y lo resaltado. */}
            {plano.figuras
              .filter((f) => iluminados.has(f.id) || actual === f.id)
              .sort((a, b) => Number(actual === a.id) - Number(actual === b.id))
              .map((f) => (
                <ContornoSuperpuesto key={f.id} figura={f} seleccionada={actual === f.id} />
              ))}
            {plano.figuras
              .filter((f) => IDS_ENTRADAS.has(f.id))
              .map((f) => (
                <MarcadorEntrada
                  key={f.id}
                  figura={f}
                  etiqueta={ETIQUETA_PUERTA[f.id] ?? 'Puerta'}
                />
              ))}
            {trazo && <RutaSobrePlano trazo={trazo} marcaActiva={marcaActiva} />}
            <Norte vista={vista} />
          </svg>
        )}

        <p id={idAyuda} className="sr-only">
          Plano interactivo. Tab y las flechas para moverte entre aulas, Enter para elegir, más y
          menos para acercar o alejar, y cero para ver todo el piso.
        </p>

        <div
          role="group"
          aria-label="Zoom del plano"
          className="absolute right-3 top-3 flex flex-col gap-1"
        >
          <BotonZoom etiqueta="Acercar" onClick={() => acercarEn(PASO_ZOOM)}>
            +
          </BotonZoom>
          <BotonZoom
            etiqueta="Alejar"
            onClick={() => acercarEn(1 / PASO_ZOOM)}
            deshabilitado={zoom <= 1.01}
          >
            −
          </BotonZoom>
          <BotonZoom
            etiqueta="Ver todo el piso"
            onClick={() => setZp(null)}
            deshabilitado={zoom <= 1.01}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
          </BotonZoom>
        </div>

        {tip && espacioTip && (
          <div
            role="tooltip"
            style={{ left: tip.x, top: tip.y }}
            className="pointer-events-none absolute z-20 max-w-56 -translate-x-1/2 -translate-y-full rounded-lg bg-saie-text px-3 py-2 text-xs text-white shadow-lg"
          >
            <strong className="block text-sm">{espacioTip.nombre ?? espacioTip.id}</strong>
            {ESTADO_TEXTO[espacioTip.estado]} · {TIPO_TEXTO[espacioTip.tipo]}
            {espacioTip.aforo !== undefined && ` · ${espacioTip.aforo} personas`}
          </div>
        )}
      </div>

      {lateral ? (
        <aside
          aria-label="Controles del mapa"
          className="order-1 flex flex-col gap-4 lg:order-2 lg:w-60 lg:shrink-0"
        >
          {barraLateral}
          {selectorPiso}
          {leyenda && <LeyendaMapa estados={estadosLeyenda} vertical entradas />}
          {pieLateral}
        </aside>
      ) : (
        leyenda && <LeyendaMapa estados={estadosLeyenda} entradas />
      )}
    </section>
  );
};

export default Mapa2D;

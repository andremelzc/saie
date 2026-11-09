import React, { useId, useMemo, useState } from 'react';
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
import { ESTADO_TEXTO, PABELLON_TEXTO, type EspacioMapa2D } from './etiquetas';
import { leerPlano2D, pabellonDe, type CajaPlano, type FiguraPlano2D, type Plano2D } from './plano';
import { PLANOS_SVG } from './planos';

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
  className?: string;
}

const ESTADOS_TODOS: EstadoOcupacion[] = ['DISPONIBLE', 'OCUPADO', 'ALERTA_ACTIVA'];
const COLOR_FONDO_CONTEXTO = '#e2e8f0';
const ABREVIATURAS: Record<string, string> = { escalera: 'Esc.', ascensor: 'Asc.' };

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

interface FiguraMapaProps {
  figura: FiguraPlano2D;
  espacio: EspacioMapa2D | undefined;
  seleccionada: boolean;
  resaltada: boolean;
  idPatron: string;
  onSeleccionar: (id: string) => void;
}

const FiguraMapa: React.FC<FiguraMapaProps> = ({
  figura: f,
  espacio,
  seleccionada,
  resaltada,
  idPatron,
  onSeleccionar,
}) => {
  const interactiva = CLASES_RESERVABLES.has(f.clase) && espacio !== undefined;
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
            y={f.caja.y + f.caja.alto / 2 + (i - (lineas.length - 1) / 2) * tam * 1.15}
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

  if (!interactiva) {
    return (
      <g aria-hidden="true" pointerEvents="none">
        {forma}
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
      aria-label={`${nombre}, ${pabellonTexto}${ESTADO_TEXTO[espacio.estado].toLowerCase()}`}
      aria-pressed={seleccionada}
      className="cursor-pointer outline-none [&:focus-visible>:first-child]:stroke-[#312e81] [&:focus-visible>:first-child]:stroke-[2.6]"
      onClick={(e) => {
        e.stopPropagation();
        onSeleccionar(f.id);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSeleccionar(f.id);
        }
      }}
    >
      {forma}
      {texto}
      <title>{`${nombre}: ${ESTADO_TEXTO[espacio.estado].toLowerCase()}`}</title>
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
export const LeyendaMapa: React.FC<{ estados?: EstadoOcupacion[]; vertical?: boolean }> = ({
  estados = ESTADOS_TODOS,
  vertical = false,
}) => {
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
        Laboratorio (borde turquesa y «LAB»)
      </li>
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

/**
 * Mapa 2D de ocupación por piso (Issues 4.13 y 3.18): dibuja el plano SVG del piso y colorea
 * cada aula y laboratorio según su estado. Es la vista por defecto y el respaldo de la 3D, y
 * comparte con ella el contrato de `espacios`, `seleccionado`, `resaltados` y `onSeleccionar`.
 *
 * Cada figura se enlaza con su espacio por el `id` del plano (`NUE-101`). El estado se distingue
 * por color y por patrón (la alerta va rayada), el laboratorio por su borde turquesa y el texto
 * «LAB», y cada espacio es un botón operable con el teclado.
 */
export const Mapa2D: React.FC<Mapa2DProps> = ({
  planos = PLANOS_SVG,
  espacios,
  seleccionado,
  resaltados = [],
  pisoInicial,
  onSeleccionar,
  onPisoCambiado,
  disposicion = 'arriba',
  barraLateral,
  pieLateral,
  estadosLeyenda = ESTADOS_TODOS,
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');
  const idPatron = `mapa2d-alerta-${uid}`;
  const idBase = `mapa2d-${uid}`;

  const pisos = useMemo(
    () =>
      Object.keys(planos)
        .map(Number)
        .sort((a, b) => a - b),
    [planos],
  );
  const [pisoElegido, setPisoElegido] = useState<number | undefined>(pisoInicial);
  const piso = pisoElegido !== undefined && pisos.includes(pisoElegido) ? pisoElegido : pisos[0];
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

  const seleccionar = (id: string | null) => {
    if (seleccionado === undefined) setInterna(id);
    onSeleccionar?.(id);
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

  const lateral = disposicion === 'lateral';
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

  return (
    <section
      aria-label="Mapa de ocupación"
      className={`flex gap-4 ${lateral ? 'flex-col lg:flex-row lg:items-start' : 'flex-col'} ${className}`}
    >
      {!lateral && <div className="flex flex-wrap items-center gap-3">{selectorPiso}</div>}

      <div
        role="tabpanel"
        id={idPanelPestana(idBase, String(piso))}
        aria-labelledby={idPestana(idBase, String(piso))}
        className={`overflow-hidden rounded-xl border border-saie-divider bg-white p-2 ${
          lateral ? 'order-2 min-w-0 flex-1 lg:order-1' : ''
        }`}
      >
        {plano && caja && (
          <svg
            viewBox={`${caja.x} ${caja.y} ${caja.ancho} ${caja.alto}`}
            role="group"
            aria-label={`Plano del piso ${piso}`}
            className={`h-auto w-full select-none ${
              lateral ? 'max-h-[calc(100vh-9rem)]' : 'max-h-[75vh]'
            }`}
            onClick={() => seleccionar(null)}
          >
            <defs>
              <PatronAlerta id={idPatron} />
            </defs>
            {plano.figuras.map((f) => (
              <FiguraMapa
                key={f.id}
                figura={f}
                espacio={porId.get(f.id)}
                seleccionada={actual === f.id}
                resaltada={iluminados.has(f.id)}
                idPatron={idPatron}
                onSeleccionar={seleccionar}
              />
            ))}
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
          </svg>
        )}
      </div>

      {lateral ? (
        <aside
          aria-label="Controles del mapa"
          className="order-1 flex flex-col gap-4 lg:order-2 lg:w-60 lg:shrink-0"
        >
          {barraLateral}
          {selectorPiso}
          <LeyendaMapa estados={estadosLeyenda} vertical />
          {pieLateral}
        </aside>
      ) : (
        <LeyendaMapa estados={estadosLeyenda} />
      )}
    </section>
  );
};

export default Mapa2D;

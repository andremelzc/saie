import { clasesBoton } from '../ui/clasesBoton';
import { Component, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { CLASES_CONEXION, CLASES_RESERVABLES } from './config';
import Escena from './Escena';
import type { OrdenCamara } from './Escena';
import { leerPlano } from './geometria';
import type { PlanoGeometria } from './geometria';
import { accionDeTecla } from './teclado';
import type { EspacioMapa, Mapa3DProps } from './tipos';
import { ESTADO_TEXTO, TIPO_TEXTO } from '../mapa2d/etiquetas';

/** Botón de los controles flotantes del 3D: mismo tamaño y colores que el resto de la interfaz. */
const claseControl3D = (activo: boolean) => clasesBoton(activo ? 'primario' : 'fantasma', 'sm');

/** Botón de solo icono de los controles flotantes: 44 px, el mínimo táctil. */
const claseIcono3D =
  'flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-saie-text hover:bg-saie-primary/5 focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-saie-text';
const ICONO_SVG = {
  className: 'h-5 w-5',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
};

function hayWebGL(): boolean {
  try {
    const lienzo = document.createElement('canvas');
    return Boolean(lienzo.getContext('webgl2') ?? lienzo.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Si el contexto WebGL falla al iniciar o se pierde, se muestra el mapa 2D en su lugar. */
class LimiteError extends Component<
  { fallback: ReactNode; children: ReactNode },
  { fallo: boolean }
> {
  state = { fallo: false };

  static getDerivedStateFromError() {
    return { fallo: true };
  }

  render() {
    return this.state.fallo ? this.props.fallback : this.props.children;
  }
}

interface EstadoCarga {
  /** Peticiones a las que corresponde este estado; si no coincide con las actuales, se está cargando. */
  clave: string;
  planos?: Record<number, PlanoGeometria>;
  error?: string;
}

function usePlanos(urls: Record<number, string>): { cargando: boolean; estado: EstadoCarga } {
  const clave = JSON.stringify(urls);
  const [estado, setEstado] = useState<EstadoCarga>({ clave: '' });

  useEffect(() => {
    let cancelado = false;
    const pedidos = Object.entries(JSON.parse(clave) as Record<string, string>);

    Promise.all(
      pedidos.map(async ([piso, url]) => {
        const respuesta = await fetch(url);
        if (!respuesta.ok) throw new Error(`No se pudo cargar el plano del piso ${piso}`);
        return [Number(piso), leerPlano(await respuesta.text())] as const;
      }),
    )
      .then((pares) => {
        if (!cancelado) setEstado({ clave, planos: Object.fromEntries(pares) });
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setEstado({
            clave,
            error: e instanceof Error ? e.message : 'No se pudo cargar el plano',
          });
        }
      });

    return () => {
      cancelado = true;
    };
  }, [clave]);

  return { cargando: estado.clave !== clave, estado };
}

/**
 * Issue 4.23: maqueta 3D navegable del mapa de ocupación. Extruye los SVG de los planos, colorea
 * cada espacio según su estado y emite el id del espacio al hacer clic. Todo llega por props;
 * no llama al backend (la conexión con datos reales es el Issue 4.24).
 *
 * Cárgalo con `Mapa3DLazy` para no sumar three.js al bundle inicial.
 */
export default function Mapa3D({
  planos: urls,
  espacios,
  seleccionado: seleccionadoControlado,
  resaltados = [],
  pisoInicial,
  onSeleccionar,
  onPisoCambiado,
  ordenCamara,
  onAviso = (mensaje) => console.warn(`[Mapa3D] ${mensaje}`),
  fallback = null,
  className = '',
}: Mapa3DProps) {
  const webgl = useMemo(() => hayWebGL(), []);
  const { cargando, estado } = usePlanos(urls);
  const [pisoElegido, setPisoElegido] = useState<number | 'todos' | undefined>(pisoInicial);
  // El piso puede venir de fuera (buscador, URL): si `pisoInicial` cambia, se sigue.
  const [pisoPrevio, setPisoPrevio] = useState(pisoInicial);
  if (pisoInicial !== pisoPrevio) {
    setPisoPrevio(pisoInicial);
    setPisoElegido(pisoInicial);
  }
  const [ordenInterna, setOrdenInterna] = useState<OrdenCamara | null>(null);
  const orden =
    ordenCamara && (!ordenInterna || ordenCamara.n > ordenInterna.n) ? ordenCamara : ordenInterna;
  // `n` siempre crece: dos pulsaciones en el mismo milisegundo son dos órdenes distintas.
  const ultimaN = useRef(0);
  const nuevaOrden = (orden: Omit<OrdenCamara, 'n'>): OrdenCamara => {
    ultimaN.current = Math.max(Date.now(), ultimaN.current + 1);
    return { ...orden, n: ultimaN.current };
  };
  const ordenar = (tipo: 'reiniciar' | 'cenital') => setOrdenInterna(nuevaOrden({ tipo }));
  const alTeclear = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Solo si el foco está en el lienzo: en los botones, las teclas son suyas.
    if (e.target !== e.currentTarget) return;
    const accion = accionDeTecla(e.key, e.shiftKey, e.ctrlKey || e.altKey || e.metaKey);
    if (!accion) return;
    e.preventDefault();
    setOrdenInterna(
      nuevaOrden(
        accion.tipo === 'reiniciar'
          ? { tipo: 'reiniciar' }
          : { tipo: 'mover', movimiento: accion.movimiento },
      ),
    );
  };
  const idAyuda = useId();
  const [seleccionInterna, setSeleccionInterna] = useState<string | null>(null);
  // El espacio bajo el cursor y dónde está, para el cuadro que lo describe.
  const [apuntado, setApuntado] = useState<{ id: string; x: number; y: number } | null>(null);
  const [conector, setConector] = useState<string | null>(null);
  const avisados = useRef(new Set<string>());

  const planos = estado.planos;
  const pisos = useMemo(
    () =>
      Object.keys(planos ?? {})
        .map(Number)
        .sort((a, b) => a - b),
    [planos],
  );
  const piso = pisoElegido ?? pisos[0];
  // Un piso se muestra como corte del edificio: ese piso abierto sobre los de abajo.
  const pisosVisibles =
    piso === 'todos' || piso === undefined ? pisos : pisos.filter((p) => p <= piso);

  // Escaleras y ascensores: el mismo id en varios planos es la misma escalera o ascensor.
  const conexiones = useMemo(() => {
    const mapa = new Map<string, { clase: string; pisos: number[] }>();
    for (const [numero, plano] of Object.entries(planos ?? {})) {
      for (const figura of plano.figuras) {
        if (!CLASES_CONEXION.has(figura.clase)) continue;
        const actual = mapa.get(figura.id) ?? { clase: figura.clase, pisos: [] };
        actual.pisos.push(Number(numero));
        mapa.set(figura.id, actual);
      }
    }
    return mapa;
  }, [planos]);
  const infoConector = conector ? conexiones.get(conector) : undefined;
  const destinos = (infoConector?.pisos ?? []).filter((p) => p !== piso).sort((a, b) => a - b);

  const mapaEspacios = useMemo(() => new Map(espacios.map((e) => [e.id, e])), [espacios]);
  const setResaltados = useMemo(
    () => new Set(conector ? [...resaltados, conector] : resaltados),
    [resaltados, conector],
  );
  const seleccionado =
    seleccionadoControlado !== undefined ? seleccionadoControlado : seleccionInterna;

  // Avisos de datos: figuras reservables sin espacio y espacios sin figura en el plano.
  useEffect(() => {
    if (!planos) return;
    const enPlano = new Set<string>();
    const mensajes: string[] = [];

    for (const [numero, plano] of Object.entries(planos)) {
      for (const figura of plano.figuras) {
        enPlano.add(figura.id);
        if (CLASES_RESERVABLES.has(figura.clase) && !mapaEspacios.has(figura.id)) {
          mensajes.push(
            `La figura ${figura.id} del piso ${numero} no tiene un espacio asociado y no es interactiva`,
          );
        }
      }
    }
    for (const id of mapaEspacios.keys()) {
      if (!enPlano.has(id)) mensajes.push(`El espacio ${id} no tiene figura en ningún plano`);
    }
    for (const mensaje of mensajes) {
      if (avisados.current.has(mensaje)) continue;
      avisados.current.add(mensaje);
      onAviso(mensaje);
    }
  }, [planos, mapaEspacios, onAviso]);

  const elegirPiso = (nuevo: number | 'todos') => {
    setPisoElegido(nuevo);
    onPisoCambiado?.(nuevo);
  };

  const alSeleccionar = (id: string | null) => {
    setSeleccionInterna(id);
    setConector(null);
    onSeleccionar?.(id);
  };

  if (!webgl) return <>{fallback}</>;

  return (
    <div
      // El lienzo se alcanza con Tab y se mueve con el teclado (ver `accionDeTecla`).
      tabIndex={0}
      role="group"
      aria-label="Maqueta 3D interactiva"
      aria-describedby={`${idAyuda}`}
      onKeyDown={alTeclear}
      className={`group relative h-full min-h-80 w-full focus:outline-none focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-saie-text ${className}`}
    >
      <p id={idAyuda} className="sr-only">
        Maqueta 3D interactiva. Con el foco aquí: flechas para girar e inclinar, Mayús y flechas
        para desplazar, más y menos para acercar o alejar, y cero para reiniciar la vista.
      </p>
      <p
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-3 z-10 m-0 hidden max-w-60 rounded-lg bg-saie-text px-3 py-2 text-xs text-white shadow-lg group-focus-visible:block"
      >
        Flechas: girar · Mayús + flechas: mover · + y −: zoom · 0: reiniciar
      </p>
      {cargando && (
        <p
          role="status"
          className="absolute inset-0 flex items-center justify-center text-saie-muted"
        >
          Cargando el mapa 3D…
        </p>
      )}

      {!cargando && estado.error && (
        <p
          role="alert"
          className="absolute inset-0 flex items-center justify-center text-saie-danger-strong"
        >
          {estado.error}
        </p>
      )}

      {!cargando && planos && pisosVisibles.length > 0 && (
        <>
          <LimiteError fallback={fallback}>
            <Canvas
              frameloop="demand"
              shadows="soft"
              dpr={[1, 2]}
              camera={{ fov: 45, near: 1, far: 5000 }}
              gl={{ antialias: true, powerPreference: 'high-performance' }}
              onPointerMissed={() => alSeleccionar(null)}
              aria-label="Maqueta 3D del mapa de ocupación"
              role="img"
            >
              <Escena
                planos={planos}
                pisos={pisosVisibles}
                activo={piso ?? 'todos'}
                espacios={mapaEspacios}
                resaltados={setResaltados}
                seleccionado={seleccionado}
                conector={conector}
                onSeleccionar={alSeleccionar}
                onConector={setConector}
                onHover={(id, x, y) => setApuntado(id ? { id, x, y } : null)}
                onPiso={elegirPiso}
                orden={orden}
              />
            </Canvas>
          </LimiteError>

          {pisos.length > 0 && (
            <div
              role="group"
              aria-label="Piso a mostrar"
              className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1 rounded-xl bg-white/90 p-1 shadow"
            >
              {pisos.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={piso === p}
                  onClick={() => elegirPiso(p)}
                  className={claseControl3D(piso === p)}
                >
                  Piso {p}
                </button>
              ))}
              {pisos.length > 1 && (
                <button
                  type="button"
                  aria-pressed={piso === 'todos'}
                  onClick={() => elegirPiso('todos')}
                  className={claseControl3D(piso === 'todos')}
                >
                  Edificio
                </button>
              )}
            </div>
          )}

          <div
            role="group"
            aria-label="Cámara"
            className="absolute bottom-3 right-3 flex flex-col gap-1 rounded-xl bg-white/90 p-1 shadow"
          >
            <button
              type="button"
              onClick={() => ordenar('reiniciar')}
              aria-label="Reiniciar vista"
              title="Reiniciar vista"
              className={claseIcono3D}
            >
              <svg {...ICONO_SVG}>
                <path d="M4 4v6h6M20 20v-6h-6M20 10a8 8 0 00-14-3M4 14a8 8 0 0014 3" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => ordenar('cenital')}
              aria-label="Vista desde arriba"
              title="Vista desde arriba"
              className={claseIcono3D}
            >
              <svg {...ICONO_SVG}>
                <path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14" />
              </svg>
            </button>
          </div>

          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-col items-start gap-2 pr-14">
            {seleccionado && mapaEspacios.get(seleccionado) && !conector && (
              <p
                role="status"
                className="pointer-events-auto m-0 max-w-xs rounded-xl bg-white/95 px-3 py-2 text-sm shadow"
              >
                <strong className="block text-saie-text">
                  {mapaEspacios.get(seleccionado)?.nombre ?? seleccionado}
                </strong>
                <span className="text-saie-muted">
                  {ESTADO_TEXTO[(mapaEspacios.get(seleccionado) as EspacioMapa).estado]} ·{' '}
                  {TIPO_TEXTO[(mapaEspacios.get(seleccionado) as EspacioMapa).tipo]}
                </span>
              </p>
            )}
            {conector && infoConector && (
              <section
                aria-label={`${infoConector.clase === 'ascensor' ? 'Ascensor' : 'Escalera'} ${conector}`}
                className="pointer-events-auto flex max-w-xs flex-col gap-2 rounded-xl bg-white/95 p-3 text-sm shadow"
              >
                <p className="m-0 font-medium text-saie-text">
                  {infoConector.clase === 'ascensor' ? 'Ascensor' : 'Escalera'} {conector}
                </p>
                {destinos.length === 0 ? (
                  <p className="m-0 text-saie-muted">
                    No conecta con otros pisos en los planos cargados.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {destinos.map((destino) => (
                      <button
                        key={destino}
                        type="button"
                        onClick={() => elegirPiso(destino)}
                        className={`${claseControl3D(true)} hover:bg-saie-primary-dark`}
                      >
                        {typeof piso !== 'number'
                          ? `Ir al piso ${destino}`
                          : destino > piso
                            ? `Subir al piso ${destino}`
                            : `Bajar al piso ${destino}`}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setConector(null)}
                  className="min-h-11 self-start px-2 text-saie-muted underline"
                >
                  Cerrar
                </button>
              </section>
            )}
          </div>

          {apuntado && apuntado.id !== seleccionado && mapaEspacios.get(apuntado.id) && (
            <div
              role="tooltip"
              // Dentro del lienzo: centrado sobre el cursor sin pasar de media tarjeta del borde.
              style={{
                left: `clamp(7.25rem, ${apuntado.x}px, calc(100% - 7.25rem))`,
                top: apuntado.y < 84 ? apuntado.y + 24 : apuntado.y - 12,
              }}
              className={`pointer-events-none absolute z-20 w-max max-w-56 -translate-x-1/2 rounded-lg bg-saie-text px-3 py-2 text-xs text-white shadow-lg ${
                apuntado.y < 84 ? '' : '-translate-y-full'
              }`}
            >
              <strong className="block text-sm">
                {mapaEspacios.get(apuntado.id)?.nombre ?? apuntado.id}
              </strong>
              {ESTADO_TEXTO[(mapaEspacios.get(apuntado.id) as EspacioMapa).estado]} ·{' '}
              {TIPO_TEXTO[(mapaEspacios.get(apuntado.id) as EspacioMapa).tipo]}
              {(mapaEspacios.get(apuntado.id) as EspacioMapa).aforo !== undefined &&
                ` · ${(mapaEspacios.get(apuntado.id) as EspacioMapa).aforo} personas`}
            </div>
          )}
        </>
      )}

      {!cargando && planos && pisos.length === 0 && (
        <p
          role="status"
          className="absolute inset-0 flex items-center justify-center text-saie-muted"
        >
          No hay planos para mostrar.
        </p>
      )}
    </div>
  );
}

import { Component, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { CLASES_CONEXION, CLASES_RESERVABLES, SEPARACION_PISOS } from './config';
import Escena from './Escena';
import { leerPlano } from './geometria';
import type { PlanoGeometria } from './geometria';
import type { Mapa3DProps } from './tipos';

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
  onAviso = (mensaje) => console.warn(`[Mapa3D] ${mensaje}`),
  fallback = null,
  className = '',
}: Mapa3DProps) {
  const webgl = useMemo(() => hayWebGL(), []);
  const { cargando, estado } = usePlanos(urls);
  const [pisoElegido, setPisoElegido] = useState<number | 'todos' | undefined>(pisoInicial);
  const [seleccionInterna, setSeleccionInterna] = useState<string | null>(null);
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
  const pisosVisibles = piso === 'todos' || piso === undefined ? pisos : [piso];

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

  const alSeleccionar = (id: string | null) => {
    setSeleccionInterna(id);
    setConector(null);
    onSeleccionar?.(id);
  };

  if (!webgl) return <>{fallback}</>;

  return (
    <div className={`relative h-full min-h-80 w-full ${className}`}>
      {cargando && (
        <p
          role="status"
          className="absolute inset-0 flex items-center justify-center text-slate-600"
        >
          Cargando el mapa 3D…
        </p>
      )}

      {!cargando && estado.error && (
        <p role="alert" className="absolute inset-0 flex items-center justify-center text-red-700">
          {estado.error}
        </p>
      )}

      {!cargando && planos && pisosVisibles.length > 0 && (
        <>
          <LimiteError fallback={fallback}>
            <Canvas
              frameloop="demand"
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
                separacionPisos={SEPARACION_PISOS}
                espacios={mapaEspacios}
                resaltados={setResaltados}
                seleccionado={seleccionado}
                conector={conector}
                onSeleccionar={alSeleccionar}
                onConector={setConector}
              />
            </Canvas>
          </LimiteError>

          {pisos.length > 0 && (
            <div
              role="group"
              aria-label="Piso a mostrar"
              className="absolute left-3 top-3 flex flex-wrap gap-1 rounded-lg bg-white/90 p-1 shadow"
            >
              {pisos.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={piso === p}
                  onClick={() => setPisoElegido(p)}
                  className={`rounded-md px-3 py-1 text-sm ${piso === p ? 'bg-indigo-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  Piso {p}
                </button>
              ))}
              {pisos.length > 1 && (
                <button
                  type="button"
                  aria-pressed={piso === 'todos'}
                  onClick={() => setPisoElegido('todos')}
                  className={`rounded-md px-3 py-1 text-sm ${piso === 'todos' ? 'bg-indigo-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                >
                  Edificio
                </button>
              )}
            </div>
          )}

          {conector && infoConector && (
            <section
              aria-label={`${infoConector.clase === 'ascensor' ? 'Ascensor' : 'Escalera'} ${conector}`}
              className="absolute bottom-3 left-3 flex max-w-xs flex-col gap-2 rounded-lg bg-white/95 p-3 text-sm shadow"
            >
              <p className="font-medium text-indigo-950">
                {infoConector.clase === 'ascensor' ? 'Ascensor' : 'Escalera'} {conector}
              </p>
              {destinos.length === 0 ? (
                <p className="text-slate-600">No conecta con otros pisos en los planos cargados.</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {destinos.map((destino) => (
                    <button
                      key={destino}
                      type="button"
                      onClick={() => setPisoElegido(destino)}
                      className="rounded-md bg-indigo-900 px-3 py-1 text-white hover:bg-indigo-800"
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
                className="self-start text-slate-600 underline"
              >
                Cerrar
              </button>
            </section>
          )}
        </>
      )}

      {!cargando && planos && pisos.length === 0 && (
        <p
          role="status"
          className="absolute inset-0 flex items-center justify-center text-slate-600"
        >
          No hay planos para mostrar.
        </p>
      )}
    </div>
  );
}

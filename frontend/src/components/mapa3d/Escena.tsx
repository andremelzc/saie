import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import {
  BoxGeometry,
  CanvasTexture,
  ExtrudeGeometry,
  Matrix4,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from 'three';
import type { BufferGeometry, Shape } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  CAMARA,
  CLASES_CONEXION,
  CLASES_RESERVABLES,
  CLASES_SIN_VOLUMEN,
  COLOR_ACENTO_LABORATORIO,
  COLOR_CONTORNO,
  COLOR_CONTEXTO,
  COLOR_ESTADO,
  COLOR_LOSA,
  COLOR_PATIO,
  COLOR_MURO_EXTERIOR,
  COLOR_MURO_INTERIOR,
  COLOR_RESALTE,
  COLOR_SIN_DATOS,
  COLOR_TECHO,
  COLOR_TERRENO,
  COLOR_VENTANA_CORTINA,
  COLOR_VENTANA_VIDRIO,
  EDIFICIO,
} from './config';
import type { FiguraPlano, PlanoGeometria, Punto } from './geometria';
import type { EspacioMapa } from './tipos';

/** El plano se dibuja en XZ (SVG x -> x, SVG y -> z) y se extruye hacia arriba (+Y). */
const ORIENTACION_PLANO = {
  rotation: [-Math.PI / 2, 0, 0] as [number, number, number],
  scale: [1, -1, 1] as [number, number, number],
};

/** Clases del plano que son la estructura del piso y no un espacio. */
const CLASES_ESTRUCTURA = new Set(['losa', 'techo']);

function useLiberar(recurso: { dispose: () => void } | null) {
  useEffect(() => () => recurso?.dispose(), [recurso]);
}

// ---------------------------------------------------------------------------
// Geometría
// ---------------------------------------------------------------------------

/** Contornos (exterior y huecos) de unas figuras, como listas de puntos del plano. */
function contornos(shapes: Shape[]): Punto[][] {
  const anillos: Punto[][] = [];
  for (const forma of shapes) {
    anillos.push(forma.getPoints().map((p) => ({ x: p.x, y: p.y })));
    for (const hueco of forma.holes)
      anillos.push(hueco.getPoints().map((p) => ({ x: p.x, y: p.y })));
  }
  return anillos;
}

/** Une en una sola geometría los muros que recorren cada contorno (cerrado o abierto). */
function construirParedes(
  anillos: Punto[][],
  altura: number,
  grosor: number,
  yBase: number,
  cerrados: boolean,
): BufferGeometry | null {
  const piezas: BufferGeometry[] = [];
  const arriba = new Vector3(0, 1, 0);

  for (const anillo of anillos) {
    const tramos = cerrados ? anillo.length : anillo.length - 1;
    for (let i = 0; i < tramos; i++) {
      const a = anillo[i];
      const b = anillo[(i + 1) % anillo.length];
      const largo = Math.hypot(b.x - a.x, b.y - a.y);
      if (largo < 0.01) continue;

      // El tramo se alarga el grosor para cubrir la esquina con el siguiente.
      const caja = new BoxGeometry(largo + grosor, altura, grosor);
      const angulo = Math.atan2(b.y - a.y, b.x - a.x);
      caja.applyMatrix4(
        new Matrix4().compose(
          new Vector3((a.x + b.x) / 2, yBase + altura / 2, (a.y + b.y) / 2),
          new Quaternion().setFromAxisAngle(arriba, -angulo),
          new Vector3(1, 1, 1),
        ),
      );
      piezas.push(caja);
    }
  }

  if (piezas.length === 0) return null;
  const unida = mergeGeometries(piezas);
  piezas.forEach((p) => p.dispose());
  return unida;
}

/** Ventanas repartidas a lo largo de la fachada: una cada cierto tramo de cada muro exterior. */
function construirVentanas(
  anillos: Punto[][],
  yBase: number,
): { cortinas: BufferGeometry | null; vidrio: BufferGeometry | null } {
  const cortinas: BufferGeometry[] = [];
  const vidrio: BufferGeometry[] = [];
  let n = 0;
  const arriba = new Vector3(0, 1, 0);
  const separacion = 10;

  for (const anillo of anillos) {
    for (let i = 0; i < anillo.length; i++) {
      const a = anillo[i];
      const b = anillo[(i + 1) % anillo.length];
      const largo = Math.hypot(b.x - a.x, b.y - a.y);
      const cuantas = Math.floor((largo - 4) / separacion);
      if (cuantas < 1) continue;
      const angulo = Math.atan2(b.y - a.y, b.x - a.x);
      const giro = new Quaternion().setFromAxisAngle(arriba, -angulo);
      for (let k = 0; k < cuantas; k++) {
        // Centradas en el tramo, a la misma distancia unas de otras.
        const t = (k + 1) / (cuantas + 1);
        const caja = new BoxGeometry(4.6, 5.8, EDIFICIO.grosorExterior + 0.4);
        caja.applyMatrix4(
          new Matrix4().compose(
            new Vector3(
              a.x + (b.x - a.x) * t,
              yBase + EDIFICIO.muroExterior * 0.58,
              a.y + (b.y - a.y) * t,
            ),
            giro,
            new Vector3(1, 1, 1),
          ),
        );
        // Dos de cada tres ventanas llevan cortina amarilla; el resto, vidrio oscuro.
        (n++ % 3 === 2 ? vidrio : cortinas).push(caja);
      }
    }
  }

  const unir = (piezas: BufferGeometry[]) => {
    if (piezas.length === 0) return null;
    const unida = mergeGeometries(piezas);
    piezas.forEach((p) => p.dispose());
    return unida;
  };
  return { cortinas: unir(cortinas), vidrio: unir(vidrio) };
}

interface Caja2D {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

function cajaDe(shapes: Shape[]): Caja2D {
  const puntos = shapes.flatMap((sh) => sh.getPoints());
  const xs = puntos.map((p) => p.x);
  const ys = puntos.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, ancho: Math.max(...xs) - x, alto: Math.max(...ys) - y };
}

// ---------------------------------------------------------------------------
// Rótulos sobre el suelo de cada espacio
// ---------------------------------------------------------------------------

function textoDeEtiqueta(figura: FiguraPlano): string[] {
  if (CLASES_RESERVABLES.has(figura.clase)) {
    const codigo = figura.id.split('-').slice(1).join('-');
    return figura.clase === 'laboratorio' ? [codigo, 'LAB'] : [codigo];
  }
  if (figura.clase === 'escalera' || figura.clase === 'ascensor' || figura.clase === 'patio') {
    return [];
  }
  if (!figura.nombre) return [];
  return [figura.nombre === 'Administrativo' ? 'Adm.' : figura.nombre];
}

const texturas = new Map<string, CanvasTexture>();

/** Textura con el texto centrado; se reutiliza entre figuras con el mismo rótulo. */
function texturaDeTexto(lineas: string[]): CanvasTexture | null {
  const clave = lineas.join('\n');
  const guardada = texturas.get(clave);
  if (guardada) return guardada;
  const lienzo = document.createElement('canvas');
  lienzo.width = 256;
  lienzo.height = 128;
  const ctx = lienzo.getContext('2d');
  if (!ctx) return null;
  const tam = lineas.length > 1 ? 52 : 70;
  ctx.font = `700 ${tam}px sans-serif`;
  const ancho = Math.max(...lineas.map((l) => ctx.measureText(l).width));
  const escala = Math.min(1, 236 / ancho);
  ctx.font = `700 ${Math.round(tam * escala)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 9;
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.fillStyle = '#0f172a';
  lineas.forEach((linea, i) => {
    const y = 64 + (i - (lineas.length - 1) / 2) * tam * escala * 1.05;
    ctx.strokeText(linea, 128, y);
    ctx.fillText(linea, 128, y);
  });
  const textura = new CanvasTexture(lienzo);
  textura.colorSpace = SRGBColorSpace;
  textura.anisotropy = 4;
  texturas.set(clave, textura);
  return textura;
}

function Etiqueta({ figura, z }: { figura: FiguraPlano; z: number }) {
  const lineas = textoDeEtiqueta(figura);
  const caja = useMemo(() => cajaDe(figura.shapes), [figura.shapes]);
  const textura = useMemo(() => (lineas.length ? texturaDeTexto(lineas) : null), [lineas]);
  if (!textura) return null;

  // El rótulo cabe en el suelo del espacio, con la proporción 2:1 de la textura.
  const ancho = Math.min(caja.ancho * 0.95, caja.alto * 2 * 0.95);
  if (ancho < 8) return null;
  return (
    <mesh
      position={[caja.x + caja.ancho / 2, caja.y + caja.alto / 2, z]}
      // El grupo del plano invierte el eje Y: el rótulo se invierte de nuevo para leerse bien.
      scale={[1, -1, 1]}
      raycast={() => null}
    >
      <planeGeometry args={[ancho, ancho / 2]} />
      <meshBasicMaterial map={textura} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

// ---------------------------------------------------------------------------
// Figuras de un piso
// ---------------------------------------------------------------------------

interface FiguraProps {
  figura: FiguraPlano;
  datos: EspacioMapa | undefined;
  /** Altura (unidades) del suelo sobre el que se apoya. */
  zSuelo: number;
  resaltada: boolean;
  seleccionada: boolean;
  conRotulo: boolean;
  onSeleccionar: (id: string) => void;
  onConector: (id: string) => void;
}

/** Hace que el cursor sea una mano sobre lo que se puede pulsar. */
function cursorSobre(e: ThreeEvent<PointerEvent>, dentro: boolean) {
  e.stopPropagation();
  const destino = e.nativeEvent.target;
  if (destino instanceof HTMLElement) destino.style.cursor = dentro ? 'pointer' : '';
}

/** Escalera: peldaños que suben a lo largo del lado más largo de la figura. */
function Escalera({
  figura,
  zSuelo,
  destacada,
  onPulsar,
}: {
  figura: FiguraPlano;
  zSuelo: number;
  destacada: boolean;
  onPulsar: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const caja = useMemo(() => cajaDe(figura.shapes), [figura.shapes]);
  const pasos = 7;
  const alLargo = caja.ancho >= caja.alto;
  const color = destacada ? COLOR_RESALTE : COLOR_CONTEXTO.escalera;
  return (
    <group
      onClick={onPulsar}
      onPointerOver={(e) => cursorSobre(e, true)}
      onPointerOut={(e) => cursorSobre(e, false)}
    >
      {Array.from({ length: pasos }, (_, i) => {
        const alto = (EDIFICIO.escalera * (i + 1)) / pasos;
        const largo = (alLargo ? caja.ancho : caja.alto) / pasos;
        const cx = alLargo ? caja.x + largo * (i + 0.5) : caja.x + caja.ancho / 2;
        const cy = alLargo ? caja.y + caja.alto / 2 : caja.y + largo * (i + 0.5);
        return (
          <mesh key={i} position={[cx, cy, zSuelo + alto / 2]} castShadow receiveShadow>
            <boxGeometry
              args={[alLargo ? largo : caja.ancho * 0.92, alLargo ? caja.alto * 0.92 : largo, alto]}
            />
            <meshStandardMaterial
              color={color}
              emissive={destacada ? COLOR_RESALTE : '#000000'}
              emissiveIntensity={destacada ? 0.6 : 0}
              roughness={0.9}
            />
          </mesh>
        );
      })}
    </group>
  );
}

/** Ascensor: una cabina de vidrio sobre el suelo del piso. */
function Ascensor({
  figura,
  zSuelo,
  destacada,
  onPulsar,
}: {
  figura: FiguraPlano;
  zSuelo: number;
  destacada: boolean;
  onPulsar: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const caja = useMemo(() => cajaDe(figura.shapes), [figura.shapes]);
  return (
    <mesh
      position={[caja.x + caja.ancho / 2, caja.y + caja.alto / 2, zSuelo + EDIFICIO.ascensor / 2]}
      onClick={onPulsar}
      onPointerOver={(e) => cursorSobre(e, true)}
      onPointerOut={(e) => cursorSobre(e, false)}
      castShadow
    >
      <boxGeometry args={[caja.ancho * 0.85, caja.alto * 0.85, EDIFICIO.ascensor]} />
      <meshStandardMaterial
        color={destacada ? COLOR_RESALTE : '#a99ad6'}
        emissive={destacada ? COLOR_RESALTE : '#000000'}
        emissiveIntensity={destacada ? 0.6 : 0}
        transparent
        opacity={0.78}
        roughness={0.3}
      />
    </mesh>
  );
}

/**
 * Contorno y haz translúcido del espacio elegido: se dibujan sin comprobar la profundidad, así que
 * se ven por delante de los muros y de lo demás, también desde ángulos en que algo lo tapa.
 */
function ResalteSuperpuesto({
  figura,
  z,
  geometria,
}: {
  figura: FiguraPlano;
  z: number;
  geometria: BufferGeometry;
}) {
  const haz = useMemo(
    () =>
      new ExtrudeGeometry(figura.shapes, {
        depth: EDIFICIO.muroInterior + 2,
        bevelEnabled: false,
      }),
    [figura.shapes],
  );
  useLiberar(haz);
  return (
    <group position={[0, 0, z]} raycast={() => null}>
      <mesh geometry={haz} renderOrder={9} raycast={() => null}>
        <meshBasicMaterial
          color={COLOR_CONTORNO}
          transparent
          opacity={0.22}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>
      <lineSegments renderOrder={10} raycast={() => null}>
        <edgesGeometry args={[geometria]} />
        <lineBasicMaterial color={COLOR_CONTORNO} depthTest={false} transparent />
      </lineSegments>
      <lineSegments
        renderOrder={10}
        position={[0, 0, EDIFICIO.muroInterior + 2]}
        raycast={() => null}
      >
        <edgesGeometry args={[geometria]} />
        <lineBasicMaterial color={COLOR_CONTORNO} depthTest={false} transparent />
      </lineSegments>
    </group>
  );
}

function Figura({
  figura,
  datos,
  zSuelo,
  resaltada,
  seleccionada,
  conRotulo,
  onSeleccionar,
  onConector,
}: FiguraProps) {
  const reservable = CLASES_RESERVABLES.has(figura.clase);
  const esConexion = CLASES_CONEXION.has(figura.clase);
  const esLaboratorio = datos ? datos.tipo === 'LABORATORIO' : figura.clase === 'laboratorio';
  const interactiva = esConexion || (reservable && datos !== undefined);
  const destacada = resaltada || seleccionada;
  // Lo seleccionado o resaltado se eleva un poco para distinguirse del resto.
  const z = zSuelo + (destacada ? EDIFICIO.resalte : 0);

  const geometria = useMemo(
    () => new ExtrudeGeometry(figura.shapes, { depth: EDIFICIO.baldosa, bevelEnabled: false }),
    [figura.shapes],
  );
  useLiberar(geometria);

  const alHacerClic = (e: ThreeEvent<MouseEvent>) => {
    // Un arrastre de la cámara no cuenta como clic.
    if (!interactiva || e.delta > 4) return;
    e.stopPropagation();
    if (esConexion) onConector(figura.id);
    else onSeleccionar(figura.id);
  };

  if (figura.clase === 'escalera') {
    return (
      <Escalera figura={figura} zSuelo={zSuelo} destacada={destacada} onPulsar={alHacerClic} />
    );
  }
  if (figura.clase === 'ascensor') {
    return (
      <Ascensor figura={figura} zSuelo={zSuelo} destacada={destacada} onPulsar={alHacerClic} />
    );
  }

  const color = datos
    ? COLOR_ESTADO[datos.estado]
    : reservable
      ? COLOR_SIN_DATOS
      : figura.clase === 'patio'
        ? COLOR_PATIO
        : (COLOR_CONTEXTO[figura.clase] ?? COLOR_SIN_DATOS);

  return (
    <group>
      <mesh
        geometry={geometria}
        userData={{ id: figura.id }}
        position={[0, 0, z]}
        onClick={alHacerClic}
        onPointerOver={(e) => interactiva && cursorSobre(e, true)}
        onPointerOut={(e) => interactiva && cursorSobre(e, false)}
        receiveShadow
      >
        <meshStandardMaterial
          color={color}
          emissive={destacada ? COLOR_RESALTE : '#000000'}
          emissiveIntensity={destacada ? 0.7 : 0}
          roughness={0.85}
        />
        {esLaboratorio && (
          <lineSegments>
            <edgesGeometry args={[geometria]} />
            <lineBasicMaterial color={COLOR_ACENTO_LABORATORIO} />
          </lineSegments>
        )}
      </mesh>
      {destacada && <ResalteSuperpuesto figura={figura} z={z} geometria={geometria} />}
      {conRotulo && <Etiqueta figura={figura} z={z + EDIFICIO.baldosa + 0.06} />}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Un piso del edificio
// ---------------------------------------------------------------------------

interface PisoProps {
  plano: PlanoGeometria;
  /** Posición del piso en la pila: 0 es la planta baja. */
  nivel: number;
  /** Número de piso, para avisar cuál se pulsó en la vista de edificio. */
  numero: number;
  /** Se dibuja el interior (espacios, muros bajos y rótulos). */
  conInterior: boolean;
  conRotulos: boolean;
  /** Se cierra con el techo (los pisos de abajo y todo el edificio cerrado). */
  conTecho: boolean;
  espacios: Map<string, EspacioMapa>;
  resaltados: ReadonlySet<string>;
  seleccionado: string | null;
  onSeleccionar: (id: string) => void;
  onConector: (id: string) => void;
  onPiso: (numero: number) => void;
}

function Piso({
  plano,
  nivel,
  numero,
  conInterior,
  conRotulos,
  conTecho,
  espacios,
  resaltados,
  seleccionado,
  onSeleccionar,
  onConector,
  onPiso,
}: PisoProps) {
  const yBase = nivel * EDIFICIO.alturaPiso;
  const ySuelo = yBase + EDIFICIO.losa;

  const losa = plano.figuras.find((f) => f.clase === 'losa');
  const techo = plano.figuras.find((f) => f.clase === 'techo');
  const espaciosDelPiso = useMemo(
    () =>
      plano.figuras.filter(
        (f) => !CLASES_ESTRUCTURA.has(f.clase) && !CLASES_SIN_VOLUMEN.has(f.clase),
      ),
    [plano.figuras],
  );

  const geometriaLosa = useMemo(
    () =>
      losa ? new ExtrudeGeometry(losa.shapes, { depth: EDIFICIO.losa, bevelEnabled: false }) : null,
    [losa],
  );
  const geometriaTecho = useMemo(
    () =>
      techo
        ? new ExtrudeGeometry(techo.shapes, { depth: EDIFICIO.losa, bevelEnabled: false })
        : null,
    [techo],
  );
  // Fachada: sigue el contorno del techo; sin él, los muros dibujados en el plano.
  const fachada = useMemo(
    () =>
      techo
        ? construirParedes(
            contornos(techo.shapes),
            EDIFICIO.muroExterior,
            EDIFICIO.grosorExterior,
            ySuelo,
            true,
          )
        : construirParedes(
            plano.muros,
            EDIFICIO.muroExterior,
            EDIFICIO.grosorExterior,
            ySuelo,
            false,
          ),
    [techo, plano.muros, ySuelo],
  );
  const ventanas = useMemo(
    () =>
      techo ? construirVentanas(contornos(techo.shapes), ySuelo) : { cortinas: null, vidrio: null },
    [techo, ySuelo],
  );
  const tabiques = useMemo(
    () =>
      conInterior
        ? construirParedes(
            espaciosDelPiso
              .filter((f) => f.clase !== 'patio' && !CLASES_CONEXION.has(f.clase))
              .flatMap((f) => contornos(f.shapes.slice(0, 1))),
            EDIFICIO.muroInterior,
            EDIFICIO.grosorInterior,
            ySuelo,
            true,
          )
        : null,
    [conInterior, espaciosDelPiso, ySuelo],
  );
  useLiberar(geometriaLosa);
  useLiberar(geometriaTecho);
  useLiberar(fachada);
  useLiberar(tabiques);
  useLiberar(ventanas.cortinas);
  useLiberar(ventanas.vidrio);

  const alPulsarEdificio = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 4) return;
    e.stopPropagation();
    onPiso(numero);
  };
  // Sin interior (edificio cerrado), pulsar un piso lo abre.
  const pulsable = !conInterior;

  return (
    <group>
      {geometriaLosa && (
        <group {...ORIENTACION_PLANO}>
          <mesh
            geometry={geometriaLosa}
            position={[0, 0, yBase]}
            castShadow
            receiveShadow
            onClick={pulsable ? alPulsarEdificio : undefined}
            onPointerOver={pulsable ? (e) => cursorSobre(e, true) : undefined}
            onPointerOut={pulsable ? (e) => cursorSobre(e, false) : undefined}
          >
            <meshStandardMaterial color={COLOR_LOSA} roughness={1} />
          </mesh>
        </group>
      )}

      {fachada && (
        <mesh
          geometry={fachada}
          castShadow
          receiveShadow
          onClick={pulsable ? alPulsarEdificio : undefined}
          onPointerOver={pulsable ? (e) => cursorSobre(e, true) : undefined}
          onPointerOut={pulsable ? (e) => cursorSobre(e, false) : undefined}
        >
          <meshStandardMaterial color={COLOR_MURO_EXTERIOR} roughness={0.95} />
        </mesh>
      )}

      {ventanas.cortinas && (
        <mesh geometry={ventanas.cortinas} raycast={() => null}>
          <meshStandardMaterial color={COLOR_VENTANA_CORTINA} roughness={0.8} />
        </mesh>
      )}
      {ventanas.vidrio && (
        <mesh geometry={ventanas.vidrio} raycast={() => null}>
          <meshStandardMaterial color={COLOR_VENTANA_VIDRIO} roughness={0.25} metalness={0.2} />
        </mesh>
      )}

      {/* Con el edificio cerrado se sigue viendo el patio: es el suelo de la planta baja. */}
      {!conInterior && (
        <group {...ORIENTACION_PLANO}>
          {espaciosDelPiso
            .filter((f) => f.clase === 'patio')
            .map((figura) => (
              <Figura
                key={figura.id}
                figura={figura}
                datos={undefined}
                zSuelo={ySuelo}
                resaltada={false}
                seleccionada={false}
                conRotulo={false}
                onSeleccionar={onSeleccionar}
                onConector={onConector}
              />
            ))}
        </group>
      )}

      {conInterior && (
        <>
          <group {...ORIENTACION_PLANO}>
            {espaciosDelPiso.map((figura) => (
              <Figura
                key={figura.id}
                figura={figura}
                datos={espacios.get(figura.id)}
                zSuelo={ySuelo}
                resaltada={resaltados.has(figura.id)}
                seleccionada={seleccionado === figura.id}
                conRotulo={conRotulos}
                onSeleccionar={onSeleccionar}
                onConector={onConector}
              />
            ))}
          </group>
          {tabiques && (
            <mesh geometry={tabiques} castShadow receiveShadow>
              <meshStandardMaterial color={COLOR_MURO_INTERIOR} roughness={0.95} />
            </mesh>
          )}
        </>
      )}

      {conTecho && geometriaTecho && (
        <group {...ORIENTACION_PLANO}>
          <mesh
            geometry={geometriaTecho}
            position={[0, 0, ySuelo + EDIFICIO.muroExterior]}
            castShadow
            receiveShadow
            onClick={pulsable ? alPulsarEdificio : undefined}
            onPointerOver={pulsable ? (e) => cursorSobre(e, true) : undefined}
            onPointerOut={pulsable ? (e) => cursorSobre(e, false) : undefined}
          >
            <meshStandardMaterial color={COLOR_TECHO} roughness={1} />
          </mesh>
        </group>
      )}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Cámara, luces y composición
// ---------------------------------------------------------------------------

/** Orden a la cámara: volver al encuadre inicial, mirar desde arriba o volar hasta un espacio. */
export interface OrdenCamara {
  tipo: 'reiniciar' | 'cenital' | 'enfocar';
  /** Id del espacio, para `enfocar`. */
  id?: string;
  /** Distingue una orden de la anterior igual. */
  n: number;
}

interface ControlesProps {
  centro: [number, number, number];
  tamano: number;
  /** Cambia cuando hay que volver a encuadrar (otro piso o planos nuevos). */
  encuadre: string;
  orden?: OrdenCamara | null;
  /** Punto al que mirar para un espacio, o `null` si no está en los pisos visibles. */
  puntoDe: (id: string) => [number, number, number] | null;
}

const DURACION_VUELO_MS = 650;

/** Cámara orbital con límites, apta para `frameloop="demand"` (sin amortiguación). */
function Controles({ centro, tamano, encuadre, orden, puntoDe }: ControlesProps) {
  const camara = useThree((s) => s.camera);
  const dom = useThree((s) => s.gl.domElement);
  const invalidar = useThree((s) => s.invalidate);
  const controlesRef = useRef<OrbitControls | null>(null);
  const centroPrevio = useRef(centro);

  useEffect(() => {
    const controles = new OrbitControls(camara, dom);
    controlesRef.current = controles;
    controles.minPolarAngle = CAMARA.anguloMinimo;
    controles.maxPolarAngle = CAMARA.anguloMaximo;
    controles.minDistance = tamano * CAMARA.distanciaMinima;
    controles.maxDistance = tamano * CAMARA.distanciaMaxima;
    controles.target.set(...centro);
    // Encuadre inicial: desde el sur, elevado y algo hacia un lado, con margen para ver todo.
    camara.position.set(
      centro[0] + tamano * 0.45,
      centro[1] + tamano * 0.85,
      centro[2] + tamano * 0.95,
    );
    camara.lookAt(...centro);
    controles.update();
    centroPrevio.current = centro;
    const alCambiar = () => invalidar();
    controles.addEventListener('change', alCambiar);
    invalidar();
    return () => {
      controles.removeEventListener('change', alCambiar);
      controles.dispose();
      controlesRef.current = null;
    };
    // `encuadre` fuerza un nuevo encuadre; `centro` y `tamano` van en él.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camara, dom, invalidar, encuadre]);

  // Vuelo suave de la cámara (sin amortiguación: cada fotograma se pide a mano).
  const vuelo = useRef<number | null>(null);
  const ultimaOrden = useRef<number | undefined>(orden?.n);
  useEffect(() => {
    if (!orden || orden.n === ultimaOrden.current) return;
    ultimaOrden.current = orden.n;
    const controles = controlesRef.current;
    if (!controles) return;

    const objetivo = new Vector3(...centro);
    const posicion = new Vector3();
    if (orden.tipo === 'reiniciar') {
      posicion.set(
        centro[0] + tamano * 0.45,
        centro[1] + tamano * 0.85,
        centro[2] + tamano * 0.95,
      );
    } else if (orden.tipo === 'cenital') {
      const polar = CAMARA.anguloMinimo + 0.01;
      posicion.set(
        centro[0],
        centro[1] + tamano * 1.25 * Math.cos(polar),
        centro[2] + tamano * 1.25 * Math.sin(polar),
      );
    } else {
      const punto = orden.id ? puntoDe(orden.id) : null;
      if (!punto) return;
      objetivo.set(...punto);
      // Se conserva la dirección desde la que se mira; solo cambia la distancia.
      const direccion = camara.position.clone().sub(controles.target).normalize();
      posicion.copy(objetivo).addScaledVector(direccion, Math.max(tamano * 0.5, controles.minDistance));
    }

    const desdePosicion = camara.position.clone();
    const desdeObjetivo = controles.target.clone();
    const inicio = performance.now();
    if (vuelo.current !== null) cancelAnimationFrame(vuelo.current);
    const paso = (ahora: number) => {
      const t = Math.min(1, (ahora - inicio) / DURACION_VUELO_MS);
      const suave = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      camara.position.lerpVectors(desdePosicion, posicion, suave);
      controles.target.lerpVectors(desdeObjetivo, objetivo, suave);
      controles.update();
      invalidar();
      vuelo.current = t < 1 ? requestAnimationFrame(paso) : null;
    };
    vuelo.current = requestAnimationFrame(paso);
  }, [orden, camara, centro, tamano, invalidar, puntoDe]);

  useEffect(
    () => () => {
      if (vuelo.current !== null) cancelAnimationFrame(vuelo.current);
    },
    [],
  );

  // Al cambiar de piso la vista sube o baja con él, sin perder el ángulo que ya se eligió.
  useEffect(() => {
    const controles = controlesRef.current;
    const previo = centroPrevio.current;
    if (!controles || previo.every((v, i) => v === centro[i])) return;
    const delta = new Vector3(centro[0] - previo[0], centro[1] - previo[1], centro[2] - previo[2]);
    camara.position.add(delta);
    controles.target.add(delta);
    controles.update();
    centroPrevio.current = centro;
    invalidar();
  }, [centro, camara, invalidar]);

  return null;
}

export interface EscenaProps {
  planos: Record<number, PlanoGeometria>;
  /** Pisos a dibujar, de abajo arriba. */
  pisos: number[];
  /** Piso que se muestra abierto (corte) o `todos` para el edificio cerrado. */
  activo: number | 'todos';
  espacios: Map<string, EspacioMapa>;
  resaltados: ReadonlySet<string>;
  seleccionado: string | null;
  /** Escalera o ascensor activo: si hay varios pisos visibles, se dibuja la columna que los une. */
  conector: string | null;
  onSeleccionar: (id: string) => void;
  onConector: (id: string) => void;
  /** Se pulsa un piso del edificio cerrado: se abre ese piso. */
  onPiso: (numero: number) => void;
  /** Orden para la cámara (botones «Reiniciar vista» y «Vista desde arriba», o el buscador). */
  orden?: OrdenCamara | null;
}

/** Columna translúcida que atraviesa los pisos visibles por donde pasa una escalera o ascensor. */
function ColumnaConexion({
  planos,
  pisos,
  id,
}: {
  planos: Record<number, PlanoGeometria>;
  pisos: number[];
  id: string;
}) {
  const enPisos = pisos.filter((p) => planos[p].figuras.some((f) => f.id === id));
  const figura = planos[enPisos[0]]?.figuras.find((f) => f.id === id);
  if (enPisos.length < 2 || !figura) return null;

  const caja = cajaDe(figura.shapes);
  const desde = pisos.indexOf(enPisos[0]) * EDIFICIO.alturaPiso + EDIFICIO.losa;
  const hasta =
    pisos.indexOf(enPisos[enPisos.length - 1]) * EDIFICIO.alturaPiso +
    EDIFICIO.losa +
    EDIFICIO.muroExterior;

  return (
    <mesh position={[caja.x + caja.ancho / 2, (desde + hasta) / 2, caja.y + caja.alto / 2]}>
      <boxGeometry args={[caja.ancho, hasta - desde, caja.alto]} />
      <meshStandardMaterial color={COLOR_RESALTE} transparent opacity={0.35} depthWrite={false} />
    </mesh>
  );
}

export default function Escena({
  planos,
  pisos,
  activo,
  espacios,
  resaltados,
  seleccionado,
  conector,
  onSeleccionar,
  onConector,
  onPiso,
  orden,
}: EscenaProps) {
  const base = planos[pisos[0]];
  const { x, y: z, ancho, alto } = base.caja;
  const cerrado = activo === 'todos';
  const nivelActivo = cerrado ? pisos.length - 1 : pisos.indexOf(activo);
  const altoTotal = pisos.length * EDIFICIO.alturaPiso + EDIFICIO.losa;
  // El encuadre crece con la altura del edificio para que quepa entero.
  const tamano = Math.max(ancho, alto) * 0.95 + altoTotal;
  // En el edificio cerrado se mira al conjunto; en un piso, a la altura de ese piso.
  const yCentro = cerrado
    ? altoTotal / 2
    : nivelActivo * EDIFICIO.alturaPiso + EDIFICIO.losa + EDIFICIO.muroInterior;
  const centro = useMemo<[number, number, number]>(
    () => [x + ancho / 2, yCentro, z + alto / 2],
    [x, ancho, yCentro, z, alto],
  );
  const mitad = Math.max(ancho, alto) * 0.75 + altoTotal;
  // Punto (centro del suelo) de un espacio, para que la cámara vuele hasta él.
  const puntoDe = useMemo(
    () =>
      (id: string): [number, number, number] | null => {
        for (let i = 0; i < pisos.length; i++) {
          const figura = planos[pisos[i]].figuras.find((f) => f.id === id);
          if (!figura) continue;
          const c = cajaDe(figura.shapes);
          return [
            c.x + c.ancho / 2,
            i * EDIFICIO.alturaPiso + EDIFICIO.losa + EDIFICIO.muroInterior / 2,
            c.y + c.alto / 2,
          ];
        }
        return null;
      },
    [planos, pisos],
  );

  return (
    <>
      <ambientLight intensity={0.85} />
      <hemisphereLight args={['#ffffff', '#c9c2b0', 0.55]} />
      <directionalLight
        position={[centro[0] + tamano * 0.9, tamano * 1.6, centro[2] + tamano * 0.7]}
        intensity={1.9}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.4}
        shadow-camera-left={-mitad}
        shadow-camera-right={mitad}
        shadow-camera-top={mitad}
        shadow-camera-bottom={-mitad}
        shadow-camera-near={1}
        shadow-camera-far={tamano * 5}
      />
      <directionalLight
        position={[centro[0] - tamano, tamano, centro[2] - tamano * 0.6]}
        intensity={0.45}
      />

      {/* Terreno sobre el que se apoya el edificio. */}
      <mesh
        position={[centro[0], -0.06, centro[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        raycast={() => null}
      >
        <planeGeometry args={[ancho * 1.35, alto * 1.35]} />
        <meshStandardMaterial color={COLOR_TERRENO} roughness={1} />
      </mesh>

      {pisos.map((piso, i) => (
        <Piso
          key={piso}
          plano={planos[piso]}
          nivel={i}
          numero={piso}
          // En el corte se dibujan todos los pisos de abajo hacia el activo; solo el activo lleva
          // rótulos y sin techo. Los de abajo se ven por los vacíos (patio, escotes).
          conInterior={!cerrado}
          conRotulos={!cerrado && i === nivelActivo}
          conTecho={cerrado || i < nivelActivo}
          espacios={espacios}
          resaltados={resaltados}
          seleccionado={seleccionado}
          onSeleccionar={onSeleccionar}
          onConector={onConector}
          onPiso={onPiso}
        />
      ))}

      {conector && <ColumnaConexion planos={planos} pisos={pisos} id={conector} />}

      {/* Cambiar de piso con una escalera conserva el ángulo de cámara: solo se reencuadra al
          pasar entre un piso y el edificio cerrado. */}
      <Controles
        centro={centro}
        tamano={tamano}
        encuadre={cerrado ? 'edificio' : 'piso'}
        orden={orden}
        puntoDe={puntoDe}
      />
    </>
  );
}

import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { BoxGeometry, ExtrudeGeometry, Matrix4, Quaternion, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  ALTURA,
  CAMARA,
  CLASES_RESERVABLES,
  COLOR_ACENTO_LABORATORIO,
  COLOR_BORDE,
  COLOR_CONTEXTO,
  COLOR_ESTADO,
  COLOR_LOSA,
  COLOR_MURO,
  COLOR_RESALTE,
  COLOR_SIN_DATOS,
  GROSOR_MURO,
} from './config';
import type { FiguraPlano, PlanoGeometria, Punto } from './geometria';
import type { EspacioMapa } from './tipos';

/** El plano se dibuja en XZ (SVG x -> x, SVG y -> z) y se extruye hacia arriba (+Y). */
const ORIENTACION_PLANO = {
  rotation: [-Math.PI / 2, 0, 0] as [number, number, number],
  scale: [1, -1, 1] as [number, number, number],
};

function useLiberar(geometria: BufferGeometry | null) {
  useEffect(() => () => geometria?.dispose(), [geometria]);
}

interface FiguraProps {
  figura: FiguraPlano;
  datos: EspacioMapa | undefined;
  resaltada: boolean;
  seleccionada: boolean;
  onSeleccionar: (id: string) => void;
}

function Figura({ figura, datos, resaltada, seleccionada, onSeleccionar }: FiguraProps) {
  const reservable = CLASES_RESERVABLES.has(figura.clase);
  const esLaboratorio = datos ? datos.tipo === 'LABORATORIO' : figura.clase === 'laboratorio';
  const altura = reservable ? (esLaboratorio ? ALTURA.laboratorio : ALTURA.aula) : ALTURA.contexto;
  const interactiva = reservable && datos !== undefined;

  const geometria = useMemo(
    () => new ExtrudeGeometry(figura.shapes, { depth: altura, bevelEnabled: false }),
    [figura.shapes, altura],
  );
  useLiberar(geometria);

  const color = datos
    ? COLOR_ESTADO[datos.estado]
    : reservable
      ? COLOR_SIN_DATOS
      : (COLOR_CONTEXTO[figura.clase] ?? COLOR_SIN_DATOS);
  const destacada = resaltada || seleccionada;

  const alHacerClic = (e: ThreeEvent<MouseEvent>) => {
    // Un arrastre de la cámara no cuenta como clic.
    if (!interactiva || e.delta > 4) return;
    e.stopPropagation();
    onSeleccionar(figura.id);
  };

  const sobreFigura = (e: ThreeEvent<PointerEvent>, dentro: boolean) => {
    if (!interactiva) return;
    e.stopPropagation();
    const destino = e.nativeEvent.target;
    if (destino instanceof HTMLElement) destino.style.cursor = dentro ? 'pointer' : '';
  };

  return (
    <mesh
      geometry={geometria}
      userData={{ id: figura.id }}
      // Lo seleccionado o resaltado se eleva un poco para distinguirse del resto.
      position={[0, 0, destacada ? ALTURA.resalte : 0]}
      onClick={alHacerClic}
      onPointerOver={(e) => sobreFigura(e, true)}
      onPointerOut={(e) => sobreFigura(e, false)}
    >
      <meshStandardMaterial
        color={color}
        emissive={destacada ? COLOR_RESALTE : '#000000'}
        emissiveIntensity={destacada ? 0.9 : 0}
        roughness={0.85}
      />
      {reservable && (
        <lineSegments>
          <edgesGeometry args={[geometria]} />
          <lineBasicMaterial
            color={esLaboratorio ? COLOR_ACENTO_LABORATORIO : COLOR_BORDE}
            linewidth={1}
          />
        </lineSegments>
      )}
    </mesh>
  );
}

/** Une todos los segmentos de muro del piso en una sola geometría. */
function construirMuros(muros: Punto[][]): BufferGeometry | null {
  const piezas: BufferGeometry[] = [];
  const arriba = new Vector3(0, 1, 0);

  for (const muro of muros) {
    for (let i = 0; i < muro.length - 1; i++) {
      const a = muro[i];
      const b = muro[i + 1];
      const largo = Math.hypot(b.x - a.x, b.y - a.y);
      if (largo < 0.01) continue;

      // El segmento se alarga para cubrir la esquina con el siguiente.
      const caja = new BoxGeometry(largo + GROSOR_MURO, ALTURA.muro, GROSOR_MURO);
      const angulo = Math.atan2(b.y - a.y, b.x - a.x);
      caja.applyMatrix4(
        new Matrix4().compose(
          new Vector3((a.x + b.x) / 2, ALTURA.muro / 2, (a.y + b.y) / 2),
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

interface PisoProps {
  plano: PlanoGeometria;
  y: number;
  espacios: Map<string, EspacioMapa>;
  resaltados: ReadonlySet<string>;
  seleccionado: string | null;
  onSeleccionar: (id: string) => void;
}

function Piso({ plano, y, espacios, resaltados, seleccionado, onSeleccionar }: PisoProps) {
  const muros = useMemo(() => construirMuros(plano.muros), [plano.muros]);
  useLiberar(muros);
  const { x, y: z, ancho, alto } = plano.caja;

  return (
    <group position={[0, y, 0]}>
      {/* Losa del piso */}
      <mesh position={[x + ancho / 2, -ALTURA.losa / 2, z + alto / 2]}>
        <boxGeometry args={[ancho, ALTURA.losa, alto]} />
        <meshStandardMaterial color={COLOR_LOSA} roughness={1} />
      </mesh>

      <group {...ORIENTACION_PLANO}>
        {plano.figuras.map((figura) => (
          <Figura
            key={figura.id}
            figura={figura}
            datos={espacios.get(figura.id)}
            resaltada={resaltados.has(figura.id)}
            seleccionada={seleccionado === figura.id}
            onSeleccionar={onSeleccionar}
          />
        ))}
      </group>

      {muros && (
        <mesh geometry={muros}>
          <meshStandardMaterial color={COLOR_MURO} roughness={0.9} />
        </mesh>
      )}
    </group>
  );
}

interface ControlesProps {
  centro: [number, number, number];
  tamano: number;
  /** Cambia cuando hay que volver a encuadrar (otro piso o planos nuevos). */
  encuadre: string;
}

/** Cámara orbital con límites, apta para `frameloop="demand"` (sin amortiguación). */
function Controles({ centro, tamano, encuadre }: ControlesProps) {
  const camara = useThree((s) => s.camera);
  const dom = useThree((s) => s.gl.domElement);
  const invalidar = useThree((s) => s.invalidate);

  useEffect(() => {
    const controles = new OrbitControls(camara, dom);
    controles.minPolarAngle = CAMARA.anguloMinimo;
    controles.maxPolarAngle = CAMARA.anguloMaximo;
    controles.minDistance = tamano * CAMARA.distanciaMinima;
    controles.maxDistance = tamano * CAMARA.distanciaMaxima;
    controles.target.set(...centro);
    // Encuadre inicial: desde el sur, algo elevado y desplazado, con margen para ver todo el piso.
    camara.position.set(
      centro[0] + tamano * 0.35,
      centro[1] + tamano * 0.95,
      centro[2] + tamano * 0.95,
    );
    camara.lookAt(...centro);
    controles.update();
    const alCambiar = () => invalidar();
    controles.addEventListener('change', alCambiar);
    invalidar();
    return () => {
      controles.removeEventListener('change', alCambiar);
      controles.dispose();
    };
    // `encuadre` fuerza un nuevo encuadre; `centro` y `tamano` van en él.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camara, dom, invalidar, encuadre]);

  return null;
}

export interface EscenaProps {
  planos: Record<number, PlanoGeometria>;
  /** Pisos a dibujar, de abajo arriba. */
  pisos: number[];
  separacionPisos: number;
  espacios: Map<string, EspacioMapa>;
  resaltados: ReadonlySet<string>;
  seleccionado: string | null;
  onSeleccionar: (id: string) => void;
}

export default function Escena({
  planos,
  pisos,
  separacionPisos,
  espacios,
  resaltados,
  seleccionado,
  onSeleccionar,
}: EscenaProps) {
  const base = planos[pisos[0]];
  const { x, y: z, ancho, alto } = base.caja;
  const altoTotal = (pisos.length - 1) * separacionPisos + ALTURA.laboratorio;
  // El encuadre crece con la altura de la pila de pisos para que quepan todos.
  const tamano = Math.max(ancho, alto) + altoTotal * 0.6;
  const centro: [number, number, number] = [x + ancho / 2, altoTotal / 2, z + alto / 2];

  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight
        position={[centro[0] + tamano, tamano * 1.5, centro[2] + tamano * 0.5]}
        intensity={1.6}
      />
      <directionalLight
        position={[centro[0] - tamano, tamano, centro[2] - tamano]}
        intensity={0.5}
      />

      {pisos.map((piso, i) => (
        <Piso
          key={piso}
          plano={planos[piso]}
          y={i * separacionPisos}
          espacios={espacios}
          resaltados={resaltados}
          seleccionado={seleccionado}
          onSeleccionar={onSeleccionar}
        />
      ))}

      <Controles centro={centro} tamano={tamano} encuadre={pisos.join(',')} />
    </>
  );
}

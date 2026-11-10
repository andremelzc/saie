import React, { useId, useMemo, useState } from 'react';
import { SelectorSegmentado } from '../estudiante/SelectorSegmentado';
import Mapa3DLazy from '../mapa3d/Mapa3DLazy';
import type { EstadoOcupacion } from '../mapa3d/tipos';
import BuscadorEspacios from './BuscadorEspacios';
import { claseBotonMapa } from './controles';
import FiltrosMapa from './FiltrosMapa';
import FranjaMapa from './FranjaMapa';
import ListaEspacios from './ListaEspacios';
import Mapa2D, { LeyendaMapa } from './Mapa2D';
import VentanaMapa from './VentanaMapa';
import { ESTADO_TEXTO, type EspacioMapa2D } from './etiquetas';
import { FILTRO_TODO, hayFiltro, pasaFiltro, type FiltroMapa } from './filtros';
import { DIAS, type Franja } from './franja';
import { indiceFiguras } from './indice';
import { PLANOS_SVG, PLANOS_URL } from './planos';

export type VistaDelMapa = '2d' | '3d';
type Vista = VistaDelMapa;
type Piso = number | 'todos';

const OPCIONES: { valor: Vista; etiqueta: string }[] = [
  { valor: '2d', etiqueta: 'Plano 2D' },
  { valor: '3d', etiqueta: 'Maqueta 3D' },
];

const TRAZO_AMPLIAR = 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5';

/** «Lun 07:00–09:00» o «Ahora»: lo que dice el botón de día y hora cuando está cerrado. */
function resumenDeFranja(franja: Franja | null): string {
  if (!franja) return 'Día y hora';
  const dia = DIAS.find((d) => d.valor === franja.dia)?.etiqueta ?? '';
  return `${dia.slice(0, 3)} ${franja.horaInicio}–${franja.horaFin}`;
}

/**
 * Botón que abre o cierra un panel de la barra de herramientas. Solo se ve en pantallas
 * estrechas: ahí día y hora y filtros se pliegan para que el mapa no quede lejos; desde `md`
 * los paneles están siempre a la vista.
 */
const BotonPlegable: React.FC<{
  abierto: boolean;
  idPanel: string;
  onAlternar: () => void;
  children: React.ReactNode;
}> = ({ abierto, idPanel, onAlternar, children }) => (
  <button
    type="button"
    aria-expanded={abierto}
    aria-controls={idPanel}
    onClick={onAlternar}
    className={`${claseBotonMapa(abierto)} min-w-0 justify-between`}
  >
    <span className="truncate">{children}</span>
    <svg
      className={`h-4 w-4 shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  </button>
);

export interface VistaMapaProps {
  espacios: EspacioMapa2D[];
  seleccionado: string | null;
  onSeleccionar: (id: string | null) => void;
  resaltados?: string[];
  /** Estados que muestra la leyenda del plano 2D. */
  estadosLeyenda?: EstadoOcupacion[];
  /** Vista elegida (modo controlado, p. ej. desde la URL). */
  vista?: Vista;
  onVistaCambiada?: (v: Vista) => void;
  /** Piso mostrado (modo controlado). `todos` es el edificio cerrado de la maqueta. */
  piso?: Piso;
  onPisoCambiado?: (p: Piso) => void;
  /** Si se da `onFranjaCambiada`, aparece el selector de día y hora. `null` es «ahora». */
  franja?: Franja | null;
  onFranjaCambiada?: (f: Franja | null) => void;
}

/**
 * Mapa de ocupación con dos vistas sobre los mismos planos: el plano 2D (por defecto) y la
 * maqueta 3D opcional, que se descarga solo al elegirla y, sin WebGL, muestra el plano 2D. La
 * selección, la vista y el piso son los mismos dentro y fuera de la ventana ampliada, que cubre
 * casi toda la página y deja solo el mapa.
 */
export const VistaMapa: React.FC<VistaMapaProps> = ({
  espacios,
  seleccionado,
  onSeleccionar,
  resaltados,
  estadosLeyenda,
  vista: vistaControlada,
  onVistaCambiada,
  piso: pisoControlado,
  onPisoCambiado,
  franja = null,
  onFranjaCambiada,
}) => {
  const [vistaInterna, setVistaInterna] = useState<Vista>('2d');
  const [pisoInterno, setPisoInterno] = useState<Piso | undefined>(undefined);
  const [ampliado, setAmpliado] = useState(false);
  const [filtro, setFiltro] = useState<FiltroMapa>(FILTRO_TODO);
  // En pantallas estrechas, qué panel de la barra de herramientas está abierto.
  const [panel, setPanel] = useState<'franja' | 'filtros' | null>(null);
  const idBase = useId();
  const [enfoque, setEnfoque] = useState<{ id: string; n: number } | null>(null);
  const vista = vistaControlada ?? vistaInterna;
  const piso = pisoControlado ?? pisoInterno;
  const setVista = (v: Vista) => {
    setVistaInterna(v);
    onVistaCambiada?.(v);
  };
  const setPiso = (p: Piso) => {
    setPisoInterno(p);
    onPisoCambiado?.(p);
  };
  const elegido = espacios.find((e) => e.id === seleccionado);

  const figuras = useMemo(() => indiceFiguras(PLANOS_SVG), []);
  const pisos = useMemo(
    () =>
      Object.keys(PLANOS_SVG)
        .map(Number)
        .sort((a, b) => a - b),
    [],
  );
  const pisoMostrado = typeof piso === 'number' && pisos.includes(piso) ? piso : pisos[0];
  const idPisos = `${idBase}-pisos`;
  const visibles = useMemo(() => espacios.filter((e) => pasaFiltro(e, filtro)), [espacios, filtro]);

  // Elegir en el buscador lleva al piso del espacio, lo selecciona y acerca la vista (2D o 3D).
  const irAEspacio = (id: string) => {
    const destino = figuras.get(id)?.piso;
    if (destino !== undefined) setPiso(destino);
    onSeleccionar(id);
    setEnfoque({ id, n: Date.now() });
  };

  const herramientas = (
    <>
      <BuscadorEspacios
        espacios={espacios}
        pisoDe={(id) => figuras.get(id)?.piso}
        onElegir={irAEspacio}
        className="w-full"
      />
      {onFranjaCambiada && <FranjaMapa franja={franja} onCambiar={onFranjaCambiada} />}
      <FiltrosMapa
        filtro={filtro}
        onCambiar={setFiltro}
        estados={estadosLeyenda}
        className="sm:col-span-2"
      />
    </>
  );

  const selector = (orientacion: 'horizontal' | 'vertical') => (
    <SelectorSegmentado
      etiquetaGrupo="Vista del mapa"
      opciones={OPCIONES}
      valor={vista}
      onCambiar={setVista}
      orientacion={orientacion}
      className={orientacion === 'vertical' ? 'w-full' : ''}
    />
  );
  const descripcion = (
    <p aria-live="polite" className="m-0 text-sm text-saie-text">
      {elegido
        ? `${elegido.nombre ?? elegido.id}: ${ESTADO_TEXTO[elegido.estado].toLowerCase()}`
        : 'Elige un aula o laboratorio para ver su estado.'}
    </p>
  );

  const lista = (
    <ListaEspacios
      espacios={visibles}
      pisoDe={(id) => figuras.get(id)?.piso}
      piso={piso}
      seleccionado={seleccionado}
      onElegir={irAEspacio}
    />
  );

  const mapa = (enVentana: boolean) =>
    vista === '2d' ? (
      <Mapa2D
        planos={PLANOS_SVG}
        espacios={espacios}
        seleccionado={seleccionado}
        resaltados={resaltados}
        onSeleccionar={onSeleccionar}
        estadosLeyenda={estadosLeyenda}
        pisoInicial={typeof piso === 'number' ? piso : undefined}
        piso={typeof piso === 'number' ? piso : undefined}
        onPisoCambiado={setPiso}
        selectorDePisoExterno={enVentana ? undefined : { idBase: idPisos }}
        filtro={filtro}
        enfocar={enfoque}
        disposicion={enVentana ? 'lateral' : 'arriba'}
        barraLateral={
          enVentana ? (
            <>
              {selector('vertical')}
              <div className="flex flex-col gap-3">{herramientas}</div>
            </>
          ) : undefined
        }
        pieLateral={enVentana ? descripcion : undefined}
      />
    ) : (
      <>
        <div
          className={`overflow-hidden rounded-xl border border-saie-divider bg-white ${
            enVentana ? 'h-[calc(100vh-8rem)] min-h-96' : 'h-[70vh] min-h-96'
          }`}
        >
          <Mapa3DLazy
            planos={PLANOS_URL}
            espacios={visibles}
            seleccionado={seleccionado}
            resaltados={resaltados}
            onSeleccionar={onSeleccionar}
            pisoInicial={piso ?? 'todos'}
            onPisoCambiado={setPiso}
            ordenCamara={enfoque ? { tipo: 'enfocar', id: enfoque.id, n: enfoque.n } : null}
            fallback={
              <Mapa2D
                planos={PLANOS_SVG}
                espacios={espacios}
                seleccionado={seleccionado}
                resaltados={resaltados}
                onSeleccionar={onSeleccionar}
                estadosLeyenda={estadosLeyenda}
                pisoInicial={typeof piso === 'number' ? piso : undefined}
                piso={typeof piso === 'number' ? piso : undefined}
                onPisoCambiado={setPiso}
                filtro={filtro}
                enfocar={enfoque}
              />
            }
          />
        </div>
        {!enVentana && <div className="mt-3">{lista}</div>}
      </>
    );

  return (
    <div className="flex flex-col gap-3">
      {/* Una sola barra: la vista (2D o 3D), el piso del plano 2D y «Ampliar mapa». */}
      <div className="flex flex-wrap items-center gap-3">
        {selector('horizontal')}
        {vista === '2d' && !ampliado && (
          <SelectorSegmentado
            etiquetaGrupo="Piso"
            idBase={idPisos}
            opciones={pisos.map((p) => ({ valor: String(p), etiqueta: `Piso ${p}` }))}
            valor={String(pisoMostrado)}
            onCambiar={(v) => setPiso(Number(v))}
          />
        )}
        <button
          type="button"
          onClick={() => setAmpliado(true)}
          className={`${claseBotonMapa('accion')} ml-auto`}
        >
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={TRAZO_AMPLIAR} />
          </svg>
          Ampliar mapa
        </button>
      </div>

      {!ampliado && (
        // Desde `md`: buscador y día/hora comparten fila y los filtros ocupan la de abajo. Por
        // debajo, el buscador va solo y día/hora y filtros son dos botones en una misma fila.
        <div className="flex flex-col gap-3 rounded-xl border border-saie-divider bg-white p-4 md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:items-start md:gap-x-6">
          <BuscadorEspacios
            espacios={espacios}
            pisoDe={(id) => figuras.get(id)?.piso}
            onElegir={irAEspacio}
            className="w-full"
          />
          <div className={`grid gap-2 md:hidden ${onFranjaCambiada ? 'grid-cols-2' : ''}`}>
            {onFranjaCambiada && (
              <BotonPlegable
                abierto={panel === 'franja'}
                idPanel={`${idBase}-franja`}
                onAlternar={() => setPanel(panel === 'franja' ? null : 'franja')}
              >
                {resumenDeFranja(franja)}
              </BotonPlegable>
            )}
            <BotonPlegable
              abierto={panel === 'filtros'}
              idPanel={`${idBase}-filtros`}
              onAlternar={() => setPanel(panel === 'filtros' ? null : 'filtros')}
            >
              {hayFiltro(filtro, estadosLeyenda) ? 'Filtros activos' : 'Filtros'}
            </BotonPlegable>
          </div>
          {onFranjaCambiada && (
            <div id={`${idBase}-franja`} className={panel === 'franja' ? '' : 'hidden md:block'}>
              <FranjaMapa franja={franja} onCambiar={onFranjaCambiada} />
            </div>
          )}
          <div
            id={`${idBase}-filtros`}
            className={`md:col-span-2 ${panel === 'filtros' ? '' : 'hidden md:block'}`}
          >
            <FiltrosMapa filtro={filtro} onCambiar={setFiltro} estados={estadosLeyenda} />
          </div>
        </div>
      )}

      {ampliado ? (
        <>
          <p className="m-0 rounded-xl border border-dashed border-saie-divider p-6 text-center text-sm text-saie-muted">
            El mapa está ampliado.
          </p>
          <VentanaMapa titulo="Mapa de ocupación" onCerrar={() => setAmpliado(false)}>
            {vista === '2d' ? (
              mapa(true)
            ) : (
              // La maqueta ocupa la altura de la ventana y los controles quedan a un lado.
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                <div className="order-2 min-w-0 flex-1 lg:order-1">{mapa(true)}</div>
                <aside
                  aria-label="Controles del mapa"
                  className="order-1 flex flex-col gap-4 lg:order-2 lg:w-60 lg:shrink-0"
                >
                  {selector('vertical')}
                  <div className="flex flex-col gap-3">{herramientas}</div>
                  <LeyendaMapa estados={estadosLeyenda} vertical />
                  {descripcion}
                  {lista}
                </aside>
              </div>
            )}
          </VentanaMapa>
        </>
      ) : (
        mapa(false)
      )}
    </div>
  );
};

export default VistaMapa;

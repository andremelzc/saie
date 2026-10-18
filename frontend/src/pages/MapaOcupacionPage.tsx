import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CabeceraPantalla from '../components/estudiante/CabeceraPantalla';
import { EsqueletoCarga, EstadoVacio, Icono } from '../components/estudiante/ElementosHorario';
import ListaEspaciosPiso from '../components/estudiante/ListaEspaciosPiso';
import PlanoPiso from '../components/estudiante/PlanoPiso';
import SelectorSegmentado from '../components/estudiante/SelectorSegmentado';
import type { OpcionSegmentada } from '../components/estudiante/SelectorSegmentado';
import { rutaDeAsignacion } from '../config/rutas';
import { useCarga } from '../hooks/useCarga';
import { obtenerCursos, obtenerMapaOcupacion } from '../services/estudiante';
import type { DiaSemana } from '../types/consulta';
import type { CursoMatriculadoDTO } from '../types/horario';
import type { EspacioOcupacionLecturaDTO, FiltrosMapaOcupacion } from '../types/ruta';
import {
  DIAS_LECTIVOS,
  ABREVIATURA_DIA,
  ETIQUETA_DIA,
  cursosEnFranja,
  etiquetaTipoEspacio,
  formatearRango,
} from '../utils/horario';
import { resolverIdPlano } from '../utils/plano';

const TRAZO_ALERTA = 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
const TRAZO_MAPA =
  'M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z';
const TRAZO_RELOJ = 'M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z';
const TRAZO_PIN =
  'M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z';
const TRAZO_FLECHA = 'M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75';

const HORAS = Array.from({ length: 15 }, (_, i) => `${String(i + 8).padStart(2, '0')}:00`);
const CLASES_CAMPO =
  'h-11 w-full rounded-xl border border-[#8A8578] bg-white px-3 text-base text-saie-text focus:border-saie-primary focus:ring-2 focus:ring-saie-primary/20 outline-hidden';

type Cuando = 'ahora' | 'otra';
type FiltroLista = 'todos' | 'libres' | 'ocupados' | 'mios';

const OPCIONES_CUANDO: OpcionSegmentada<Cuando>[] = [
  { valor: 'ahora', etiqueta: 'Ahora' },
  { valor: 'otra', etiqueta: 'Otro día u hora' },
];

interface Ubicacion {
  pabellon: string;
  piso: number;
}

const claveDe = (u: Ubicacion) => `${u.pabellon}|${u.piso}`;

const BloqueError: React.FC<{ mensaje: string; onReintentar: () => void }> = ({
  mensaje,
  onReintentar,
}) => (
  <div
    role="alert"
    className="flex flex-col items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-saie-danger"
  >
    <p className="m-0 flex items-start gap-2">
      <Icono trazo={TRAZO_ALERTA} className="mt-0.5 h-5 w-5 shrink-0" />
      <span>{mensaje}</span>
    </p>
    <button
      type="button"
      onClick={onReintentar}
      className="min-h-11 cursor-pointer rounded-xl bg-saie-primary px-5 text-sm font-medium text-white hover:bg-saie-primary-dark"
    >
      Reintentar
    </button>
  </div>
);

const Contador: React.FC<{
  valor: number;
  etiqueta: string;
  muestra: React.ReactNode;
  clases: string;
}> = ({ valor, etiqueta, muestra, clases }) => (
  <div
    className={`flex items-center gap-3 rounded-2xl border bg-white p-4 shadow-[0_2px_8px_rgba(34,34,34,0.06)] ${clases}`}
  >
    <span
      aria-hidden="true"
      className="saie-pop flex h-11 w-11 shrink-0 items-center justify-center"
    >
      {muestra}
    </span>
    <p className="m-0 leading-tight">
      <span
        className="saie-pop block font-serif text-4xl font-bold"
        data-testid={`contador-${etiqueta}`}
      >
        {valor}
      </span>
      <span className="text-sm font-medium text-saie-muted">{etiqueta}</span>
    </p>
  </div>
);

interface EspacioVista extends EspacioOcupacionLecturaDTO {
  idPlano: string;
  resaltado: boolean;
}

const DetalleEspacio: React.FC<{
  espacio: EspacioVista | null;
  cursos: CursoMatriculadoDTO[];
  piso: number;
  pabellon: string;
}> = ({ espacio, cursos, piso, pabellon }) => {
  if (!espacio) {
    return (
      <div
        role="status"
        className="flex items-start gap-3 rounded-2xl border border-dashed border-saie-divider bg-white p-4 text-sm text-saie-muted"
      >
        <Icono trazo={TRAZO_PIN} className="mt-0.5 h-5 w-5 shrink-0 text-saie-primary" />
        <p className="m-0">
          <strong className="font-semibold text-saie-text">Toca un espacio del plano</strong> (o de
          la lista) y aquí verás si está libre, qué es y si es uno de tus salones.
        </p>
      </div>
    );
  }

  const libre = espacio.estado === 'DISPONIBLE';
  const clasesAqui = cursos.filter((c) => c.espacios.some((e) => e.id === espacio.id));

  return (
    <section
      aria-label={`Detalle de ${espacio.identificador}`}
      className={`saie-rise flex flex-col gap-3 rounded-2xl border-2 bg-white p-4 shadow-[0_2px_8px_rgba(34,34,34,0.08)] ${
        espacio.resaltado ? 'border-saie-primary' : 'border-saie-divider'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-xs font-medium uppercase tracking-wide text-saie-muted">
            {`${etiquetaTipoEspacio(espacio.tipo)} · ${pabellon}, piso ${piso}`}
          </p>
          <h3 className="m-0 font-serif text-2xl font-bold">{espacio.identificador}</h3>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${
            libre ? 'bg-[#E8F5E9] text-[#1B5E20]' : 'bg-[#EEF1F5] text-[#33415C]'
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-2.5 w-2.5 rounded-full ${libre ? 'bg-[#1E8E4E]' : 'saie-rayado border border-[#5B6B7F]'}`}
          />
          {libre ? 'Libre' : 'Ocupado'}
        </span>
      </div>

      {espacio.resaltado && (
        <p className="m-0 inline-flex w-fit items-center gap-1.5 rounded-full bg-saie-primary px-3 py-1 text-xs font-bold text-white">
          <Icono trazo={TRAZO_PIN} />
          Tienes clase aquí en esta franja
        </p>
      )}

      {clasesAqui.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {clasesAqui.map((c) => (
            <li
              key={`${c.codigoCurso}-${c.codigoSeccion}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-saie-canvas p-3"
            >
              <span className="text-sm">
                <strong className="font-semibold">{c.nombreCurso}</strong>
                <span className="block text-saie-muted">
                  {c.horarios
                    .map(
                      (h) =>
                        `${ABREVIATURA_DIA[h.diaSemana]} ${formatearRango(h.horaInicio, h.horaFin)}`,
                    )
                    .join(' · ')}
                </span>
              </span>
              {c.asignacionId && (
                <Link
                  to={rutaDeAsignacion(c.asignacionId)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-saie-primary px-4 text-sm font-medium text-white no-underline hover:bg-saie-primary-dark"
                >
                  Cómo llegar
                  <Icono trazo={TRAZO_FLECHA} className="h-4 w-4" />
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

const VistaMapa: React.FC<{
  filtros: FiltrosMapaOcupacion;
  cursos: CursoMatriculadoDTO[];
}> = ({ filtros, cursos }) => {
  const cargador = useCallback(() => obtenerMapaOcupacion(filtros), [filtros]);
  const { datos, cargando, error, recargar } = useCarga(cargador);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroLista>('todos');

  // Solo cuentan los cursos con clase en la franja que se está mirando: un domingo, o a una hora
  // sin clases, ningún espacio debe aparecer como «tu aula».
  const misEspacios = useMemo(() => {
    if (!datos) return new Set<string>();
    const enFranja = cursosEnFranja(cursos, datos.franja);
    const ids = new Set<string>();
    for (const curso of enFranja) {
      for (const e of curso.espacios) {
        if (e.pabellon === datos.pabellon && e.piso === datos.piso) {
          ids.add(e.id);
          ids.add(e.identificador);
        }
      }
    }
    return ids;
  }, [datos, cursos]);

  const espacios = useMemo<EspacioVista[]>(
    () =>
      (datos?.espacios ?? []).map((e) => ({
        ...e,
        idPlano: resolverIdPlano(filtros.pabellon, e.identificador, filtros.piso),
        resaltado: misEspacios.has(e.id) || misEspacios.has(e.identificador),
      })),
    [datos, filtros.pabellon, filtros.piso, misEspacios],
  );

  const conteo = useMemo(
    () => ({
      libres: espacios.filter((e) => e.estado === 'DISPONIBLE').length,
      ocupados: espacios.filter((e) => e.estado === 'OCUPADO').length,
      mios: espacios.filter((e) => e.resaltado).length,
    }),
    [espacios],
  );

  const porcentajeOcupado =
    espacios.length === 0 ? 0 : Math.round((conteo.ocupados / espacios.length) * 100);

  const visibles = useMemo(
    () =>
      espacios.filter((e) => {
        if (filtro === 'libres') return e.estado === 'DISPONIBLE';
        if (filtro === 'ocupados') return e.estado === 'OCUPADO';
        if (filtro === 'mios') return e.resaltado;
        return true;
      }),
    [espacios, filtro],
  );

  if (cargando) return <EsqueletoCarga texto="Cargando el mapa…" />;
  if (error)
    return <BloqueError mensaje={`No pudimos cargar el mapa. ${error}`} onReintentar={recargar} />;
  if (!datos) return null;

  if (espacios.length === 0) {
    return (
      <EstadoVacio
        titulo="Sin espacios en este piso"
        descripcion="No hay aulas ni laboratorios registrados en este piso."
      />
    );
  }

  const { franja } = datos;
  const elegido = espacios.find((e) => e.idPlano === seleccionado) ?? null;
  const alSeleccionarPlano = (id: string | null) => setSeleccionado(id);
  const alSeleccionarLista = (idEspacio: string) => {
    const e = espacios.find((x) => x.id === idEspacio);
    if (e) setSeleccionado((actual) => (actual === e.idPlano ? null : e.idPlano));
  };

  const OPCIONES_FILTRO: { valor: FiltroLista; etiqueta: string; n: number }[] = [
    { valor: 'todos', etiqueta: 'Todos', n: espacios.length },
    { valor: 'libres', etiqueta: 'Libres', n: conteo.libres },
    { valor: 'ocupados', etiqueta: 'Ocupados', n: conteo.ocupados },
    ...(conteo.mios > 0
      ? [{ valor: 'mios' as const, etiqueta: 'Mis clases', n: conteo.mios }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <p
          role="status"
          className="m-0 inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-saie-text shadow-[0_2px_8px_rgba(34,34,34,0.06)]"
        >
          <Icono trazo={TRAZO_RELOJ} className="h-4 w-4 text-saie-primary" />
          <span>{`${ETIQUETA_DIA[franja.diaSemana]}, ${franja.horaInicio} a ${franja.horaFin}`}</span>
        </p>
        {conteo.mios === 0 && (
          <p className="m-0 text-sm text-saie-muted">
            No tienes clases en este piso en esta franja.
          </p>
        )}
      </div>

      <div className="saie-stagger grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Contador
          valor={conteo.libres}
          etiqueta="libres"
          clases="border-[#BFE3CB]"
          muestra={<span className="h-9 w-9 rounded-xl border-2 border-[#1E8E4E] bg-[#CDEBD6]" />}
        />
        <Contador
          valor={conteo.ocupados}
          etiqueta="ocupados"
          clases="border-saie-divider"
          muestra={<span className="saie-rayado h-9 w-9 rounded-xl border-2 border-[#5B6B7F]" />}
        />
        <Contador
          valor={conteo.mios}
          etiqueta="tus clases aquí"
          clases="border-saie-primary/30"
          muestra={<Icono trazo={TRAZO_PIN} className="h-9 w-9 text-saie-primary" />}
        />
      </div>

      <div
        role="img"
        aria-label={`${porcentajeOcupado}% del piso ocupado`}
        className="flex items-center gap-3 rounded-2xl border border-saie-divider bg-white px-4 py-3 shadow-[0_2px_8px_rgba(34,34,34,0.06)]"
      >
        <span className="text-sm font-bold">Ocupación del piso</span>
        <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#E9F4EC]">
          <span
            key={porcentajeOcupado}
            className="saie-barra block h-full rounded-full bg-gradient-to-r from-[#1E8E4E] to-saie-primary"
            style={{ width: `${porcentajeOcupado}%` }}
          />
        </span>
        <span className="w-10 text-right text-sm font-bold tabular-nums">{`${porcentajeOcupado}%`}</span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <PlanoPiso
          className="saie-fundido rounded-2xl border border-saie-divider bg-white p-3 shadow-[0_2px_8px_rgba(34,34,34,0.06)]"
          piso={datos.piso}
          etiqueta={`Plano del piso ${datos.piso}: espacios libres y ocupados`}
          espacios={espacios.map((e) => ({ id: e.idPlano, tipo: e.tipo, estado: e.estado }))}
          resaltados={espacios.filter((e) => e.resaltado).map((e) => e.idPlano)}
          seleccionado={seleccionado}
          onSeleccionar={alSeleccionarPlano}
          fallback={
            <p role="status" className="m-0 p-4 text-sm text-saie-text">
              Tu navegador no puede mostrar el plano en 3D. Usa el plano normal o la lista.
            </p>
          }
        />

        <div className="flex flex-col gap-4">
          <DetalleEspacio
            espacio={elegido}
            cursos={cursos}
            piso={datos.piso}
            pabellon={datos.pabellon}
          />

          <fieldset className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0">
            <legend className="sr-only">Filtrar la lista de espacios</legend>
            {OPCIONES_FILTRO.map((o) => (
              <button
                key={o.valor}
                type="button"
                aria-pressed={filtro === o.valor}
                onClick={() => setFiltro(o.valor)}
                className={`min-h-11 cursor-pointer rounded-full border px-4 text-sm font-medium transition-colors ${
                  filtro === o.valor
                    ? 'border-saie-primary bg-saie-primary text-white'
                    : 'border-saie-divider bg-white text-saie-text hover:bg-saie-canvas'
                }`}
              >
                {`${o.etiqueta} · ${o.n}`}
              </button>
            ))}
          </fieldset>

          <ListaEspaciosPiso
            titulo="Espacios del piso"
            className="max-h-[44vh] overflow-y-auto pr-1 [&_ul]:lg:grid-cols-1"
            espacios={visibles}
            seleccionado={elegido?.id ?? null}
            onSeleccionar={alSeleccionarLista}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Mapa de ocupación del alumno (Issue 3.13): qué aulas y laboratorios de un piso están libres u
 * ocupados, ahora o en la franja que elija. No muestra cursos ni docentes de otros. Solo ofrece
 * los pisos donde el alumno tiene clase, que es lo que necesita para ubicarse.
 */
export const MapaOcupacionPage: React.FC = () => {
  const { datos, cargando, error, recargar } = useCarga(obtenerCursos);
  const [elegida, setElegida] = useState<string | null>(null);
  const [cuando, setCuando] = useState<Cuando>('ahora');
  const [dia, setDia] = useState<DiaSemana>('LUNES');
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFin, setHoraFin] = useState('10:00');
  const otraFranja = cuando === 'otra';

  const ubicaciones = useMemo(() => {
    const porClave = new Map<string, Ubicacion>();
    for (const curso of datos?.cursos ?? []) {
      for (const e of curso.espacios) {
        porClave.set(claveDe({ pabellon: e.pabellon, piso: e.piso }), {
          pabellon: e.pabellon,
          piso: e.piso,
        });
      }
    }
    return [...porClave.values()].sort(
      (a, b) => a.pabellon.localeCompare(b.pabellon) || a.piso - b.piso,
    );
  }, [datos]);

  const ubicacion = ubicaciones.find((u) => claveDe(u) === elegida) ?? ubicaciones[0];
  const franjaValida = horaFin > horaInicio;

  const filtros = useMemo<FiltrosMapaOcupacion | null>(() => {
    if (!ubicacion) return null;
    return {
      pabellon: ubicacion.pabellon,
      piso: ubicacion.piso,
      franja: otraFranja && franjaValida ? { dia, horaInicio, horaFin } : undefined,
    };
  }, [ubicacion, otraFranja, franjaValida, dia, horaInicio, horaFin]);

  const opcionesPiso = useMemo<OpcionSegmentada<string>[]>(
    () =>
      ubicaciones.map((u) => ({ valor: claveDe(u), etiqueta: `${u.pabellon} · piso ${u.piso}` })),
    [ubicaciones],
  );

  const cuerpo = () => {
    if (cargando) return <EsqueletoCarga />;
    if (error) {
      return (
        <BloqueError
          mensaje={`No pudimos cargar tu información. ${error}`}
          onReintentar={recargar}
        />
      );
    }
    if (!filtros) {
      return (
        <EstadoVacio
          titulo="Aún no hay un piso para mostrar"
          descripcion="Cuando tus cursos tengan aula o laboratorio asignado, podrás ver aquí el mapa de su piso."
        />
      );
    }
    if (otraFranja && !franjaValida) {
      return (
        <p role="alert" className="m-0 text-sm font-medium text-saie-danger">
          La hora de fin debe ser posterior a la de inicio.
        </p>
      );
    }
    return (
      <VistaMapa key={JSON.stringify(filtros)} filtros={filtros} cursos={datos?.cursos ?? []} />
    );
  };

  return (
    <div className="min-h-screen bg-saie-canvas text-saie-text">
      <CabeceraPantalla
        titulo="Mapa de ocupación"
        subtitulo="Aulas y laboratorios libres u ocupados en el piso de tus clases"
        trazoIcono={TRAZO_MAPA}
      />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6">
        {ubicaciones.length > 0 && (
          <form
            onSubmit={(e) => e.preventDefault()}
            aria-label="Filtros del mapa"
            className="flex flex-col gap-4 rounded-2xl border border-saie-divider bg-white p-4 shadow-[0_2px_8px_rgba(34,34,34,0.06)]"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-sm font-bold">1. ¿Qué piso quieres ver?</span>
                {opcionesPiso.length > 1 ? (
                  <fieldset className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0">
                    <legend className="sr-only">Piso</legend>
                    {opcionesPiso.map((o) => {
                      const activa = o.valor === (ubicacion ? claveDe(ubicacion) : '');
                      return (
                        <button
                          key={o.valor}
                          type="button"
                          aria-pressed={activa}
                          onClick={() => setElegida(o.valor)}
                          className={`min-h-11 cursor-pointer rounded-xl border px-4 text-left text-sm transition-all duration-200 ${
                            activa
                              ? 'border-saie-primary bg-saie-primary font-bold text-white shadow-[0_2px_6px_rgba(123,17,19,0.35)]'
                              : 'border-saie-divider bg-white font-medium text-saie-text hover:-translate-y-0.5 hover:bg-saie-canvas'
                          }`}
                        >
                          {o.etiqueta}
                        </button>
                      );
                    })}
                  </fieldset>
                ) : (
                  <p className="m-0 rounded-xl bg-saie-canvas px-4 py-3 text-sm font-medium">
                    {ubicacion ? `${ubicacion.pabellon} · piso ${ubicacion.piso}` : ''}
                  </p>
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-sm font-bold">2. ¿Para cuándo?</span>
                <SelectorSegmentado
                  opciones={OPCIONES_CUANDO}
                  valor={cuando}
                  onCambiar={setCuando}
                  etiquetaGrupo="Momento a consultar"
                  className="w-full"
                />
              </div>
            </div>

            {otraFranja && (
              <div className="grid grid-cols-1 gap-3 rounded-xl bg-saie-canvas p-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="mapa-dia" className="text-sm font-medium">
                    Día
                  </label>
                  <select
                    id="mapa-dia"
                    value={dia}
                    onChange={(e) => setDia(e.target.value as DiaSemana)}
                    className={CLASES_CAMPO}
                  >
                    {DIAS_LECTIVOS.map((d) => (
                      <option key={d} value={d}>
                        {ETIQUETA_DIA[d]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="mapa-inicio" className="text-sm font-medium">
                    Desde
                  </label>
                  <select
                    id="mapa-inicio"
                    value={horaInicio}
                    onChange={(e) => setHoraInicio(e.target.value)}
                    className={CLASES_CAMPO}
                  >
                    {HORAS.slice(0, -1).map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="mapa-fin" className="text-sm font-medium">
                    Hasta
                  </label>
                  <select
                    id="mapa-fin"
                    value={horaFin}
                    onChange={(e) => setHoraFin(e.target.value)}
                    className={CLASES_CAMPO}
                  >
                    {HORAS.slice(1).map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </form>
        )}
        <section aria-label="Mapa del piso">{cuerpo()}</section>
      </main>
    </div>
  );
};

export default MapaOcupacionPage;

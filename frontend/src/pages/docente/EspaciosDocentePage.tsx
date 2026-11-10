import React, { useCallback, useMemo, useState } from 'react';
import PaginaDocente from '../../components/docente/PaginaDocente';
import SelectorSegmentado from '../../components/estudiante/SelectorSegmentado';
import type { OpcionSegmentada } from '../../components/estudiante/SelectorSegmentado';
import { EsqueletoCarga, EstadoVacio } from '../../components/estudiante/ElementosHorario';
import { idPanelPestana, idPestana } from '../../components/estudiante/idsPestanas';
import { BadgeEstado } from '../../components/ui/BadgeEstado';
import { Campo } from '../../components/ui/Campo';
import { CLASE_CAMPO } from '../../components/ui/campos';
import { EstadoError } from '../../components/ui/EstadoError';
import { ICONOS } from '../../components/ui/iconos';
import { ZonaActualizable } from '../../components/ui/ZonaActualizable';
import { useCarga } from '../../hooks/useCarga';
import { useValorDiferido } from '../../hooks/useValorDiferido';
import {
  CLAVE_HORARIO_DOCENTE,
  explorarEspacios,
  obtenerEstadoLaboratorio,
  obtenerHorarioDocente,
} from '../../services/docente';
import type { DiaSemana, TipoEspacio } from '../../types/consulta';
import type { EspacioExploradorDTO, EstadoLaboratorioDocenteDTO } from '../../types/docente';
import { etiquetaTipoEspacio } from '../../utils/diccionarios';
import { laboratoriosDelDocente, ubicacionEspacio } from '../../utils/docente';
import { formatearFechaCorta } from '../../utils/fechas';
import { DIAS_LECTIVOS, ETIQUETA_DIA, formatearRango } from '../../utils/horario';
import { plural } from '../../utils/texto';

type SeccionPantalla = 'explorar' | 'laboratorio';

const OPCIONES_SECCION: OpcionSegmentada<SeccionPantalla>[] = [
  { valor: 'explorar', etiqueta: 'Explorar espacios' },
  { valor: 'laboratorio', etiqueta: 'Mi laboratorio' },
];

const PISOS = [1, 2, 3];

/** Fila de un espacio del explorador: identificación, capacidad y disponibilidad. */
const FilaEspacio: React.FC<{ e: EspacioExploradorDTO }> = ({ e }) => (
  <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-saie-divider bg-white p-4">
    <div className="min-w-0">
      <h3 className="m-0 text-base font-bold">{e.identificador}</h3>
      <p className="m-0 text-sm text-saie-muted">
        {etiquetaTipoEspacio(e.tipo)} · {ubicacionEspacio(e)}
      </p>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm tabular-nums">
        <strong className="font-semibold">{e.capacidadReal}</strong>
        {e.tipo === 'LABORATORIO' && e.capacidadReal !== e.aforoNominal
          ? ` de ${e.aforoNominal} puestos`
          : ' puestos'}
      </span>
      <BadgeEstado tono={e.disponible ? 'exito' : 'peligro'}>
        {e.disponible ? 'Disponible' : 'Ocupado'}
      </BadgeEstado>
    </div>
  </li>
);

/** Explorador de aulas y laboratorios con su disponibilidad en una franja (Issue 7.9). */
const ExploradorEspacios: React.FC = () => {
  const [tipo, setTipo] = useState<'TODOS' | TipoEspacio>('TODOS');
  const [piso, setPiso] = useState('TODOS');
  const [capacidad, setCapacidad] = useState('');
  const [soloDisponibles, setSoloDisponibles] = useState(false);
  const [enOtraFranja, setEnOtraFranja] = useState(false);
  const [dia, setDia] = useState<DiaSemana>('LUNES');
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFin, setHoraFin] = useState('10:00');
  const capacidadDiferida = useValorDiferido(capacidad);

  const franjaValida = !enOtraFranja || horaInicio < horaFin;
  const capacidadMinima = /^\d+$/.test(capacidadDiferida) ? Number(capacidadDiferida) : undefined;

  const cargar = useCallback(
    () =>
      explorarEspacios({
        tipo: tipo === 'TODOS' ? undefined : tipo,
        piso: piso === 'TODOS' ? undefined : Number(piso),
        capacidadMinima,
        soloDisponibles,
        ...(enOtraFranja ? { dia, horaInicio, horaFin } : {}),
      }),
    [tipo, piso, capacidadMinima, soloDisponibles, enOtraFranja, dia, horaInicio, horaFin],
  );
  const { datos, cargando, error, recargar } = useCarga(cargar, {
    clave: `docente:explorador:${tipo}|${piso}|${capacidadMinima ?? ''}|${soloDisponibles}|${
      enOtraFranja ? `${dia}|${horaInicio}|${horaFin}` : 'ahora'
    }`,
    habilitado: franjaValida,
  });

  const espacios = datos?.espacios ?? [];
  const disponibles = espacios.filter((e) => e.disponible).length;

  return (
    <div className="flex flex-col gap-4">
      <section aria-label="Filtros del explorador" className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Campo etiqueta="Tipo de espacio">
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as 'TODOS' | TipoEspacio)}
              className={CLASE_CAMPO}
            >
              <option value="TODOS">Todos</option>
              <option value="AULA_TEORICA">Aulas teóricas</option>
              <option value="LABORATORIO">Laboratorios</option>
            </select>
          </Campo>
          <Campo etiqueta="Piso">
            <select value={piso} onChange={(e) => setPiso(e.target.value)} className={CLASE_CAMPO}>
              <option value="TODOS">Todos</option>
              {PISOS.map((p) => (
                <option key={p} value={String(p)}>
                  Piso {p}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Capacidad mínima">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Ej. 30"
              value={capacidad}
              onChange={(e) => setCapacidad(e.target.value)}
              className={CLASE_CAMPO}
            />
          </Campo>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-6 w-6 accent-saie-primary"
              checked={soloDisponibles}
              onChange={(e) => setSoloDisponibles(e.target.checked)}
            />
            Solo disponibles
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-6 w-6 accent-saie-primary"
              checked={enOtraFranja}
              onChange={(e) => setEnOtraFranja(e.target.checked)}
            />
            Consultar otro día u hora
          </label>
        </div>
        {enOtraFranja && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Campo etiqueta="Día">
              <select
                value={dia}
                onChange={(e) => setDia(e.target.value as DiaSemana)}
                className={CLASE_CAMPO}
              >
                {DIAS_LECTIVOS.map((d) => (
                  <option key={d} value={d}>
                    {ETIQUETA_DIA[d]}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Desde">
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className={CLASE_CAMPO}
              />
            </Campo>
            <Campo etiqueta="Hasta">
              <input
                type="time"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                aria-invalid={!franjaValida || undefined}
                aria-describedby={!franjaValida ? 'error-franja' : undefined}
                className={CLASE_CAMPO}
              />
            </Campo>
          </div>
        )}
        {!franjaValida && (
          <p id="error-franja" role="alert" className="m-0 text-sm text-saie-danger-strong">
            La hora de fin debe ser posterior a la de inicio.
          </p>
        )}
        {datos && (
          <p className="m-0 text-sm text-saie-muted" aria-live="polite">
            {plural(espacios.length, 'espacio', 'espacios')} ·{' '}
            <strong className="text-saie-text">{disponibles} disponibles</strong>{' '}
            {enOtraFranja
              ? `el ${ETIQUETA_DIA[datos.franja.diaSemana].toLowerCase()} de ${formatearRango(
                  datos.franja.horaInicio,
                  datos.franja.horaFin,
                )}`
              : 'en este momento'}
          </p>
        )}
      </section>

      {error && <EstadoError mensaje={error} onReintentar={recargar} />}
      <ZonaActualizable actualizando={cargando && datos !== null}>
        {cargando && !datos ? (
          <EsqueletoCarga texto="Buscando espacios…" />
        ) : espacios.length === 0 ? (
          <EstadoVacio
            titulo="Sin espacios que coincidan"
            icono={ICONOS.edificio}
            descripcion="Prueba con otro tipo, piso o franja horaria."
          />
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0" aria-label="Espacios encontrados">
            {espacios.map((e) => (
              <FilaEspacio key={e.id} e={e} />
            ))}
          </ul>
        )}
      </ZonaActualizable>
    </div>
  );
};

/** Estado de equipos y software de un laboratorio del docente (Issue 7.9 con Issue 7.4). */
const DetalleLaboratorio: React.FC<{ estado: EstadoLaboratorioDocenteDTO }> = ({ estado }) => {
  const { laboratorio: lab, cursos, historial } = estado;
  const cifras = [
    { valor: lab.pcsOperativas, etiqueta: 'PCs operativas', tono: 'text-saie-success-strong' },
    { valor: lab.pcsMalogradas, etiqueta: 'PCs inoperativas', tono: 'text-saie-danger-strong' },
    { valor: lab.aforoNominal, etiqueta: 'Puestos en total', tono: 'text-saie-text' },
  ];
  return (
    <div className="flex flex-col gap-4">
      <ul className="m-0 grid list-none grid-cols-3 gap-3 p-0" aria-label="Estado de los equipos">
        {cifras.map((c) => (
          <li
            key={c.etiqueta}
            className="flex flex-col gap-1 rounded-xl border border-saie-divider bg-white p-4"
          >
            <span className={`text-2xl font-bold tabular-nums ${c.tono}`}>{c.valor}</span>
            <span className="text-sm text-saie-muted">{c.etiqueta}</span>
          </li>
        ))}
      </ul>

      <section
        aria-labelledby="titulo-software"
        className="flex flex-col gap-2 rounded-xl border border-saie-divider bg-white p-4"
      >
        <h3 id="titulo-software" className="m-0 text-base font-bold">
          Software instalado
        </h3>
        {lab.softwareInstalado.length === 0 ? (
          <p className="m-0 text-sm text-saie-muted">No hay software registrado.</p>
        ) : (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {lab.softwareInstalado.map((s) => (
              <li
                key={s.id}
                className="rounded-full border border-saie-divider bg-saie-canvas px-3 py-1 text-sm"
              >
                {s.nombre} {s.version}
              </li>
            ))}
          </ul>
        )}
      </section>

      {cursos.length > 0 && (
        <section aria-labelledby="titulo-cursos-lab" className="flex flex-col gap-2">
          <h3 id="titulo-cursos-lab" className="m-0 text-base font-bold">
            ¿Tiene lo que piden tus cursos?
          </h3>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {cursos.map((c) => (
              <li
                key={c.asignacionId}
                className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-saie-divider bg-white p-4"
              >
                <div className="min-w-0">
                  <p className="m-0 font-semibold">
                    {c.codigoCurso} · Sección {c.codigoSeccion}
                  </p>
                  <p className="m-0 text-sm text-saie-muted">{c.nombreCurso}</p>
                  {!c.cumple && c.softwareFaltante.length > 0 && (
                    <p className="m-0 mt-1 text-sm text-saie-danger-strong">
                      Falta: {c.softwareFaltante.join(', ')}
                    </p>
                  )}
                </div>
                <BadgeEstado tono={c.cumple ? 'exito' : 'peligro'}>
                  {c.cumple ? 'Software completo' : 'Falta software'}
                </BadgeEstado>
              </li>
            ))}
          </ul>
        </section>
      )}

      {historial.length > 0 && (
        <section aria-labelledby="titulo-historial-lab" className="flex flex-col gap-2">
          <h3 id="titulo-historial-lab" className="m-0 text-base font-bold">
            Cambios recientes
          </h3>
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
            {historial.slice(0, 5).map((h, i) => (
              <li key={`${h.fechaCambio}-${i}`} className="flex flex-wrap gap-x-2">
                <span className="text-saie-muted tabular-nums">
                  {formatearFechaCorta(h.fechaCambio)}
                </span>
                <span>
                  {h.campo === 'PCS_MALOGRADAS' ? 'PCs inoperativas' : 'Software'}:{' '}
                  {h.valorAnterior ?? '—'} → {h.valorNuevo}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

/** Pestaña «Mi laboratorio»: solo los laboratorios donde el docente tiene clase. */
const MiLaboratorio: React.FC = () => {
  const horario = useCarga(obtenerHorarioDocente, { clave: CLAVE_HORARIO_DOCENTE });
  const asignaciones = horario.datos?.asignacionesActivas;
  const laboratorios = useMemo(() => laboratoriosDelDocente(asignaciones ?? []), [asignaciones]);
  const [elegido, setElegido] = useState<string | null>(null);
  const labId = elegido ?? laboratorios[0]?.id ?? null;

  const cargar = useCallback(() => obtenerEstadoLaboratorio(labId ?? ''), [labId]);
  const estado = useCarga(cargar, {
    clave: `docente:laboratorio:${labId ?? ''}`,
    habilitado: labId !== null,
  });

  if (horario.cargando && !horario.datos) return <EsqueletoCarga texto="Cargando tus clases…" />;
  if (horario.error) {
    return <EstadoError mensaje={horario.error} onReintentar={horario.recargar} />;
  }
  if (laboratorios.length === 0) {
    return (
      <EstadoVacio
        titulo="No tienes clases en laboratorio"
        icono={ICONOS.monitor}
        descripcion="Cuando una de tus secciones tenga un laboratorio asignado, verás aquí el estado de sus equipos."
      />
    );
  }

  const actual = laboratorios.find((l) => l.id === labId);
  return (
    <div className="flex flex-col gap-4">
      {laboratorios.length > 1 ? (
        <Campo etiqueta="Laboratorio" className="flex max-w-sm flex-col gap-1">
          <select
            value={labId ?? ''}
            onChange={(e) => setElegido(e.target.value)}
            className={CLASE_CAMPO}
          >
            {laboratorios.map((l) => (
              <option key={l.id} value={l.id}>
                {l.identificador} · {ubicacionEspacio(l)}
              </option>
            ))}
          </select>
        </Campo>
      ) : (
        actual && (
          <p className="m-0 text-base">
            <strong className="font-semibold">Laboratorio {actual.identificador}</strong>
            <span className="text-saie-muted"> · {ubicacionEspacio(actual)}</span>
          </p>
        )
      )}
      {actual && (
        <p className="m-0 text-sm text-saie-muted">Tus clases aquí: {actual.cursos.join(', ')}</p>
      )}

      {estado.error && <EstadoError mensaje={estado.error} onReintentar={estado.recargar} />}
      {estado.cargando && !estado.datos ? (
        <EsqueletoCarga texto="Consultando los equipos…" />
      ) : (
        estado.datos && <DetalleLaboratorio estado={estado.datos} />
      )}
    </div>
  );
};

/**
 * Espacios y equipos del docente (Issue 7.9), con datos reales (Issue 7.12): el explorador de
 * disponibilidad del campus y el estado de los equipos de sus laboratorios.
 */
export const EspaciosDocentePage: React.FC = () => {
  const [seccion, setSeccion] = useState<SeccionPantalla>('explorar');
  return (
    <PaginaDocente
      titulo="Explorar espacios y equipos"
      descripcion="Busca aulas y laboratorios libres y revisa tu laboratorio antes de clase."
    >
      <SelectorSegmentado
        opciones={OPCIONES_SECCION}
        valor={seccion}
        onCambiar={setSeccion}
        etiquetaGrupo="Secciones de la pantalla"
        idBase="espacios-docente"
        className="self-start"
      />
      <section
        role="tabpanel"
        id={idPanelPestana('espacios-docente', seccion)}
        aria-labelledby={idPestana('espacios-docente', seccion)}
      >
        <h2 className="sr-only">
          {seccion === 'explorar' ? 'Explorador de espacios' : 'Estado de mi laboratorio'}
        </h2>
        {seccion === 'explorar' ? <ExploradorEspacios /> : <MiLaboratorio />}
      </section>
    </PaginaDocente>
  );
};

export default EspaciosDocentePage;

import React, { useState } from 'react';
import PaginaDocente from '../../components/docente/PaginaDocente';
import { EsqueletoCarga, EstadoVacio } from '../../components/estudiante/ElementosHorario';
import { Aviso } from '../../components/ui/Aviso';
import { BadgeEstado } from '../../components/ui/BadgeEstado';
import { Boton } from '../../components/ui/Boton';
import { BotonEnlace } from '../../components/ui/BotonEnlace';
import { Campo } from '../../components/ui/Campo';
import { CLASE_CAMPO } from '../../components/ui/campos';
import { EstadoError } from '../../components/ui/EstadoError';
import { ICONOS } from '../../components/ui/iconos';
import { RUTAS } from '../../config/rutas';
import { useAccion } from '../../hooks/useAccion';
import { useCarga, type EstadoCarga } from '../../hooks/useCarga';
import {
  CLAVE_HORARIO_DOCENTE,
  CLAVE_INCIDENCIAS_DOCENTE,
  obtenerHorarioDocente,
  obtenerMisIncidencias,
  reportarIncidencia,
} from '../../services/docente';
import type {
  AsignacionActivaDocenteDTO,
  IncidenciaDocenteDTO,
  IncidenciaRegistradaDTO,
  PrioridadIncidencia,
  TipoIncidencia,
} from '../../types/docente';
import type { EspacioAsignadoDTO } from '../../types/consulta';
import {
  describirEstadoIncidencia,
  describirPrioridadIncidencia,
  etiquetaTipoEspacio,
  etiquetaTipoIncidencia,
  TIPO_INCIDENCIA,
} from '../../utils/diccionarios';
import { ubicacionEspacio } from '../../utils/docente';
import { formatearFechaCorta } from '../../utils/fechas';

const MIN_DESCRIPCION = 5;
const MAX_DESCRIPCION = 1000;
const MAX_EVIDENCIA = 500;

const PRIORIDADES: { valor: PrioridadIncidencia; etiqueta: string }[] = [
  { valor: 'BAJA', etiqueta: 'Baja: se puede dictar la clase con normalidad' },
  { valor: 'MEDIA', etiqueta: 'Media: afecta a parte de la clase' },
  { valor: 'ALTA', etiqueta: 'Alta: impide dictar la clase' },
];

interface Formulario {
  asignacionId: string;
  espacioId: string;
  tipo: TipoIncidencia | '';
  prioridad: PrioridadIncidencia;
  descripcion: string;
  evidencia: string;
}

interface Confirmacion {
  registro: IncidenciaRegistradaDTO;
  prioridad: PrioridadIncidencia;
  asignacion: AsignacionActivaDocenteDTO;
  espacio: EspacioAsignadoDTO;
}

function formularioInicial(asignaciones: AsignacionActivaDocenteDTO[]): Formulario {
  const primera = asignaciones[0];
  return {
    asignacionId: primera?.asignacionId ?? '',
    espacioId: primera?.espacios[0]?.id ?? '',
    tipo: '',
    prioridad: 'MEDIA',
    descripcion: '',
    evidencia: '',
  };
}

/** Pantalla de confirmación con el identificador de seguimiento (Issue 7.10). */
const ConfirmacionIncidencia: React.FC<{ c: Confirmacion; onOtra: () => void }> = ({
  c,
  onOtra,
}) => {
  const prioridad = describirPrioridadIncidencia(c.prioridad);
  return (
    <section
      role="status"
      aria-labelledby="titulo-confirmacion"
      className="flex flex-col gap-4 rounded-2xl border border-saie-success/30 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-col gap-1">
        <h2 id="titulo-confirmacion" className="m-0 text-xl font-bold text-saie-success-strong">
          Incidencia registrada
        </h2>
        <p className="m-0 text-sm text-saie-muted">
          Jefatura de Laboratorios ya puede verla. Guarda el código para hacerle seguimiento.
        </p>
      </div>
      <dl className="m-0 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs font-semibold text-saie-muted">Código de seguimiento</dt>
          <dd className="m-0 font-mono text-lg font-bold">{c.registro.identificadorSeguimiento}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-saie-muted">Prioridad</dt>
          <dd className="m-0 mt-1">
            <BadgeEstado tono={prioridad.tono}>{prioridad.etiqueta}</BadgeEstado>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-saie-muted">Ubicación</dt>
          <dd className="m-0">
            <strong className="font-semibold">
              {etiquetaTipoEspacio(c.espacio.tipo)} {c.espacio.identificador}
            </strong>
            <span className="block text-sm text-saie-muted">{ubicacionEspacio(c.espacio)}</span>
          </dd>
        </div>
      </dl>
      <p className="m-0 text-sm">
        Clase: {c.asignacion.codigoCurso} · Sección {c.asignacion.codigoSeccion} —{' '}
        {c.asignacion.nombreCurso}
      </p>
      <div className="flex flex-wrap gap-3">
        <Boton onClick={onOtra}>Reportar otra incidencia</Boton>
        <BotonEnlace to={RUTAS.inicioDocente} variante="secundario">
          Volver al portal
        </BotonEnlace>
      </div>
    </section>
  );
};

/** Una incidencia del docente con su estado y, si Jefatura la cerró, el comentario de cierre (Issue 7.14). */
const FilaIncidencia: React.FC<{ i: IncidenciaDocenteDTO }> = ({ i }) => {
  const estado = describirEstadoIncidencia(i.estado);
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-saie-divider bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="m-0 font-mono text-base font-bold">{i.identificadorSeguimiento}</h3>
          <p className="m-0 text-sm text-saie-muted">
            {etiquetaTipoIncidencia(i.tipo)} · reportada el {formatearFechaCorta(i.fechaReporte)}
          </p>
        </div>
        <BadgeEstado tono={estado.tono}>{estado.etiqueta}</BadgeEstado>
      </div>
      <p className="m-0 text-sm text-saie-text">
        {i.espacio.identificador} · {ubicacionEspacio(i.espacio)}
      </p>
      <p className="m-0 text-sm text-saie-muted">
        Clase: {i.asignacion.codigoCurso} · Sección {i.asignacion.codigoSeccion} —{' '}
        {i.asignacion.nombreCurso}
      </p>
      {i.comentarioCierre && (
        <p className="m-0 rounded-lg bg-saie-canvas px-3 py-2 text-sm text-saie-text">
          <span className="block text-xs font-semibold text-saie-muted">
            Respuesta de Jefatura
            {i.fechaCierre ? ` · ${formatearFechaCorta(i.fechaCierre)}` : ''}
          </span>
          {i.comentarioCierre}
        </p>
      )}
    </li>
  );
};

/** «Mis incidencias»: el error y el vacío nunca aparecen a la vez (Issue 7.16). */
const SeccionMisIncidencias: React.FC<{ estado: EstadoCarga<IncidenciaDocenteDTO[]> }> = ({
  estado,
}) => {
  const { datos, cargando, error, recargar } = estado;
  return (
    <section aria-labelledby="titulo-mis-incidencias" className="flex flex-col gap-3">
      <h2 id="titulo-mis-incidencias" className="m-0 text-lg font-bold">
        Mis incidencias
      </h2>
      {error && <EstadoError mensaje={error} onReintentar={recargar} />}
      {!datos && cargando && <EsqueletoCarga texto="Cargando tus incidencias…" />}
      {datos && datos.length === 0 && (
        <EstadoVacio
          titulo="Aún no has reportado incidencias"
          icono={ICONOS.alerta}
          descripcion="Cuando reportes una, aquí verás su estado y la respuesta de Jefatura."
        />
      )}
      {datos && datos.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {datos.map((i) => (
            <FilaIncidencia key={i.id} i={i} />
          ))}
        </ul>
      )}
    </section>
  );
};

/**
 * Reporte de incidencias del docente (Issue 7.10), conectado a POST /docente/incidencias
 * (Issue 7.12). Solo se puede reportar sobre un espacio de una clase propia con aula vigente.
 */
export const IncidenciasDocentePage: React.FC = () => {
  const horario = useCarga(obtenerHorarioDocente, { clave: CLAVE_HORARIO_DOCENTE });
  const asignaciones = horario.datos?.asignacionesActivas ?? [];
  const misIncidencias = useCarga(obtenerMisIncidencias, { clave: CLAVE_INCIDENCIAS_DOCENTE });
  const accion = useAccion();
  const [form, setForm] = useState<Formulario | null>(null);
  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  // El formulario arranca con la primera clase en cuanto llega el horario.
  const datos = form ?? formularioInicial(asignaciones);
  const asignacion = asignaciones.find((a) => a.asignacionId === datos.asignacionId);
  const espacio = asignacion?.espacios.find((e) => e.id === datos.espacioId);

  const cambiar = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) => {
    setForm((previo) => {
      const base = previo ?? formularioInicial(asignaciones);
      const siguiente = { ...base, [campo]: valor };
      // Al cambiar de clase, el espacio pasa al primero de esa clase.
      if (campo === 'asignacionId') {
        const nueva = asignaciones.find((a) => a.asignacionId === valor);
        siguiente.espacioId = nueva?.espacios[0]?.id ?? '';
      }
      return siguiente;
    });
    setErrorEnvio(null);
  };

  const descripcion = datos.descripcion.trim();
  const motivoBloqueo = !asignacion
    ? 'Elige la clase afectada.'
    : !espacio
      ? 'Elige el espacio afectado.'
      : !datos.tipo
        ? 'Elige el tipo de incidencia.'
        : descripcion.length < MIN_DESCRIPCION
          ? `Describe el problema (al menos ${MIN_DESCRIPCION} caracteres).`
          : null;

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (motivoBloqueo || !asignacion || !espacio || !datos.tipo) return;
    const resultado = await accion.ejecutar(
      () =>
        reportarIncidencia({
          asignacionId: asignacion.asignacionId,
          espacioId: espacio.id,
          tipo: datos.tipo as TipoIncidencia,
          prioridad: datos.prioridad,
          descripcion,
          evidencia: datos.evidencia.trim() || undefined,
        }),
      { avisarError: false },
    );
    if (resultado?.ok) {
      misIncidencias.recargar();
      setConfirmacion({
        registro: resultado.valor,
        prioridad: datos.prioridad,
        asignacion,
        espacio,
      });
    } else if (resultado) {
      setErrorEnvio(resultado.error);
    }
  }

  const reportarOtra = () => {
    setConfirmacion(null);
    setForm(null);
    setErrorEnvio(null);
  };

  const cuerpo = (): React.ReactNode => {
    if (confirmacion) return <ConfirmacionIncidencia c={confirmacion} onOtra={reportarOtra} />;
    if (horario.cargando && !horario.datos) return <EsqueletoCarga texto="Cargando tus clases…" />;
    if (horario.error) {
      return <EstadoError mensaje={horario.error} onReintentar={horario.recargar} />;
    }
    if (asignaciones.length === 0) {
      return (
        <EstadoVacio
          titulo="No tienes clases con aula asignada"
          icono={ICONOS.alerta}
          descripcion="Las incidencias se reportan sobre el aula o laboratorio de una de tus clases. Cuando tengas una asignada, podrás hacerlo aquí."
        />
      );
    }

    return (
      <form
        onSubmit={enviar}
        noValidate
        aria-labelledby="titulo-nueva-incidencia"
        className="flex flex-col gap-4 rounded-2xl border border-saie-divider bg-white p-5 shadow-sm"
      >
        <h2 id="titulo-nueva-incidencia" className="m-0 text-lg font-bold">
          Nueva incidencia
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo etiqueta="Clase afectada">
            <select
              value={datos.asignacionId}
              onChange={(e) => cambiar('asignacionId', e.target.value)}
              className={CLASE_CAMPO}
            >
              {asignaciones.map((a) => (
                <option key={a.asignacionId} value={a.asignacionId}>
                  {a.codigoCurso} · Sección {a.codigoSeccion} — {a.nombreCurso}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Espacio">
            <select
              value={datos.espacioId}
              onChange={(e) => cambiar('espacioId', e.target.value)}
              className={CLASE_CAMPO}
              disabled={(asignacion?.espacios.length ?? 0) <= 1}
            >
              {(asignacion?.espacios ?? []).map((e) => (
                <option key={e.id} value={e.id}>
                  {etiquetaTipoEspacio(e.tipo)} {e.identificador} · {ubicacionEspacio(e)}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo etiqueta="Tipo de incidencia (obligatorio)">
            <select
              value={datos.tipo}
              onChange={(e) => cambiar('tipo', e.target.value as TipoIncidencia | '')}
              required
              aria-required="true"
              className={CLASE_CAMPO}
            >
              <option value="">Elige el tipo</option>
              {Object.entries(TIPO_INCIDENCIA).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Prioridad">
            <select
              value={datos.prioridad}
              onChange={(e) => cambiar('prioridad', e.target.value as PrioridadIncidencia)}
              className={CLASE_CAMPO}
            >
              {PRIORIDADES.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.etiqueta}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        <Campo
          etiqueta="Descripción (obligatoria)"
          ayuda={`Qué falla y desde cuándo. ${datos.descripcion.length}/${MAX_DESCRIPCION} caracteres.`}
        >
          <textarea
            value={datos.descripcion}
            maxLength={MAX_DESCRIPCION}
            rows={4}
            required
            aria-required="true"
            onChange={(e) => cambiar('descripcion', e.target.value)}
            placeholder="Ej. Las PCs 5 y 6 no encienden."
            className={`${CLASE_CAMPO} py-2`}
          />
        </Campo>
        <Campo
          etiqueta="Evidencia (opcional)"
          ayuda="Enlace a una foto o un dato que ayude a ubicar el problema."
        >
          <input
            type="text"
            value={datos.evidencia}
            maxLength={MAX_EVIDENCIA}
            onChange={(e) => cambiar('evidencia', e.target.value)}
            placeholder="Ej. https://drive.google.com/…"
            className={CLASE_CAMPO}
          />
        </Campo>

        {errorEnvio && <Aviso tono="error">{errorEnvio}</Aviso>}

        <div>
          <Boton
            type="submit"
            disabled={motivoBloqueo !== null}
            motivoDeshabilitado={motivoBloqueo ?? undefined}
            cargando={accion.cargando}
            textoCargando="Enviando…"
          >
            Enviar reporte
          </Boton>
        </div>
      </form>
    );
  };

  return (
    <PaginaDocente
      titulo="Reportar una incidencia"
      descripcion="Informa una falla de equipos, software o del espacio. Jefatura de Laboratorios la atenderá."
    >
      {cuerpo()}
      <SeccionMisIncidencias estado={misIncidencias} />
    </PaginaDocente>
  );
};

export default IncidenciasDocentePage;

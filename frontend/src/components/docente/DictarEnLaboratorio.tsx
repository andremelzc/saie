import React, { useMemo, useState } from 'react';
import { EsqueletoCarga, EstadoVacio } from '../estudiante/ElementosHorario';
import { Aviso } from '../ui/Aviso';
import { BadgeEstado } from '../ui/BadgeEstado';
import { Boton } from '../ui/Boton';
import { Campo } from '../ui/Campo';
import { CLASE_CAMPO } from '../ui/campos';
import { EstadoError } from '../ui/EstadoError';
import { ICONOS } from '../ui/iconos';
import { useAccion } from '../../hooks/useAccion';
import { useCarga } from '../../hooks/useCarga';
import {
  crearSolicitudLaboratorio,
  obtenerMisSolicitudesLaboratorio,
} from '../../services/fusionLaboratorio';
import type { HorarioSemanalDTO } from '../../types/horario';
import type { SolicitudLaboratorioDTO } from '../../types/fusionLaboratorio';
import { formatearFechaCorta } from '../../utils/fechas';
import {
  candidatasLaboratorio,
  textoFranjas,
  tienePendiente,
  tituloSolicitudLaboratorio,
} from '../../utils/fusionLaboratorio';
import { ESTADO_SOLICITUD } from '../../utils/solicitudes';

const CLAVE = 'mis-solicitudes-laboratorio';
const MIN_JUSTIFICACION = 10;
const MAX_JUSTIFICACION = 500;

/** Error en línea de un campo del formulario (se anuncia al aparecer). */
const ErrorCampo: React.FC<{ id: string; mensaje?: string }> = ({ id, mensaje }) =>
  mensaje ? (
    <p id={id} role="alert" className="m-0 text-sm text-saie-danger-strong">
      {mensaje}
    </p>
  ) : null;

/** Lo que el docente necesita saber de una solicitud ya resuelta. */
function detalleResolucion(s: SolicitudLaboratorioDTO): React.ReactNode {
  if (s.estado === 'RECHAZADA') {
    return <Aviso tono="error">Coordinación la rechazó: {s.motivoRechazo ?? 'sin motivo'}</Aviso>;
  }
  if (s.estado === 'APROBADA') {
    const franjas = textoFranjas(s.seccionLaboratorio.horarios);
    const resultado = s.resultado ? ` Resultado: ${s.resultado}.` : '';
    return (
      <Aviso tono="exito">
        {`Ahora todo se dicta en la sección ${s.seccionLaboratorio.codigoSeccion}: ${franjas}.${resultado}`}
      </Aviso>
    );
  }
  return null;
}

const FilaSolicitud: React.FC<{ s: SolicitudLaboratorioDTO }> = ({ s }) => (
  <li className="flex flex-col gap-2 rounded-xl border border-saie-divider bg-white p-4">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <h4 className="m-0 min-w-0 text-base font-bold">
        {tituloSolicitudLaboratorio(s)}
        <span className="block text-sm font-normal text-saie-muted">
          {`${s.curso.nombre} · pedido el ${formatearFechaCorta(s.fechaSolicitud)}`}
        </span>
      </h4>
      <BadgeEstado tono={ESTADO_SOLICITUD[s.estado].tono}>
        {ESTADO_SOLICITUD[s.estado].etiqueta}
      </BadgeEstado>
    </header>
    <p className="m-0 text-sm text-saie-text">«{s.justificacion}»</p>
    {detalleResolucion(s)}
  </li>
);

/**
 * Issue 7.17 (riesgo R22) — «dictar todo en laboratorio». El docente elige una de sus secciones de
 * teoría que tiene laboratorio en el mismo grupo y explica por qué. Si Coordinación lo aprueba,
 * la teoría pasa al laboratorio y todo el curso queda en un mismo laboratorio.
 */
export const DictarEnLaboratorio: React.FC<{ horario: HorarioSemanalDTO }> = ({ horario }) => {
  const { datos, cargando, error, recargar } = useCarga(obtenerMisSolicitudesLaboratorio, {
    clave: CLAVE,
  });
  const accion = useAccion();
  const candidatas = useMemo(() => candidatasLaboratorio(horario), [horario]);
  const solicitudes = datos ?? [];
  const disponibles = candidatas.filter((c) => !tienePendiente(c.seccionTeoriaId, solicitudes));

  const [seccionId, setSeccionId] = useState('');
  const [justificacion, setJustificacion] = useState('');
  const [errores, setErrores] = useState<{ seccion?: string; justificacion?: string }>({});
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const elegida = candidatas.find((c) => c.seccionTeoriaId === seccionId);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const texto = justificacion.trim();
    const nuevos = {
      seccion: elegida ? undefined : 'Elige la sección de teoría.',
      justificacion:
        texto.length >= MIN_JUSTIFICACION
          ? undefined
          : 'Explica por qué necesitas dictar todo en laboratorio (al menos 10 caracteres).',
    };
    setErrores(nuevos);
    if (nuevos.seccion || nuevos.justificacion) return;

    const resultado = await accion.ejecutar(
      () => crearSolicitudLaboratorio({ seccionTeoriaId: seccionId, justificacion: texto }),
      { exito: 'Solicitud enviada. Coordinación la revisará.', avisarError: false },
    );
    if (resultado?.ok) {
      setSeccionId('');
      setJustificacion('');
      setErrorEnvio(null);
      recargar();
    } else if (resultado) {
      setErrorEnvio(resultado.error);
    }
  }

  const renderFormulario = (): React.ReactNode => {
    if (candidatas.length === 0) {
      return (
        <Aviso tono="info">
          Ninguna de tus secciones de teoría tiene laboratorio en el mismo grupo. Si necesitas
          dictarla en laboratorio, pide a Coordinación que cambie su tipo de aula.
        </Aviso>
      );
    }
    if (datos && disponibles.length === 0) {
      return (
        <Aviso tono="info">
          Ya enviaste una solicitud por cada sección posible. Espera la respuesta de Coordinación.
        </Aviso>
      );
    }
    return (
      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Campo etiqueta="Sección de teoría">
            <select
              value={seccionId}
              onChange={(e) => {
                setSeccionId(e.target.value);
                setErrores((p) => ({ ...p, seccion: undefined }));
              }}
              aria-invalid={errores.seccion ? true : undefined}
              aria-describedby={errores.seccion ? 'error-seccion-laboratorio' : undefined}
              className={CLASE_CAMPO}
            >
              <option value="">Elige una sección…</option>
              {disponibles.map((c) => (
                <option key={c.seccionTeoriaId} value={c.seccionTeoriaId}>
                  {c.codigoCurso} · Grupo {c.grupo} — {c.nombreCurso}
                </option>
              ))}
            </select>
          </Campo>
          <ErrorCampo id="error-seccion-laboratorio" mensaje={errores.seccion} />
        </div>

        {elegida && (
          <dl className="m-0 grid grid-cols-1 gap-2 rounded-xl bg-saie-canvas p-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold text-saie-muted">Teoría hoy</dt>
              <dd className="m-0">{textoFranjas(elegida.franjasTeoria)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-saie-muted">Laboratorio hoy</dt>
              <dd className="m-0">{textoFranjas(elegida.franjasLaboratorio)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-saie-muted">Si se aprueba</dt>
              <dd className="m-0">
                Todo en laboratorio:{' '}
                {textoFranjas([...elegida.franjasTeoria, ...elegida.franjasLaboratorio])}
              </dd>
            </div>
          </dl>
        )}

        <div className="flex flex-col gap-1">
          <Campo
            etiqueta="¿Por qué necesitas dictar todo en laboratorio?"
            ayuda="Por ejemplo: toda la práctica se hace en las PCs."
          >
            <textarea
              value={justificacion}
              maxLength={MAX_JUSTIFICACION}
              rows={3}
              onChange={(e) => {
                setJustificacion(e.target.value);
                setErrores((p) => ({ ...p, justificacion: undefined }));
              }}
              aria-invalid={errores.justificacion ? true : undefined}
              aria-describedby={
                errores.justificacion ? 'error-justificacion-laboratorio' : undefined
              }
              className={`${CLASE_CAMPO} py-2`}
            />
          </Campo>
          <ErrorCampo id="error-justificacion-laboratorio" mensaje={errores.justificacion} />
        </div>

        {errorEnvio && <Aviso tono="error">{errorEnvio}</Aviso>}
        <Boton
          type="submit"
          claseContenedor="self-start"
          cargando={accion.cargando}
          textoCargando="Enviando…"
        >
          Enviar solicitud
        </Boton>
      </form>
    );
  };

  const renderLista = (): React.ReactNode => {
    if (cargando && !datos) return <EsqueletoCarga texto="Cargando tus solicitudes…" />;
    if (!datos) return null;
    if (solicitudes.length === 0) {
      return (
        <EstadoVacio
          titulo="Aún no has pedido dictar en laboratorio"
          icono={ICONOS.portapapeles}
          descripcion="Cuando envíes una solicitud, aquí verás si Coordinación la aprobó o por qué la rechazó."
        />
      );
    }
    return (
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {solicitudes.map((s) => (
          <FilaSolicitud key={s.id} s={s} />
        ))}
      </ul>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <section
        aria-labelledby="titulo-dictar-laboratorio"
        className="flex flex-col gap-3 rounded-2xl border border-saie-divider bg-white p-5 shadow-sm"
      >
        <h3 id="titulo-dictar-laboratorio" className="m-0 text-lg font-bold">
          Dictar todo en laboratorio
        </h3>
        <p className="m-0 text-sm text-saie-muted">
          Si dictas todas las horas de un curso en laboratorio, pide juntar la teoría con su
          laboratorio. Al aprobarlo, el curso queda en un mismo laboratorio en todas sus horas.
        </p>
        {renderFormulario()}
      </section>

      <section aria-labelledby="titulo-mis-solicitudes-laboratorio" className="flex flex-col gap-3">
        <h3 id="titulo-mis-solicitudes-laboratorio" className="m-0 text-lg font-bold">
          Mis solicitudes
        </h3>
        {error && <EstadoError mensaje={error} onReintentar={recargar} />}
        {renderLista()}
      </section>
    </div>
  );
};

export default DictarEnLaboratorio;

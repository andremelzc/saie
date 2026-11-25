import React, { useState } from 'react';
import LayoutAdmin, { AvisoError } from '../../components/admin/LayoutAdmin';
import { EsqueletoCarga, EstadoVacio } from '../../components/ui/EstadosCarga';
import { SelectorSegmentado } from '../../components/ui/SelectorSegmentado';
import { BadgeEstado } from '../../components/ui/BadgeEstado';
import { Boton } from '../../components/ui/Boton';
import { CLASE_CAMPO, CLASE_ETIQUETA } from '../../components/ui/campos';
import { DialogoConfirmacion } from '../../components/ui/DialogoConfirmacion';
import { ICONOS } from '../../components/ui/iconos';
import { ZonaActualizable } from '../../components/ui/ZonaActualizable';
import { useAccion } from '../../hooks/useAccion';
import { invalidarCacheCarga, useCarga } from '../../hooks/useCarga';
import { obtenerAccesibilidad, resolverAccesibilidad } from '../../services/accesibilidad';
import type {
  SeccionAccesibilidadDTO,
  SolicitudAccesibilidadAdminDTO,
} from '../../types/accesibilidad';
import { formatearFechaCivil, formatearFechaCorta } from '../../utils/fechas';
import { plural } from '../../utils/texto';

type Vista = 'pendientes' | 'aprobadas';

const CLAVE = 'accesibilidad';
const MAX_MOTIVO = 500;
const MIN_MOTIVO = 5;

/** Dónde está hoy cada clase del alumno; las que no están en el piso 1 se resaltan. */
const ListaSecciones: React.FC<{ secciones: SeccionAccesibilidadDTO[] }> = ({ secciones }) => {
  if (secciones.length === 0) {
    return <p className="m-0 text-sm text-saie-muted">No tiene clases en el periodo vigente.</p>;
  }
  return (
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-sm">
      {secciones.map((s) => (
        <li
          key={s.seccionId}
          className={`flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 ${
            s.fueraDePiso1 ? 'bg-saie-danger-soft' : 'bg-saie-canvas'
          }`}
        >
          <span className="min-w-0">
            <strong className="font-semibold">
              {s.codigoCurso} · Sección {s.codigoSeccion}
            </strong>{' '}
            <span className="text-saie-muted">{s.nombreCurso}</span>
          </span>
          {s.sinAula ? (
            <BadgeEstado tono="advertencia">Sin aula asignada</BadgeEstado>
          ) : (
            <span className="flex flex-wrap items-center gap-2">
              <span className="tabular-nums">
                {s.espacios.map((e) => `${e.identificador} (piso ${e.piso})`).join(', ')}
              </span>
              <BadgeEstado tono={s.fueraDePiso1 ? 'peligro' : 'exito'}>
                {s.fueraDePiso1 ? 'Fuera del piso 1' : 'Piso 1'}
              </BadgeEstado>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
};

const TarjetaDeclaracion: React.FC<{
  solicitud: SolicitudAccesibilidadAdminDTO;
  onAprobar?: (s: SolicitudAccesibilidadAdminDTO) => void;
  onRechazar?: (s: SolicitudAccesibilidadAdminDTO) => void;
}> = ({ solicitud: s, onAprobar, onRechazar }) => {
  const fuera = s.secciones.filter((x) => x.fueraDePiso1).length;
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-saie-divider bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="m-0 text-base font-bold text-saie-text">{s.alumno.nombre}</h3>
          <p className="m-0 text-sm text-saie-muted">
            {s.tipo === 'DOCENTE' ? 'Docente · ' : ''}Código {s.alumno.codigo} ·{' '}
            {s.estado === 'PENDIENTE'
              ? `la envió el ${formatearFechaCorta(s.fechaSolicitud)}`
              : `aprobada el ${formatearFechaCorta(s.fechaResolucion ?? s.fechaSolicitud)}`}
          </p>
        </div>
        {s.estado === 'PENDIENTE' ? (
          <BadgeEstado tono="advertencia">Pendiente</BadgeEstado>
        ) : (
          <BadgeEstado tono={fuera > 0 ? 'peligro' : 'exito'}>
            {fuera > 0
              ? plural(fuera, 'clase fuera del piso 1', 'clases fuera del piso 1')
              : 'Todo en el piso 1'}
          </BadgeEstado>
        )}
      </div>
      {s.fechaFin && (
        <p className="m-0 text-sm text-saie-text">
          Condición temporal: hasta el {formatearFechaCivil(s.fechaFin) ?? s.fechaFin}. Ese día se
          quita la prioridad y sus clases se reasignan.
        </p>
      )}
      {s.resultado && <p className="m-0 text-sm text-saie-text">Resultado: {s.resultado}.</p>}
      <ListaSecciones secciones={s.secciones} />
      {s.estado === 'PENDIENTE' && onAprobar && onRechazar && (
        <div className="flex flex-wrap gap-2">
          <Boton tamano="sm" onClick={() => onAprobar(s)}>
            Aprobar
          </Boton>
          <Boton variante="cancelar" tamano="sm" onClick={() => onRechazar(s)}>
            Rechazar
          </Boton>
        </div>
      )}
    </li>
  );
};

/**
 * Accesibilidad (Issue 3.60, riesgos R12 a R14). La declaración «no puedo subir a pisos
 * superiores» que el alumno marca en su perfil no se aplica hasta que Coordinación la aprueba. Al
 * aprobarla se reasignan sus clases; aquí se ve dónde quedó cada una, con las que siguen fuera del
 * piso 1 resaltadas. No se piden diagnósticos: es un requisito de acceso al espacio.
 */
export const AccesibilidadAdminPage: React.FC = () => {
  const [vista, setVista] = useState<Vista>('pendientes');
  const [aprobando, setAprobando] = useState<SolicitudAccesibilidadAdminDTO | null>(null);
  const [rechazando, setRechazando] = useState<SolicitudAccesibilidadAdminDTO | null>(null);
  const [motivo, setMotivo] = useState('');
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null);
  const accion = useAccion();
  const { datos, cargando, error, recargar } = useCarga(obtenerAccesibilidad, { clave: CLAVE });

  const pendientes = datos?.pendientes ?? [];
  const aprobadas = datos?.aprobadas ?? [];
  const lista = vista === 'pendientes' ? pendientes : aprobadas;

  function terminar() {
    invalidarCacheCarga(CLAVE);
    recargar();
  }

  async function confirmarAprobacion() {
    if (!aprobando) return;
    const resultado = await accion.ejecutar(
      () => resolverAccesibilidad(aprobando.id, { decision: 'APROBAR' }),
      { exito: (r) => `Aprobada. ${r.resultado ?? 'Sus clases se reasignaron'}.` },
    );
    if (resultado?.ok) {
      setAprobando(null);
      terminar();
    }
  }

  function abrirRechazo(s: SolicitudAccesibilidadAdminDTO) {
    setRechazando(s);
    setMotivo('');
    setErrorMotivo(null);
  }

  async function confirmarRechazo() {
    if (!rechazando) return;
    const texto = motivo.trim();
    if (texto.length < MIN_MOTIVO) {
      setErrorMotivo('Escribe el motivo del rechazo (al menos 5 caracteres): el alumno lo verá.');
      return;
    }
    const resultado = await accion.ejecutar(
      () => resolverAccesibilidad(rechazando.id, { decision: 'RECHAZAR', motivo: texto }),
      { exito: `Declaración de ${rechazando.alumno.nombre} rechazada.` },
    );
    if (resultado?.ok) {
      setRechazando(null);
      terminar();
    }
  }

  return (
    <LayoutAdmin
      titulo="Accesibilidad"
      subtitulo={
        datos?.periodo
          ? `Alumnos que pidieron aulas en el piso 1 · periodo ${datos.periodo}`
          : 'Alumnos que pidieron aulas en el piso 1'
      }
      acciones={
        <Boton
          variante="secundario"
          onClick={recargar}
          cargando={cargando}
          textoCargando="Actualizando…"
        >
          Actualizar datos
        </Boton>
      }
    >
      <SelectorSegmentado
        opciones={[
          { valor: 'pendientes', etiqueta: `Pendientes (${pendientes.length})` },
          { valor: 'aprobadas', etiqueta: `Aprobadas (${aprobadas.length})` },
        ]}
        valor={vista}
        onCambiar={setVista}
        etiquetaGrupo="Estado de las declaraciones"
        className="self-start"
      />

      {error && <AvisoError mensaje={error} onReintentar={recargar} />}
      <ZonaActualizable actualizando={cargando && datos !== null}>
        {cargando && !datos ? (
          <EsqueletoCarga texto="Cargando declaraciones…" />
        ) : !datos ? null : lista.length === 0 ? (
          <EstadoVacio
            titulo={
              vista === 'pendientes'
                ? 'No hay declaraciones pendientes'
                : 'Nadie tiene aprobada la prioridad del piso 1'
            }
            icono={ICONOS.usuarioRelleno}
            descripcion={
              vista === 'pendientes'
                ? 'Cuando un alumno marque en su perfil que no puede subir a pisos superiores, aparecerá aquí.'
                : 'Las declaraciones que apruebes aparecerán aquí con el piso de cada clase.'
            }
          />
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {lista.map((s) => (
              <TarjetaDeclaracion
                key={s.id}
                solicitud={s}
                onAprobar={setAprobando}
                onRechazar={abrirRechazo}
              />
            ))}
          </ul>
        )}
      </ZonaActualizable>

      <DialogoConfirmacion
        abierto={aprobando !== null}
        titulo={`¿Aprobar la declaración de ${aprobando?.alumno.nombre ?? ''}?`}
        descripcion="El sistema marcará la prioridad del piso 1 en todas sus matrículas y reasignará sus clases ahora. Si alguna no consigue el piso 1, quedará una alerta de accesibilidad."
        textoConfirmar="Sí, aprobar y reasignar"
        cargando={accion.cargando}
        textoCargando="Reasignando sus clases…"
        onConfirmar={confirmarAprobacion}
        onCancelar={() => setAprobando(null)}
      />

      <DialogoConfirmacion
        abierto={rechazando !== null}
        titulo={`¿Rechazar la declaración de ${rechazando?.alumno.nombre ?? ''}?`}
        variante="peligro"
        descripcion={
          <span className="flex flex-col gap-2">
            <label htmlFor="motivo-rechazo-accesibilidad" className={CLASE_ETIQUETA}>
              Motivo del rechazo (obligatorio, el alumno lo verá)
            </label>
            <textarea
              id="motivo-rechazo-accesibilidad"
              value={motivo}
              maxLength={MAX_MOTIVO}
              rows={3}
              onChange={(e) => {
                setMotivo(e.target.value);
                setErrorMotivo(null);
              }}
              aria-invalid={errorMotivo ? true : undefined}
              aria-describedby={errorMotivo ? 'error-motivo-accesibilidad' : undefined}
              className={`${CLASE_CAMPO} py-2`}
            />
            {errorMotivo && (
              <span
                id="error-motivo-accesibilidad"
                role="alert"
                className="text-sm text-saie-danger-strong"
              >
                {errorMotivo}
              </span>
            )}
          </span>
        }
        textoConfirmar="Rechazar la declaración"
        cargando={accion.cargando}
        textoCargando="Rechazando…"
        onConfirmar={confirmarRechazo}
        onCancelar={() => setRechazando(null)}
      />
    </LayoutAdmin>
  );
};

export default AccesibilidadAdminPage;

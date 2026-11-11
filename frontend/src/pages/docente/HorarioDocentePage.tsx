import React, { useEffect, useMemo, useState } from 'react';
import PaginaDocente from '../../components/docente/PaginaDocente';
import GridHorarioSemanal from '../../components/estudiante/GridHorarioSemanal';
import HorarioDia from '../../components/estudiante/HorarioDia';
import SelectorSegmentado from '../../components/ui/SelectorSegmentado';
import type { OpcionSegmentada } from '../../components/ui/SelectorSegmentado';
import { EsqueletoCarga, EstadoVacio } from '../../components/estudiante/ElementosHorario';
import { idPanelPestana, idPestana } from '../../components/ui/idsPestanas';
import { EstadoError } from '../../components/ui/EstadoError';
import { ICONOS } from '../../components/ui/iconos';
import { useCarga } from '../../hooks/useCarga';
import { CLAVE_HORARIO_DOCENTE, obtenerHorarioDocente } from '../../services/docente';
import type { DiaSemana } from '../../types/consulta';
import type { AsignacionActivaDocenteDTO } from '../../types/docente';
import type { VistaHorario } from '../../types/horario';
import { formatearBloqueHorario } from '../../utils/etiquetas';
import { etiquetaTipoEspacio } from '../../utils/diccionarios';
import { ubicacionEspacio } from '../../utils/docente';
import {
  asignarColoresCursos,
  diaDeFecha,
  diaLectivoInicial,
  fechaActual,
  minutosDeFecha,
  todasLasSesiones,
} from '../../utils/horario';
import { plural } from '../../utils/texto';

type SeccionPantalla = 'horario' | 'asignaciones';

const OPCIONES_SECCION: OpcionSegmentada<SeccionPantalla>[] = [
  { valor: 'horario', etiqueta: 'Horario' },
  { valor: 'asignaciones', etiqueta: 'Asignaciones' },
];

const OPCIONES_VISTA: OpcionSegmentada<VistaHorario>[] = [
  { valor: 'dia', etiqueta: 'Día' },
  { valor: 'semana', etiqueta: 'Semana' },
];

const UN_MINUTO_MS = 60_000;

/** Una sección activa del docente: curso, horarios (uno por línea), espacios y alumnos. */
const TarjetaAsignacion: React.FC<{ a: AsignacionActivaDocenteDTO }> = ({ a }) => (
  <li className="flex flex-col gap-3 rounded-xl border border-saie-divider bg-white p-4">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <h3 className="m-0 text-base font-bold">
          {a.codigoCurso} · Sección {a.codigoSeccion}
        </h3>
        <p className="m-0 text-sm text-saie-muted">{a.nombreCurso}</p>
      </div>
      <span className="rounded-full bg-saie-canvas px-2.5 py-1 text-sm font-semibold tabular-nums">
        {plural(a.numeroAlumnos, 'alumno', 'alumnos')}
      </span>
    </div>
    <dl className="m-0 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-xs font-semibold text-saie-muted">Horario</dt>
        <dd className="m-0">
          {a.horarios.length === 0 ? (
            'Sin horarios registrados.'
          ) : (
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0 tabular-nums">
              {a.horarios.map((h) => (
                <li key={`${h.diaSemana}-${h.horaInicio}`}>{formatearBloqueHorario(h, false)}</li>
              ))}
            </ul>
          )}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-semibold text-saie-muted">
          {a.espacios.length > 1 ? 'Espacios' : 'Espacio'}
        </dt>
        <dd className="m-0">
          {a.espacios.length === 0 ? (
            'Por asignar'
          ) : (
            <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
              {a.espacios.map((e) => (
                <li key={e.id}>
                  <strong className="font-semibold">
                    {etiquetaTipoEspacio(e.tipo)} {e.identificador}
                  </strong>
                  <span className="text-saie-muted"> · {ubicacionEspacio(e)}</span>
                </li>
              ))}
            </ul>
          )}
        </dd>
      </div>
    </dl>
  </li>
);

/**
 * Horario y asignaciones del docente (Issue 7.8), conectado a GET /docente/horario (Issue 7.12).
 * Reutiliza las vistas de día y semana del portal del alumno: el contrato de sesión es el mismo.
 */
export const HorarioDocentePage: React.FC<{ ahora?: Date }> = ({ ahora }) => {
  const { datos, cargando, error, recargar } = useCarga(obtenerHorarioDocente, {
    clave: CLAVE_HORARIO_DOCENTE,
  });
  const [referencia, setReferencia] = useState<Date>(ahora ?? fechaActual);
  const [seccion, setSeccion] = useState<SeccionPantalla>('horario');
  const [vista, setVista] = useState<VistaHorario>('dia');
  const [dia, setDia] = useState<DiaSemana>(() => diaLectivoInicial(referencia));

  useEffect(() => {
    if (ahora) return undefined;
    const temporizador = setInterval(() => setReferencia(fechaActual()), UN_MINUTO_MS);
    return () => clearInterval(temporizador);
  }, [ahora]);

  const colores = useMemo(
    () => (datos ? asignarColoresCursos(todasLasSesiones(datos).map((s) => s.codigoCurso)) : {}),
    [datos],
  );

  const renderCuerpo = (): React.ReactNode => {
    if (cargando && !datos) return <EsqueletoCarga texto="Cargando tu horario…" />;
    if (error) {
      return (
        <EstadoError mensaje={`No pudimos cargar tu horario. ${error}`} onReintentar={recargar} />
      );
    }
    if (!datos) return null;

    if (seccion === 'asignaciones') {
      return datos.asignacionesActivas.length === 0 ? (
        <EstadoVacio
          titulo="No tienes secciones con aula asignada"
          icono={ICONOS.libro}
          descripcion="Cuando Coordinación asigne aulas a tus secciones del periodo, aparecerán aquí."
        />
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {datos.asignacionesActivas.map((a) => (
            <TarjetaAsignacion key={a.asignacionId} a={a} />
          ))}
        </ul>
      );
    }

    if (todasLasSesiones(datos).length === 0) {
      return (
        <EstadoVacio
          titulo="Aún no tienes clases programadas"
          descripcion="Tu horario aparecerá aquí cuando tus secciones tengan horario y aula."
        />
      );
    }

    return (
      <div className="flex flex-col gap-5">
        <SelectorSegmentado
          opciones={OPCIONES_VISTA}
          valor={vista}
          onCambiar={setVista}
          etiquetaGrupo="Tipo de vista del horario"
          className="self-start"
        />
        {vista === 'dia' ? (
          <HorarioDia
            horario={datos}
            colores={colores}
            dia={dia}
            onCambiarDia={setDia}
            hoy={diaDeFecha(referencia)}
            ahoraEnMinutos={minutosDeFecha(referencia)}
          />
        ) : (
          <GridHorarioSemanal horario={datos} colores={colores} hoy={diaDeFecha(referencia)} />
        )}
      </div>
    );
  };

  return (
    <PaginaDocente
      titulo="Mi horario y asignaciones"
      descripcion={datos?.periodo ? `Periodo ${datos.periodo}` : undefined}
    >
      <SelectorSegmentado
        opciones={OPCIONES_SECCION}
        valor={seccion}
        onCambiar={setSeccion}
        etiquetaGrupo="Secciones de la pantalla"
        idBase="horario-docente"
        className="self-start"
      />
      <section
        role="tabpanel"
        id={idPanelPestana('horario-docente', seccion)}
        aria-labelledby={idPestana('horario-docente', seccion)}
      >
        <h2 className="sr-only">{seccion === 'horario' ? 'Mi horario' : 'Mis asignaciones'}</h2>
        {renderCuerpo()}
      </section>
    </PaginaDocente>
  );
};

export default HorarioDocentePage;

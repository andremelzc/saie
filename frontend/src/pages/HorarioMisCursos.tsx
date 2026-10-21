import React, { useEffect, useMemo, useState } from 'react';
import CabeceraPantalla from '../components/estudiante/CabeceraPantalla';
import { EstadoError } from '../components/ui/EstadoError';
import { Contenedor } from '../components/ui/Contenedor';
import { ID_CONTENIDO } from '../components/ui/EnlaceSaltar';
import { EsqueletoCarga, EstadoVacio } from '../components/estudiante/ElementosHorario';
import GridHorarioSemanal from '../components/estudiante/GridHorarioSemanal';
import HorarioDia from '../components/estudiante/HorarioDia';
import ListaMisCursos from '../components/estudiante/ListaMisCursos';
import SelectorSegmentado from '../components/estudiante/SelectorSegmentado';
import type { OpcionSegmentada } from '../components/estudiante/SelectorSegmentado';
import type { DiaSemana } from '../types/consulta';
import type { CursoMatriculadoDTO, HorarioSemanalDTO, VistaHorario } from '../types/horario';
import { ICONOS } from '../components/ui/iconos';
import {
  asignarColoresCursos,
  diaDeFecha,
  diaLectivoInicial,
  fechaActual,
  minutosDeFecha,
  todasLasSesiones,
} from '../utils/horario';

type SeccionPantalla = 'horario' | 'cursos';

/** Horario sin clases: se usa solo mientras llegan los datos reales del backend. */
const HORARIO_VACIO: HorarioSemanalDTO = { periodo: null, vista: 'semana', dias: {} };
const SIN_CURSOS: CursoMatriculadoDTO[] = [];

const OPCIONES_SECCION: OpcionSegmentada<SeccionPantalla>[] = [
  { valor: 'horario', etiqueta: 'Horario' },
  { valor: 'cursos', etiqueta: 'Mis cursos' },
];

const OPCIONES_VISTA: OpcionSegmentada<VistaHorario>[] = [
  { valor: 'dia', etiqueta: 'Día' },
  { valor: 'semana', etiqueta: 'Semana' },
];

const TRAZO_CALENDARIO = ICONOS.calendario;
const UN_MINUTO_MS = 60_000;

export interface HorarioMisCursosProps {
  /** Horario del alumno (GET /v1/estudiante/horario). Sin datos, se muestra vacío. */
  horario?: HorarioSemanalDTO;
  /** Cursos matriculados del periodo (GET /v1/estudiante/cursos). */
  cursos?: CursoMatriculadoDTO[];
  /** Fecha de referencia fija (útil en pruebas). Si no se indica, se usa la hora actual. */
  ahora?: Date;
  cargando?: boolean;
  /** Mensaje de error de carga; muestra el botón «Reintentar» si hay `onReintentar`. */
  error?: string | null;
  onReintentar?: () => void;
}

/**
 * Pantalla «Mi horario y mis cursos» del alumno (Issue 3.16 / #145): horario alternable entre
 * día y semana, y lista de cursos matriculados con docente, horarios y próximo espacio.
 */
export const HorarioMisCursos: React.FC<HorarioMisCursosProps> = ({
  horario = HORARIO_VACIO,
  cursos = SIN_CURSOS,
  ahora,
  cargando = false,
  error = null,
  onReintentar,
}) => {
  const [referencia, setReferencia] = useState<Date>(ahora ?? fechaActual);
  const [seccion, setSeccion] = useState<SeccionPantalla>('horario');
  const [vista, setVista] = useState<VistaHorario>('dia');
  const [dia, setDia] = useState<DiaSemana>(() => diaLectivoInicial(referencia));

  // Mantiene al día los estados «En curso / Próxima» (solo si no hay una fecha fija).
  useEffect(() => {
    if (ahora) return undefined;
    const temporizador = setInterval(() => setReferencia(fechaActual()), UN_MINUTO_MS);
    return () => clearInterval(temporizador);
  }, [ahora]);

  const colores = useMemo(
    () =>
      asignarColoresCursos([
        ...todasLasSesiones(horario).map((s) => s.codigoCurso),
        ...cursos.map((c) => c.codigoCurso),
      ]),
    [horario, cursos],
  );

  const hoy = diaDeFecha(referencia);
  const ahoraEnMinutos = minutosDeFecha(referencia);
  const hayHorario = todasLasSesiones(horario).length > 0;

  const renderCuerpo = (): React.ReactNode => {
    if (cargando) return <EsqueletoCarga />;

    if (error) {
      return (
        <EstadoError
          mensaje={`No pudimos cargar tu información. ${error}`}
          onReintentar={onReintentar}
        />
      );
    }

    if (seccion === 'cursos') {
      return cursos.length === 0 ? (
        <EstadoVacio
          titulo="Aún no tienes cursos matriculados"
          descripcion="Cuando tu matrícula del periodo esté registrada, tus cursos aparecerán aquí."
        />
      ) : (
        <ListaMisCursos cursos={cursos} colores={colores} />
      );
    }

    if (!hayHorario) {
      return (
        <EstadoVacio
          titulo="Aún no tienes clases programadas"
          descripcion="Tu horario aparecerá aquí cuando se asignen los espacios de tus cursos."
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
            horario={horario}
            colores={colores}
            dia={dia}
            onCambiarDia={setDia}
            hoy={hoy}
            ahoraEnMinutos={ahoraEnMinutos}
          />
        ) : (
          <GridHorarioSemanal horario={horario} colores={colores} hoy={hoy} />
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-saie-canvas text-saie-text">
      <CabeceraPantalla
        titulo="Mi horario y mis cursos"
        subtitulo={horario.periodo ? `Periodo ${horario.periodo}` : 'Periodo académico sin definir'}
        trazoIcono={TRAZO_CALENDARIO}
      />

      <Contenedor
        como="main"
        ancho="normal"
        id={ID_CONTENIDO}
        tabIndex={-1}
        className="flex flex-col gap-5 py-6 focus:outline-none"
      >
        <SelectorSegmentado
          opciones={OPCIONES_SECCION}
          valor={seccion}
          onCambiar={setSeccion}
          etiquetaGrupo="Secciones de la pantalla"
          className="self-start"
        />
        <section aria-labelledby="titulo-seccion">
          <h2 id="titulo-seccion" className="sr-only">
            {seccion === 'horario' ? 'Mi horario' : 'Mis cursos matriculados'}
          </h2>
          <div key={seccion} className="saie-fundido">
            {renderCuerpo()}
          </div>
        </section>
      </Contenedor>
    </div>
  );
};

export default HorarioMisCursos;

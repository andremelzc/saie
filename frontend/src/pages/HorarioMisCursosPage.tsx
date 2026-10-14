import React, { useMemo } from 'react';
import { useCarga } from '../hooks/useCarga';
import { obtenerCursos, obtenerHorario } from '../services/estudiante';
import type { CursoMatriculadoDTO, HorarioSemanalDTO } from '../types/horario';
import HorarioMisCursos from './HorarioMisCursos';

interface DatosHorario {
  horario: HorarioSemanalDTO;
  cursos: CursoMatriculadoDTO[];
}

async function cargarHorarioYCursos(): Promise<DatosHorario> {
  const [horario, cursos] = await Promise.all([obtenerHorario(), obtenerCursos()]);
  return { horario, cursos: cursos.cursos };
}

/**
 * Ruta «Mi horario y mis cursos»: trae el horario (3.10) y los cursos (3.11) del alumno
 * autenticado desde la base de datos y se los pasa a la pantalla. Sin datos inventados.
 */
export const HorarioMisCursosPage: React.FC = () => {
  const { datos, cargando, error, recargar } = useCarga(cargarHorarioYCursos);
  const horario = useMemo(() => datos?.horario, [datos]);
  const cursos = useMemo(() => datos?.cursos, [datos]);

  return (
    <HorarioMisCursos
      horario={horario}
      cursos={cursos}
      cargando={cargando}
      error={error}
      onReintentar={recargar}
    />
  );
};

export default HorarioMisCursosPage;

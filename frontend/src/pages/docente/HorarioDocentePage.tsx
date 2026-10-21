import React from 'react';
import PantallaEnDesarrollo from '../../components/PantallaEnDesarrollo';
import { RUTAS } from '../../config/rutas';

/** Horario y asignaciones del docente (Issue 7.8). El backend ya expone los endpoints. */
export const HorarioDocentePage: React.FC = () => (
  <PantallaEnDesarrollo
    portal="Docente"
    titulo="Mi horario y asignaciones"
    descripcion="Consulta los cursos y secciones que tienes a cargo, con el aula o laboratorio asignado para cada clase."
    funciones={[
      'Horario semanal con curso, sección, aula y laboratorio.',
      'Detalle del espacio asignado: capacidad, piso y equipamiento.',
      'Cambios de aula o laboratorio notificados por Telegram.',
    ]}
    volverA={{ to: RUTAS.inicioDocente, etiqueta: 'Volver al portal' }}
  />
);

export default HorarioDocentePage;

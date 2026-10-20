import React from 'react';
import PantallaEnDesarrollo from '../../components/PantallaEnDesarrollo';
import { RUTAS } from '../../config/rutas';

/** Reporte de incidencias desde el portal docente (Issue 7.10). */
export const IncidenciasDocentePage: React.FC = () => (
  <PantallaEnDesarrollo
    portal="Docente"
    titulo="Reportar una incidencia"
    descripcion="Informa una falla de equipos o del espacio y sigue su atención por Jefatura de Laboratorios."
    funciones={[
      'Registro de la incidencia con el espacio y el equipo afectado.',
      'Seguimiento del estado: pendiente, en revisión o resuelta.',
      'Aviso a Jefatura de Laboratorios para su atención.',
    ]}
    volverA={{ to: RUTAS.inicioDocente, etiqueta: 'Volver al portal' }}
    issue="#207 (7.10)"
  />
);

export default IncidenciasDocentePage;

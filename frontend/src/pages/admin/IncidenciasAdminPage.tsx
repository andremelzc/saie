import React from 'react';
import LayoutAdmin from '../../components/admin/LayoutAdmin';
import { AvisoEnDesarrollo } from '../../components/PantallaEnDesarrollo';

/** Revisión de incidencias reportadas por los docentes (Issue 7.11). */
export const IncidenciasAdminPage: React.FC = () => (
  <LayoutAdmin titulo="Revisión de incidencias" subtitulo="Jefatura de Laboratorios">
    <AvisoEnDesarrollo
      descripcion="Atiende las incidencias que reportan los docentes sobre equipos y espacios de tus laboratorios."
      funciones={[
        'Bandeja de incidencias pendientes con el equipo y el espacio afectado.',
        'Cambio de estado: en revisión, resuelta o descartada.',
        'Registro del responsable y de la solución aplicada.',
      ]}
      issue="#208 (7.11)"
    />
  </LayoutAdmin>
);

export default IncidenciasAdminPage;

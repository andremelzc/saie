import React from 'react';
import LayoutAdmin from '../../components/admin/LayoutAdmin';
import { AvisoEnDesarrollo } from '../../components/PantallaEnDesarrollo';

/** Solicitudes de software enviadas por los docentes (Issue 4.29). */
export const SolicitudesSoftwareAdminPage: React.FC = () => (
  <LayoutAdmin titulo="Solicitudes de software" subtitulo="Coordinación Académica">
    <AvisoEnDesarrollo
      descripcion="Revisa las solicitudes de software que envían los docentes y aprueba o rechaza su instalación en un laboratorio."
      funciones={[
        'Bandeja de solicitudes pendientes con el curso y el laboratorio.',
        'Aprobación o rechazo con motivo registrado.',
        'Aviso al docente cuando su solicitud cambia de estado.',
      ]}
      issue="#275 (4.29)"
    />
  </LayoutAdmin>
);

export default SolicitudesSoftwareAdminPage;

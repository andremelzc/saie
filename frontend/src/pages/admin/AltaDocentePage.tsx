import React from 'react';
import LayoutAdmin from '../../components/admin/LayoutAdmin';
import { AvisoEnDesarrollo } from '../../components/PantallaEnDesarrollo';

/** Alta individual de docentes (Issue 4.18). */
export const AltaDocentePage: React.FC = () => (
  <LayoutAdmin titulo="Alta de docentes" subtitulo="Coordinación Académica">
    <AvisoEnDesarrollo
      descripcion="Registra a un docente y habilita su acceso al portal para que consulte su horario y reporte incidencias."
      funciones={[
        'Formulario con los datos personales y el correo institucional.',
        'Creación de la cuenta de acceso al portal docente.',
        'Asociación de los cursos y secciones que tiene a cargo.',
      ]}
    />
  </LayoutAdmin>
);

export default AltaDocentePage;

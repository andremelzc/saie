import React from 'react';
import LayoutAdmin from '../../components/admin/LayoutAdmin';
import { AvisoEnDesarrollo } from '../../components/PantallaEnDesarrollo';

/** Alta individual de alumnos (Issue 4.17). */
export const AltaAlumnoPage: React.FC = () => (
  <LayoutAdmin titulo="Alta de alumnos" subtitulo="Coordinación Académica">
    <AvisoEnDesarrollo
      descripcion="Registra a un alumno de forma individual cuando no venga incluido en la carga masiva de matrículas."
      funciones={[
        'Formulario con los datos personales y académicos del alumno.',
        'Validación de código de matrícula y correo institucional.',
        'Asignación del alumno a sus secciones del periodo.',
      ]}
    />
  </LayoutAdmin>
);

export default AltaAlumnoPage;

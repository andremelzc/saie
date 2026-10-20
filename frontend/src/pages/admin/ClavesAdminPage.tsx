import React from 'react';
import LayoutAdmin from '../../components/admin/LayoutAdmin';
import { AvisoEnDesarrollo } from '../../components/PantallaEnDesarrollo';

/** Cambio y restablecimiento de contraseñas (Issues 4.21 y 4.26). */
export const ClavesAdminPage: React.FC = () => (
  <LayoutAdmin titulo="Claves y contraseñas" subtitulo="Coordinación Académica">
    <AvisoEnDesarrollo
      descripcion="Gestiona el cambio de contraseña de tu cuenta y restablece la clave de alumnos o docentes que la hayan olvidado."
      funciones={[
        'Cambio de contraseña con validación de la clave actual.',
        'Restablecimiento de la clave de un alumno o docente.',
        'Aviso al usuario para que defina una nueva contraseña.',
      ]}
    />
  </LayoutAdmin>
);

export default ClavesAdminPage;

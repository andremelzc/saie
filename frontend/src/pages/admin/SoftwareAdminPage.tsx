import React from 'react';
import LayoutAdmin from '../../components/admin/LayoutAdmin';
import { AvisoEnDesarrollo } from '../../components/PantallaEnDesarrollo';

/** Catálogo de software de la facultad (Issue 4.30). */
export const SoftwareAdminPage: React.FC = () => (
  <LayoutAdmin titulo="Catálogo de software" subtitulo="Coordinación Académica">
    <AvisoEnDesarrollo
      descripcion="Administra el software que ofrece la facultad y asígnalo a los laboratorios donde esté instalado."
      funciones={[
        'Alta, edición y baja lógica del software del catálogo.',
        'Asociación del software a uno o más laboratorios.',
        'Control de vigencia de licencias y versiones.',
      ]}
      issue="#276 (4.30)"
    />
  </LayoutAdmin>
);

export default SoftwareAdminPage;

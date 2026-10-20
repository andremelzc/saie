import React from 'react';
import LayoutAdmin from '../../components/admin/LayoutAdmin';
import { AvisoEnDesarrollo } from '../../components/PantallaEnDesarrollo';

/** Panel de inicio y listado de laboratorios (Issue 4.16). */
export const LaboratoriosAdminPage: React.FC = () => (
  <LayoutAdmin titulo="Laboratorios y equipos" subtitulo="Coordinación Académica">
    <AvisoEnDesarrollo
      descripcion="Revisa el estado de cada laboratorio: equipos operativos, PCs malogradas y software instalado."
      funciones={[
        'Listado de laboratorios con su aforo y equipamiento.',
        'Conteo de PCs operativas y malogradas por laboratorio.',
        'Matriz de software instalado y su vigencia.',
      ]}
      issue="#167 (4.16)"
    />
  </LayoutAdmin>
);

export default LaboratoriosAdminPage;

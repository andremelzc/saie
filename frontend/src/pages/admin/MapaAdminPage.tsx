import React from 'react';
import LayoutAdmin from '../../components/admin/LayoutAdmin';
import { AvisoEnDesarrollo } from '../../components/PantallaEnDesarrollo';

/** Mapa visual de ocupación por piso para Coordinación (Issues 4.13 y 4.14). */
export const MapaAdminPage: React.FC = () => (
  <LayoutAdmin titulo="Mapa de ocupación por piso" subtitulo="Coordinación Académica">
    <AvisoEnDesarrollo
      descripcion="Visualiza en el plano de cada pabellón qué aulas y laboratorios están ocupados en la franja horaria que elijas."
      funciones={[
        'Planos SVG por piso con el estado de cada espacio.',
        'Filtro por pabellón, piso, tipo de espacio y franja horaria.',
        'Acceso al detalle del espacio y a la sección que lo ocupa.',
      ]}
      issue="#164, #165 (4.13 y 4.14)"
    />
  </LayoutAdmin>
);

export default MapaAdminPage;

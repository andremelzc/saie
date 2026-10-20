import React from 'react';
import PantallaEnDesarrollo from '../../components/PantallaEnDesarrollo';
import { RUTAS } from '../../config/rutas';

/** Explorador de espacios y equipos para el docente (Issue 7.9). */
export const EspaciosDocentePage: React.FC = () => (
  <PantallaEnDesarrollo
    portal="Docente"
    titulo="Explorar espacios y equipos"
    descripcion="Busca aulas y laboratorios disponibles y revisa el estado de sus equipos antes de tu clase."
    funciones={[
      'Búsqueda de espacios libres por piso, tipo y franja horaria.',
      'Estado de las PCs y del software instalado en cada laboratorio.',
      'Aforo real y condiciones del aula o laboratorio.',
    ]}
    volverA={{ to: RUTAS.inicioDocente, etiqueta: 'Volver al portal' }}
    issue="#206 (7.9)"
  />
);

export default EspaciosDocentePage;

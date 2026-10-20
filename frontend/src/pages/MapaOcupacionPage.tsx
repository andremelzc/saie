import React from 'react';
import PantallaEnDesarrollo from '../components/PantallaEnDesarrollo';
import { RUTAS } from '../config/rutas';

/**
 * Mapa de ocupación del alumno (Issues 3.18 y 3.20). Todavía no está construido: el backend ya
 * expone `GET /api/v1/estudiante/mapa-ocupacion`, pero faltan los planos SVG interactivos (Issue
 * 6.10) y el componente de mapa. Mientras tanto se comunica que está en camino.
 */
export const MapaOcupacionPage: React.FC = () => (
  <PantallaEnDesarrollo
    titulo="Mapa de ocupación"
    descripcion="Ubica tus aulas y laboratorios en el plano de cada pabellón y consulta qué espacios están ocupados en el horario de tus clases."
    funciones={[
      'Mapa interactivo por piso y pabellón (aulas teóricas y laboratorios).',
      'Ocupación de cada espacio en la franja de tu clase.',
      'Detalle del espacio asignado y su aforo real.',
    ]}
    volverA={{ to: RUTAS.inicioAlumno, etiqueta: 'Volver al inicio' }}
    issue="#147 (3.18)"
  />
);

export default MapaOcupacionPage;

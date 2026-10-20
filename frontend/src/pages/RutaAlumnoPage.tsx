import React from 'react';
import PantallaEnDesarrollo from '../components/PantallaEnDesarrollo';
import { RUTAS } from '../config/rutas';

/**
 * Pantalla de ruta hacia el espacio asignado (Issues 3.19 y 3.20). El backend ya calcula la ruta
 * de referencia (`GET /api/v1/estudiante/ruta/:asignacionId`); falta la vista que la dibuja sobre
 * el plano. Mientras tanto se comunica que está en camino.
 */
export const RutaAlumnoPage: React.FC = () => (
  <PantallaEnDesarrollo
    titulo="Ruta hacia mi aula"
    descripcion="Sigue el recorrido desde el ingreso del pabellón hasta tu aula o laboratorio, con el tiempo estimado y las alternativas accesibles."
    funciones={[
      'Recorrido por piso desde la entrada del pabellón hasta el espacio.',
      'Tiempo estimado de caminata y distancia.',
      'Ruta accesible (ascensor y rampas) cuando la necesites.',
    ]}
    volverA={{ to: RUTAS.inicioAlumno, etiqueta: 'Volver al inicio' }}
    issue="#148 (3.19)"
  />
);

export default RutaAlumnoPage;

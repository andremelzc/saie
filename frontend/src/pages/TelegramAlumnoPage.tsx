import React from 'react';
import PantallaEnDesarrollo from '../components/PantallaEnDesarrollo';
import { RUTAS } from '../config/rutas';

/**
 * Avisos por Telegram para el alumno (Issue 3.28). El backend ya vincula el chat y emite el aviso
 * de cambio de aula; falta la pantalla para vincular/desvincular la cuenta desde el perfil.
 */
export const TelegramAlumnoPage: React.FC = () => (
  <PantallaEnDesarrollo
    titulo="Avisos por Telegram"
    descripcion="Vincula tu cuenta de Telegram para recibir el aviso cuando una de tus clases cambie de aula o laboratorio."
    funciones={[
      'Vincular y desvincular tu chat de Telegram desde tu perfil.',
      'Aviso inmediato cuando cambia el aula o el laboratorio de tu clase.',
      'Historial de los avisos que recibiste.',
    ]}
    volverA={{ to: RUTAS.perfilAlumno, etiqueta: 'Volver a mi perfil' }}
  />
);

export default TelegramAlumnoPage;

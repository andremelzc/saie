import React from 'react';
import { useCarga } from '../hooks/useCarga';
import { guardarPerfil, obtenerPerfil } from '../services/estudiante';
import PerfilAlumno from './PerfilAlumno';

/**
 * Ruta «Mi perfil»: lee el perfil real del alumno autenticado (GET /v1/estudiante/perfil) y
 * guarda los cambios en la base de datos (PATCH). Sin datos inventados.
 */
export const PerfilAlumnoPage: React.FC = () => {
  const { datos, cargando, error, recargar } = useCarga(obtenerPerfil);

  return (
    <PerfilAlumno
      perfil={datos}
      cargando={cargando}
      error={error}
      onReintentar={recargar}
      onGuardar={guardarPerfil}
    />
  );
};

export default PerfilAlumnoPage;

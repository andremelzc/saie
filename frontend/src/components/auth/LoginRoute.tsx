import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { rutaDestinoTrasLogin } from '../../config/rutas';
import { MENSAJE_SESION_VENCIDA } from '../../services/sesion';
import type { LoginResponseDTO } from '../../types/auth';
import LoginAlumno from '../../pages/LoginAlumno';
import LoginDocente from '../../pages/LoginDocente';
import LoginAdmin from '../../pages/LoginAdmin';

export interface LoginRouteProps {
  rol: 'ALUMNO' | 'DOCENTE' | 'ADMIN';
}

/**
 * Conecta cada pantalla de login con la sesión: guarda el token al ingresar, muestra el aviso
 * de "sesión vencida" si corresponde y redirige a quien ya tiene sesión.
 * Tras iniciar sesión redirige al cambio de clave (Issue 4.21) o al área del rol.
 */
export const LoginRoute: React.FC<LoginRouteProps> = ({ rol }) => {
  const { sesion, iniciarSesion } = useAuth();
  const location = useLocation();

  const motivo = (location.state as { motivo?: string } | null)?.motivo;
  const avisoSesion = motivo === 'vencida' ? MENSAJE_SESION_VENCIDA : undefined;

  if (sesion) {
    return <Navigate to={rutaDestinoTrasLogin(sesion)} replace />;
  }

  // Al guardar la sesión, el componente se vuelve a renderizar y el <Navigate> de arriba redirige.
  const alIngresar = (resultado: LoginResponseDTO) => {
    iniciarSesion(resultado);
  };

  if (rol === 'DOCENTE') {
    return <LoginDocente onLoginExitoso={alIngresar} avisoSesion={avisoSesion} />;
  }
  if (rol === 'ADMIN') {
    return <LoginAdmin onLoginExitoso={alIngresar} avisoSesion={avisoSesion} />;
  }
  return <LoginAlumno onLoginExitoso={alIngresar} avisoSesion={avisoSesion} />;
};

export default LoginRoute;

import React from 'react';
import LoginFormBase from '../components/auth/LoginFormBase';
import LoginLayout from '../components/auth/LoginLayout';
import type { LoginResponseDTO } from '../types/auth';

export interface LoginAlumnoProps {
  onLoginExitoso?: (resultado: LoginResponseDTO) => void;
  avisoSesion?: string;
  className?: string;
}

export const LoginAlumno: React.FC<LoginAlumnoProps> = ({
  onLoginExitoso,
  avisoSesion,
  className = '',
}) => {
  return (
    <LoginLayout
      portal="estudiante"
      ariaLabel="Página de inicio de sesión de estudiante"
      className={className}
    >
      <LoginFormBase
        rol="ALUMNO"
        titulo="Portal del Estudiante"
        subtitulo="Consulta tu horario y la ubicación de tus aulas asignadas"
        labelIdentificador="Código de alumno"
        placeholderIdentificador="Ej. 20200001"
        ayudaIdentificador="Ingresa tu código de matrícula de 8 dígitos."
        endpoint="/v1/auth/alumno/login"
        campoIdentificador="codigo"
        onLoginExitoso={onLoginExitoso}
        avisoSesion={avisoSesion}
      />
    </LoginLayout>
  );
};

export default LoginAlumno;

import React from 'react';
import LoginFormBase from '../components/auth/LoginFormBase';
import type { LoginResponseDTO } from '../types/auth';

export interface LoginAlumnoProps {
  onLoginExitoso?: (resultado: LoginResponseDTO) => void;
  className?: string;
}

export const LoginAlumno: React.FC<LoginAlumnoProps> = ({ onLoginExitoso, className = '' }) => {
  return (
    <main
      className={`min-h-screen bg-[#FAF6ED] text-[#222222] flex flex-col justify-center items-center px-4 py-8 sm:py-12 ${className}`}
      aria-label="Página de inicio de sesión de estudiante"
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
      />
    </main>
  );
};

export default LoginAlumno;

import React from 'react';
import LoginFormBase from '../components/auth/LoginFormBase';
import LoginLayout from '../components/auth/LoginLayout';
import type { LoginResponseDTO } from '../types/auth';

/**
 * Issue #217 — 4.25: Pantalla de inicio de sesión de Coordinación Académica y Jefatura de
 * Laboratorios. Reutiliza LoginFormBase (mismo patrón visual que alumno y docente), sin opción
 * de crear cuenta. Prioriza escritorio: desde 1024 px muestra el panel de marca al lado y en
 * tablet el formulario se ensancha.
 *
 * El backend recibe `usuario` (no `codigo`) en POST /v1/auth/admin/login.
 */
export interface LoginAdminProps {
  onLoginExitoso?: (resultado: LoginResponseDTO) => void;
  avisoSesion?: string;
  className?: string;
}

export const LoginAdmin: React.FC<LoginAdminProps> = ({
  onLoginExitoso,
  avisoSesion,
  className = '',
}) => {
  return (
    <LoginLayout
      portal="admin"
      ariaLabel="Página de inicio de sesión del panel administrativo"
      className={className}
    >
      <LoginFormBase
        rol="ADMIN"
        titulo="Panel Administrativo"
        subtitulo="Ingresa con tu usuario de Coordinación Académica o Jefatura de Laboratorios"
        labelIdentificador="Usuario"
        placeholderIdentificador="Ej. coordinacion"
        ayudaIdentificador="Usuario asignado por Coordinación Académica."
        endpoint="/v1/auth/admin/login"
        campoIdentificador="usuario"
        onLoginExitoso={onLoginExitoso}
        avisoSesion={avisoSesion}
      />
    </LoginLayout>
  );
};

export default LoginAdmin;

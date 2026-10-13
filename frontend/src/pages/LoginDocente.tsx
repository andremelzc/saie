import React from 'react';
import LoginFormBase from '../components/auth/LoginFormBase';
import type { LoginResponseDTO } from '../types/auth';

/**
 * Issue #204 — 7.7: Pantalla de inicio de sesión para docentes.
 *
 * Reutiliza LoginFormBase con los parámetros del portal docente.
 *
 * Decisión de implementación: el campo enviado al backend es "codigo"
 * (código de docente, p. ej. D001). El issue original menciona correo,
 * pero el backend (loginDocente → crearLogin([DOCENTE])) espera el campo
 * "codigo" del LoginSchema; enviar un correo resultaría en credenciales
 * inválidas (401). Esta desviación queda registrada en el resumen del issue.
 *
 * Esta pantalla NO guarda el token ni maneja sesión; eso corresponde
 * al Issue #217 (4.25 — Gestión de sesión y persistencia).
 */

export interface LoginDocenteProps {
  onLoginExitoso?: (resultado: LoginResponseDTO) => void;
  className?: string;
}

export const LoginDocente: React.FC<LoginDocenteProps> = ({ onLoginExitoso, className = '' }) => {
  return (
    <main
      className={`min-h-screen bg-[#FAF6ED] text-[#222222] flex flex-col justify-center items-center px-4 py-8 sm:py-12 ${className}`}
      aria-label="Página de inicio de sesión de docente"
    >
      <LoginFormBase
        rol="DOCENTE"
        titulo="Portal del Docente"
        subtitulo="Consulta tus aulas asignadas y reporta incidencias de equipamiento"
        labelIdentificador="Código de docente"
        placeholderIdentificador="Ej. D001"
        ayudaIdentificador="Ingresa tu código de docente asignado por la Facultad."
        endpoint="/v1/auth/docente/login"
        campoIdentificador="codigo"
        onLoginExitoso={onLoginExitoso}
      />
    </main>
  );
};

export default LoginDocente;

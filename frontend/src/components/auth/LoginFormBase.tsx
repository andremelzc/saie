import React, { useState } from 'react';
import api from '../../services/api';
import type { LoginResponseDTO } from '../../types/auth';

export interface LoginFormBaseProps {
  rol: 'ALUMNO' | 'DOCENTE' | 'ADMIN';
  titulo: string;
  subtitulo: string;
  labelIdentificador: string;
  placeholderIdentificador: string;
  ayudaIdentificador?: string;
  endpoint: string;
  campoIdentificador?: 'codigo' | 'usuario';
  onLoginExitoso?: (resultado: LoginResponseDTO) => void;
  className?: string;
}

export const LoginFormBase: React.FC<LoginFormBaseProps> = ({
  titulo,
  subtitulo,
  labelIdentificador,
  placeholderIdentificador,
  ayudaIdentificador,
  endpoint,
  campoIdentificador = 'codigo',
  onLoginExitoso,
  className = '',
}) => {
  const [identificador, setIdentificador] = useState('');
  const [clave, setClave] = useState('');
  const [mostrarClave, setMostrarClave] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [errorLogin, setErrorLogin] = useState<string | null>(null);

  const esValido = identificador.trim().length > 0 && clave.length > 0;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!esValido || cargando) {
      return;
    }

    setCargando(true);
    setErrorLogin(null);

    const payload = {
      [campoIdentificador]: identificador.trim(),
      clave,
    };

    try {
      const response = await api.post<{
        success: boolean;
        data: LoginResponseDTO;
      }>(endpoint, payload);

      if (response.data?.success && response.data?.data) {
        onLoginExitoso?.(response.data.data);
      }
    } catch (err: unknown) {
      let mensaje =
        'Credenciales inválidas. Las cuentas de acceso son asignadas exclusivamente por Coordinación Académica.';

      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { status?: number; data?: { message?: string } } }).response ===
          'object'
      ) {
        const axiosErr = err as {
          response?: { status?: number; data?: { message?: string } };
        };

        if (axiosErr.response?.status === 401) {
          mensaje =
            'Credenciales inválidas. Las cuentas de acceso son administradas por Coordinación Académica. Si tienes problemas de acceso, comunícate con la coordinación.';
        } else if (axiosErr.response?.data?.message) {
          mensaje = axiosErr.response.data.message;
        } else {
          mensaje =
            'Error al conectar con el servicio de autenticación. Por favor, intenta de nuevo.';
        }
      }

      setErrorLogin(mensaje);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div
      className={`w-full max-w-md mx-auto bg-white border border-[#E6DFD0] rounded-2xl shadow-[0_2px_8px_rgba(34,34,34,0.08)] p-6 sm:p-8 flex flex-col gap-6 text-[#222222] ${className}`}
    >
      {/* Cabecera visual del Login */}
      <header className="flex flex-col items-center text-center gap-1.5">
        <div className="w-12 h-12 rounded-xl bg-[#7B1113] text-white flex items-center justify-center font-bold text-xl shadow-xs mb-1">
          S
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#666666]">
          SAIE — Gestión de Espacios
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#222222] tracking-tight">{titulo}</h1>
        <p className="text-sm text-[#666666] max-w-xs">{subtitulo}</p>
      </header>

      {/* Alerta de error accesible */}
      {errorLogin && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-sm text-[#D32F2F] flex items-start gap-2.5 font-medium"
        >
          <svg
            className="w-5 h-5 text-[#D32F2F] shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <div className="flex-1">
            <span>{errorLogin}</span>
          </div>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {/* Campo Identificador (Código / Usuario) */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="login-identificador"
            className="text-sm font-medium text-[#222222] flex items-center gap-1"
          >
            <span>{labelIdentificador}</span>
            <span className="text-[#D32F2F] font-bold" aria-hidden="true">
              *
            </span>
            <span className="sr-only">(obligatorio)</span>
          </label>
          <input
            id="login-identificador"
            name="identificador"
            type="text"
            value={identificador}
            onChange={(e) => {
              setIdentificador(e.target.value);
              if (errorLogin) setErrorLogin(null);
            }}
            placeholder={placeholderIdentificador}
            disabled={cargando}
            aria-required="true"
            aria-describedby={ayudaIdentificador ? 'login-identificador-ayuda' : undefined}
            className="w-full h-12 px-4 rounded-[10px] bg-white text-[#222222] placeholder-[#666666] text-base border border-[#8A8578] focus:border-[#7B1113] focus:ring-2 focus:ring-[#7B1113]/20 transition-colors outline-hidden disabled:bg-[#F1EDE3] disabled:text-[#666666]"
          />
          {ayudaIdentificador && (
            <p id="login-identificador-ayuda" className="text-sm text-[#666666]">
              {ayudaIdentificador}
            </p>
          )}
        </div>

        {/* Campo Contraseña con toggle para mostrar/ocultar */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="login-clave"
            className="text-sm font-medium text-[#222222] flex items-center gap-1"
          >
            <span>Contraseña</span>
            <span className="text-[#D32F2F] font-bold" aria-hidden="true">
              *
            </span>
            <span className="sr-only">(obligatorio)</span>
          </label>
          <div className="relative">
            <input
              id="login-clave"
              name="clave"
              type={mostrarClave ? 'text' : 'password'}
              value={clave}
              onChange={(e) => {
                setClave(e.target.value);
                if (errorLogin) setErrorLogin(null);
              }}
              placeholder="Ingresa tu contraseña"
              disabled={cargando}
              aria-required="true"
              className="w-full h-12 pl-4 pr-12 rounded-[10px] bg-white text-[#222222] placeholder-[#666666] text-base border border-[#8A8578] focus:border-[#7B1113] focus:ring-2 focus:ring-[#7B1113]/20 transition-colors outline-hidden disabled:bg-[#F1EDE3] disabled:text-[#666666]"
            />
            <button
              type="button"
              onClick={() => setMostrarClave(!mostrarClave)}
              disabled={cargando}
              aria-label={mostrarClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-1 top-1 bottom-1 w-11 h-10 flex items-center justify-center text-[#666666] hover:text-[#222222] focus:outline-hidden focus:ring-2 focus:ring-[#7B1113] rounded-md transition-colors cursor-pointer"
            >
              {mostrarClave ? (
                /* Ícono ojo tachado */
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                  />
                </svg>
              ) : (
                /* Ícono ojo */
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Botón de envío */}
        <button
          type="submit"
          disabled={!esValido || cargando}
          aria-busy={cargando}
          className="w-full h-12 mt-2 px-6 rounded-[12px] font-medium text-base text-white transition-all duration-150 flex items-center justify-center gap-2 focus:outline-hidden focus:ring-3 focus:ring-[#222222] focus:ring-offset-2 bg-[#7B1113] hover:bg-[#5C0D0E] active:bg-[#5C0D0E] disabled:bg-[#E6DFD0] disabled:text-[#666666] disabled:cursor-not-allowed cursor-pointer"
        >
          {cargando ? (
            <>
              <svg
                className="animate-spin h-5 w-5 text-current"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              <span>Iniciando sesión...</span>
            </>
          ) : (
            <span>Iniciar sesión</span>
          )}
        </button>
      </form>

      {/* Nota institucional de no autorregistro */}
      <footer className="pt-4 border-t border-[#E6DFD0] text-center">
        <p className="text-xs text-[#666666]">
          Las cuentas de acceso son generadas por la Facultad. Si necesitas soporte técnico, acude a
          Coordinación Académica.
        </p>
      </footer>
    </div>
  );
};

export default LoginFormBase;

import React, { useState } from 'react';
import api from '../../services/api';
import isotipoPlaca from '../../assets/isotipo-placa.svg';
import { PORTALES } from '../../config/portales';
import type { PortalId } from '../../config/portales';
import type { LoginResponseDTO } from '../../types/auth';
import IconoPortal from './IconoPortal';

const PORTAL_DE_ROL: Record<'ALUMNO' | 'DOCENTE' | 'ADMIN', PortalId> = {
  ALUMNO: 'estudiante',
  DOCENTE: 'docente',
  ADMIN: 'admin',
};

/** Clases comunes de los campos de texto (altura 48 px, foco guinda, ver guía §4.5). */
const CLASES_CAMPO =
  'w-full h-12 rounded-[10px] bg-white text-saie-text placeholder-saie-muted text-base border border-[#8A8578] hover:border-saie-text/60 focus:border-saie-primary focus:ring-2 focus:ring-saie-primary/20 transition-colors outline-hidden disabled:bg-[#F1EDE3] disabled:text-saie-muted';

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
  /** Aviso informativo sobre la sesión (p. ej. "Tu sesión venció"), mostrado sobre el formulario. */
  avisoSesion?: string;
  className?: string;
}

export const LoginFormBase: React.FC<LoginFormBaseProps> = ({
  rol,
  titulo,
  subtitulo,
  labelIdentificador,
  placeholderIdentificador,
  ayudaIdentificador,
  endpoint,
  campoIdentificador = 'codigo',
  onLoginExitoso,
  avisoSesion,
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

  const portal = PORTALES.find((p) => p.id === PORTAL_DE_ROL[rol]) ?? PORTALES[0];

  return (
    <div
      className={`saie-rise relative w-full max-w-md md:max-w-lg lg:max-w-md mx-auto overflow-hidden bg-white border border-saie-divider rounded-xl shadow-[0_8px_24px_rgba(34,34,34,0.16)] p-6 sm:p-8 flex flex-col gap-6 text-saie-text ${className}`}
    >
      {/* Acento superior de la tarjeta */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-saie-primary to-[#A8383A]"
      />

      {/* Cabecera: isotipo SAIE, portal y título */}
      <header className="flex flex-col items-center text-center gap-2 pt-1">
        <img
          src={isotipoPlaca}
          alt=""
          aria-hidden="true"
          className="h-16 w-16 rounded-2xl shadow-[0_2px_8px_rgba(34,34,34,0.16)]"
        />
        <span className="mt-1 inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-saie-primary/10 text-saie-primary text-xs font-medium tracking-[0.2px]">
          <IconoPortal portal={portal.id} className="h-3.5 w-3.5" />
          {portal.etiqueta}
        </span>
        <h1 className="m-0 font-serif text-[28px] leading-9 sm:text-[32px] sm:leading-10 font-bold text-saie-text">
          {titulo}
        </h1>
        <p className="m-0 text-sm text-saie-muted max-w-xs">{subtitulo}</p>
      </header>

      {/* Aviso informativo de sesión (p. ej. sesión vencida) */}
      {avisoSesion && (
        <div
          role="status"
          className="p-3.5 bg-saie-canvas border border-saie-divider rounded-xl text-sm text-saie-text flex items-start gap-2.5 font-medium"
        >
          <svg
            className="w-5 h-5 text-saie-primary shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <span>{avisoSesion}</span>
        </div>
      )}

      {/* Alerta de error accesible: ícono + mensaje (nunca solo color) */}
      {errorLogin && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-sm text-saie-danger flex items-start gap-2.5 font-medium"
        >
          <svg
            className="w-5 h-5 text-saie-danger shrink-0 mt-0.5"
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
            className="text-sm font-medium text-saie-text flex items-center gap-1"
          >
            <span>{labelIdentificador}</span>
            <span className="text-saie-danger font-bold" aria-hidden="true">
              *
            </span>
            <span className="sr-only">(obligatorio)</span>
          </label>
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-saie-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.1a7.5 7.5 0 0115 0A17.9 17.9 0 0112 21.75c-2.7 0-5.2-.6-7.5-1.65z" />
            </svg>
            <input
              id="login-identificador"
              name="identificador"
              type="text"
              autoComplete="username"
              value={identificador}
              onChange={(e) => {
                setIdentificador(e.target.value);
                if (errorLogin) setErrorLogin(null);
              }}
              placeholder={placeholderIdentificador}
              disabled={cargando}
              aria-required="true"
              aria-describedby={ayudaIdentificador ? 'login-identificador-ayuda' : undefined}
              className={`${CLASES_CAMPO} pl-11 pr-4`}
            />
          </div>
          {ayudaIdentificador && (
            <p id="login-identificador-ayuda" className="m-0 text-sm text-saie-muted">
              {ayudaIdentificador}
            </p>
          )}
        </div>

        {/* Campo Contraseña con toggle para mostrar/ocultar */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="login-clave"
            className="text-sm font-medium text-saie-text flex items-center gap-1"
          >
            <span>Contraseña</span>
            <span className="text-saie-danger font-bold" aria-hidden="true">
              *
            </span>
            <span className="sr-only">(obligatorio)</span>
          </label>
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-saie-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <input
              id="login-clave"
              name="clave"
              type={mostrarClave ? 'text' : 'password'}
              autoComplete="current-password"
              value={clave}
              onChange={(e) => {
                setClave(e.target.value);
                if (errorLogin) setErrorLogin(null);
              }}
              placeholder="Ingresa tu contraseña"
              disabled={cargando}
              aria-required="true"
              className={`${CLASES_CAMPO} pl-11 pr-12`}
            />
            <button
              type="button"
              onClick={() => setMostrarClave(!mostrarClave)}
              disabled={cargando}
              aria-label={mostrarClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-1 top-1 bottom-1 w-11 h-10 flex items-center justify-center text-saie-muted hover:text-saie-primary hover:bg-saie-primary/5 rounded-md transition-colors cursor-pointer"
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
          className="group w-full h-12 mt-2 px-6 rounded-xl font-medium text-base text-white shadow-[0_2px_8px_rgba(123,17,19,0.25)] transition-all duration-200 flex items-center justify-center gap-2 bg-saie-primary hover:bg-saie-primary-dark hover:shadow-[0_8px_24px_rgba(123,17,19,0.28)] active:bg-saie-primary-dark disabled:bg-saie-divider disabled:text-saie-muted disabled:shadow-none disabled:cursor-not-allowed cursor-pointer"
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
            <>
              <span>Iniciar sesión</span>
              <span
                aria-hidden="true"
                className="inline-block transition-transform duration-300 group-enabled:group-hover:translate-x-1.5"
              >
                &rarr;
              </span>
            </>
          )}
        </button>
      </form>

      {/* Nota institucional de no autorregistro */}
      <footer className="pt-4 border-t border-saie-divider flex items-start justify-center gap-2 text-saie-muted">
        <svg
          className="h-4 w-4 shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
        <p className="m-0 text-xs text-left">
          Las cuentas de acceso son generadas por la Facultad. Si necesitas soporte técnico, acude a
          Coordinación Académica.
        </p>
      </footer>
    </div>
  );
};

export default LoginFormBase;

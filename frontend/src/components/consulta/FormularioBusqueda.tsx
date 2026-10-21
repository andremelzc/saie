import React, { useState } from 'react';
import api from '../../services/api';
import type {
  ConsultaAlumnoResponseDTO,
  ConsultaCursoResponseDTO,
  ResultadoConsulta,
  TipoCodigoConsulta,
} from '../../types/consulta';
import { detectarTipoCodigo } from '../../utils/consulta';

export interface FormularioBusquedaProps {
  onBuscar?: (resultado: ResultadoConsulta, codigo: string, tipo: TipoCodigoConsulta) => void;
  /** Recibe el mensaje y el estado HTTP (undefined si no hubo respuesta, p. ej. sin conexión). */
  onError?: (mensaje: string, estado?: number) => void;
  onCargando?: (cargando: boolean) => void;
  /** Se llama cuando la persona edita el campo (para que la vista quite avisos ya viejos). */
  onCambio?: () => void;
  /**
   * Si es false, los errores del servidor (sin conexión, 404) no se repiten bajo el campo porque
   * la vista ya los muestra en su propia tarjeta. Los errores de formato siempre se muestran aquí.
   */
  mostrarErrorServidor?: boolean;
  className?: string;
}

export const FormularioBusqueda: React.FC<FormularioBusquedaProps> = ({
  onBuscar,
  onError,
  onCargando,
  onCambio,
  mostrarErrorServidor = true,
  className = '',
}) => {
  const [codigo, setCodigo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [tocado, setTocado] = useState(false);
  // Un campo vacío al salir de él no es un error; solo lo es si se intenta enviar así.
  const [intentoEnvio, setIntentoEnvio] = useState(false);

  const tipoDetectado = detectarTipoCodigo(codigo);
  const esValido = tipoDetectado !== null;

  // El error de formato se muestra únicamente tras perder el foco (onBlur) o intentar enviar
  const vacio = codigo.trim().length === 0;
  const errorFormato =
    tocado && !esValido && !(vacio && !intentoEnvio)
      ? vacio
        ? 'Escribe tu código de alumno o el código de un curso.'
        : 'Ingresa 8 dígitos (alumno) o un código de curso como CC-101'
      : null;

  const mensajeError = (mostrarErrorServidor ? errorServidor : null) || errorFormato;
  const tieneError = Boolean(mensajeError);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCodigo(e.target.value);
    // Al escribir se resetea tocado y errorServidor para no marcar en rojo mientras escribe
    setTocado(false);
    setIntentoEnvio(false);
    if (errorServidor) {
      setErrorServidor(null);
    }
    onCambio?.();
  };

  const handleBlur = () => {
    setTocado(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTocado(true);
    setIntentoEnvio(true);

    if (!esValido || cargando) {
      return;
    }

    const codigoNormalizado = codigo.trim();
    setCargando(true);
    onCargando?.(true);
    setErrorServidor(null);

    try {
      if (tipoDetectado === 'ALUMNO') {
        const response = await api.get<{
          success: boolean;
          data: ConsultaAlumnoResponseDTO;
        }>(`/v1/consulta/alumno/${encodeURIComponent(codigoNormalizado)}`);

        const resultado: ResultadoConsulta = {
          tipo: 'ALUMNO',
          datos: response.data.data,
        };
        onBuscar?.(resultado, codigoNormalizado, 'ALUMNO');
      } else {
        const codigoCurso = codigoNormalizado.toUpperCase();
        const response = await api.get<{
          success: boolean;
          data: ConsultaCursoResponseDTO;
        }>(`/v1/consulta/curso/${encodeURIComponent(codigoCurso)}`);

        const resultado: ResultadoConsulta = {
          tipo: 'CURSO',
          datos: response.data.data,
        };
        onBuscar?.(resultado, codigoCurso, 'CURSO');
      }
    } catch (err: unknown) {
      let mensaje = 'Error al realizar la consulta. Por favor, intenta de nuevo.';
      let estado: number | undefined;

      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: string }; status?: number } }).response ===
          'object'
      ) {
        const axiosErr = err as {
          response?: { data?: { message?: string }; status?: number };
        };
        estado = axiosErr.response?.status;
        if (axiosErr.response?.data?.message) {
          mensaje = axiosErr.response.data.message;
        } else if (axiosErr.response?.status === 404) {
          mensaje =
            tipoDetectado === 'ALUMNO'
              ? `No se encontró ningún estudiante con el código ${codigoNormalizado}`
              : `No se encontró ningún curso con el código ${codigoNormalizado.toUpperCase()}`;
        }
      } else {
        // Sin respuesta del servidor: no hay conexión o el servicio no está disponible.
        mensaje = 'No se pudo conectar con el servicio. Revisa tu conexión e inténtalo de nuevo.';
      }

      setErrorServidor(mensaje);
      onError?.(mensaje, estado);
    } finally {
      setCargando(false);
      onCargando?.(false);
    }
  };

  const idAyuda = 'ayuda-codigo-consulta';

  return (
    <form
      onSubmit={handleSubmit}
      className={`w-full max-w-xl mx-auto flex flex-col gap-3 ${className}`}
      noValidate
      aria-label="Formulario de consulta de espacios"
    >
      <div className="flex flex-col gap-2">
        <label
          htmlFor="codigo-consulta"
          className="text-sm font-medium text-saie-text flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 min-h-7"
        >
          <span>
            Código de alumno o curso{' '}
            <span className="text-saie-danger font-bold" aria-hidden="true">
              *
            </span>
            <span className="sr-only">(obligatorio)</span>
          </span>
          {tipoDetectado && (
            <span className="saie-rise inline-flex items-center gap-1.5 text-sm font-semibold pl-2 pr-2.5 py-0.5 rounded-full bg-saie-canvas text-saie-primary border border-saie-divider">
              <svg
                className="w-3.5 h-3.5"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              {tipoDetectado === 'ALUMNO' ? 'Estudiante detectado' : 'Curso detectado'}
            </span>
          )}
        </label>

        {/* Contenedor responsivo: columna en móvil (<1024px), fila en escritorio (>=1024px) */}
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            {/* El ícono acompaña lo que se escribe: lupa, persona (alumno) o libro (curso) */}
            <svg
              className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${
                tieneError
                  ? 'text-saie-danger'
                  : tipoDetectado
                    ? 'text-saie-primary'
                    : 'text-saie-muted'
              }`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              {tipoDetectado === 'ALUMNO' ? (
                <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.118a7.5 7.5 0 0115 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.5-1.632z" />
              ) : tipoDetectado === 'CURSO' ? (
                <path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              ) : (
                <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              )}
            </svg>
            <input
              id="codigo-consulta"
              name="codigo"
              type="text"
              inputMode="text"
              autoComplete="off"
              value={codigo}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Ej. 20200001 o CC-101"
              disabled={cargando}
              aria-required="true"
              aria-invalid={tieneError}
              aria-describedby={tieneError ? 'mensaje-error-consulta' : idAyuda}
              className={`w-full h-12 pl-11 pr-4 rounded-[10px] bg-white text-saie-text placeholder-saie-muted text-base border transition-colors outline-hidden ${
                tieneError
                  ? 'border-2 border-saie-danger focus:ring-3 focus:ring-saie-danger/20'
                  : 'border-saie-border hover:border-saie-text/60 focus:border-2 focus:border-saie-primary focus:ring-3 focus:ring-saie-primary/20'
              } disabled:bg-[#F1EDE3] disabled:text-saie-muted disabled:border-saie-divider`}
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            aria-busy={cargando}
            className="w-full lg:w-auto min-w-[120px] h-12 px-6 rounded-[12px] font-medium text-base text-white transition-all duration-150 flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(123,17,19,0.25)] focus:outline-hidden focus:ring-3 focus:ring-saie-text focus:ring-offset-2 bg-saie-primary hover:bg-saie-primary-dark active:bg-saie-primary-dark disabled:bg-saie-divider disabled:text-saie-muted disabled:shadow-none disabled:cursor-not-allowed cursor-pointer"
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
                <span>Buscando...</span>
              </>
            ) : (
              <span>Buscar</span>
            )}
          </button>
        </div>

        {/* Error: ícono y texto en 14 px (Guía de Estilos §4.5); nunca solo color */}
        {tieneError ? (
          <div
            id="mensaje-error-consulta"
            role="alert"
            className="flex items-start gap-2 text-sm text-saie-danger font-medium"
          >
            <svg
              className="w-4 h-4 shrink-0 mt-0.5 text-saie-danger"
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
            <span>{mensajeError}</span>
          </div>
        ) : (
          <p id={idAyuda} className="m-0 flex items-start gap-2 text-sm text-saie-muted">
            <svg
              className="w-4 h-4 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <span>
              Ingresa tu código de alumno (8 dígitos, ej: 20200001) o código de curso (ej: CC-101).
            </span>
          </p>
        )}
      </div>
    </form>
  );
};

export default FormularioBusqueda;

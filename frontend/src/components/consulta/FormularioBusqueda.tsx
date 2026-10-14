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
  className?: string;
}

export const FormularioBusqueda: React.FC<FormularioBusquedaProps> = ({
  onBuscar,
  onError,
  onCargando,
  className = '',
}) => {
  const [codigo, setCodigo] = useState('');
  const [cargando, setCargando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [tocado, setTocado] = useState(false);

  const tipoDetectado = detectarTipoCodigo(codigo);
  const esValido = tipoDetectado !== null;

  // El error de formato se muestra únicamente tras perder el foco (onBlur) o intentar enviar
  const errorFormato =
    tocado && !esValido ? 'Ingresa 8 dígitos (alumno) o un código de curso como CC-101' : null;

  const mensajeError = errorServidor || errorFormato;
  const tieneError = Boolean(mensajeError);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCodigo(e.target.value);
    // Al escribir se resetea tocado y errorServidor para no marcar en rojo mientras escribe
    setTocado(false);
    if (errorServidor) {
      setErrorServidor(null);
    }
  };

  const handleBlur = () => {
    setTocado(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTocado(true);

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

  return (
    <form
      onSubmit={handleSubmit}
      className={`w-full max-w-xl mx-auto flex flex-col gap-3 ${className}`}
      noValidate
      aria-label="Formulario de consulta de espacios"
    >
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="codigo-consulta"
          className="text-sm font-medium text-[#222222] flex flex-wrap items-center justify-between gap-x-3 gap-y-1"
        >
          <span>
            Código de alumno o curso{' '}
            <span className="text-[#D32F2F] font-bold" aria-hidden="true">
              *
            </span>
            <span className="sr-only">(obligatorio)</span>
          </span>
          {tipoDetectado && (
            <span className="text-sm font-semibold px-2 py-0.5 rounded-full bg-[#FAF6ED] text-[#7B1113] border border-[#E6DFD0]">
              {tipoDetectado === 'ALUMNO' ? 'Estudiante detectado' : 'Curso detectado'}
            </span>
          )}
        </label>

        {/* Contenedor responsivo: columna en móvil (<1024px), fila en escritorio (>=1024px) */}
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <input
              id="codigo-consulta"
              name="codigo"
              type="text"
              value={codigo}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Ej. 20200001 o CC-101"
              disabled={cargando}
              aria-required="true"
              aria-invalid={tieneError}
              aria-describedby={tieneError ? 'mensaje-error-consulta' : 'ayuda-codigo-consulta'}
              className={`w-full h-12 px-4 rounded-[10px] bg-white text-[#222222] placeholder-[#666666] text-base border transition-colors outline-hidden ${
                tieneError
                  ? 'border-[#D32F2F] focus:border-[#D32F2F] focus:ring-2 focus:ring-[#D32F2F]/20'
                  : 'border-[#8A8578] focus:border-[#7B1113] focus:ring-2 focus:ring-[#7B1113]/20'
              } disabled:bg-[#F1EDE3] disabled:text-[#666666] disabled:border-[#E6DFD0]`}
            />
          </div>

          <button
            type="submit"
            disabled={!esValido || cargando}
            aria-busy={cargando}
            className="w-full lg:w-auto min-w-[120px] h-12 px-6 rounded-[12px] font-medium text-base text-white transition-all duration-150 flex items-center justify-center gap-2 focus:outline-hidden focus:ring-3 focus:ring-[#222222] focus:ring-offset-2 bg-[#7B1113] hover:bg-[#5C0D0E] active:bg-[#5C0D0E] disabled:bg-[#E6DFD0] disabled:text-[#666666] disabled:cursor-not-allowed cursor-pointer"
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
              <>
                <svg
                  className="w-5 h-5 text-current"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <span>Buscar</span>
              </>
            )}
          </button>
        </div>

        {/* Mensaje de error visible con icono y texto en 14 px (text-sm) según Guía de Estilos §4.5 */}
        {tieneError ? (
          <div
            id="mensaje-error-consulta"
            role="alert"
            className="flex items-center gap-2 text-sm text-[#D32F2F] mt-1 font-medium"
          >
            <svg
              className="w-4 h-4 shrink-0 text-[#D32F2F]"
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
          /* Mensaje de ayuda en 14 px (text-sm) según Guía de Estilos §4.5 */
          <p id="ayuda-codigo-consulta" className="text-sm text-[#666666] mt-1">
            Ingresa tu código de alumno (8 dígitos, ej: 20200001) o código de curso (ej: CC-101).
          </p>
        )}
      </div>
    </form>
  );
};

export default FormularioBusqueda;

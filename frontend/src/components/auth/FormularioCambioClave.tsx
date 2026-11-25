import React, { useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { useAccion } from '../../hooks/useAccion';
import { LONGITUD_MAXIMA_CLAVE, LONGITUD_MINIMA_CLAVE, cambiarClave } from '../../services/cuenta';
import { validarCambioClave, type ErroresCambioClave } from '../../utils/claves';
import { Aviso } from '../ui/Aviso';
import { Boton } from '../ui/Boton';
import { CLASE_AYUDA, CLASE_CAMPO, CLASE_ETIQUETA } from '../ui/campos';

export interface FormularioCambioClaveProps {
  /** Se llama tras guardar la clave nueva y renovar la sesión. */
  onCambiada?: () => void;
  className?: string;
}

/**
 * Cambio de la propia clave (Issue 4.21), común a los cuatro roles: pide la clave actual y la
 * nueva dos veces. El servidor devuelve un token nuevo sin la marca de clave pendiente; se
 * guarda como sesión para que quien cambia la clave inicial siga dentro sin volver a ingresar.
 */
export const FormularioCambioClave: React.FC<FormularioCambioClaveProps> = ({
  onCambiada,
  className = '',
}) => {
  const { sesion, iniciarSesion } = useAuth();
  const accion = useAccion();
  const [claveActual, setClaveActual] = useState('');
  const [claveNueva, setClaveNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [intentado, setIntentado] = useState(false);

  const errores = validarCambioClave(claveActual, claveNueva, confirmacion);
  const mostrar = (campo: keyof ErroresCambioClave) => (intentado ? errores[campo] : undefined);

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIntentado(true);
    if (!sesion || Object.keys(errores).length > 0) return;

    const resultado = await accion.ejecutar(() => cambiarClave({ claveActual, claveNueva }), {
      exito: 'Tu clave se cambió correctamente.',
      avisarError: false,
    });
    if (!resultado?.ok) return;

    iniciarSesion({
      token: resultado.valor.token,
      rol: sesion.rol,
      debeCambiarClave: false,
      expiresIn: resultado.valor.expiresIn,
    });
    setClaveActual('');
    setClaveNueva('');
    setConfirmacion('');
    setIntentado(false);
    onCambiada?.();
  };

  const campo = (
    id: string,
    etiqueta: string,
    valor: string,
    onChange: (v: string) => void,
    autoComplete: 'current-password' | 'new-password',
    error: string | undefined,
    ayuda?: string,
  ) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={CLASE_ETIQUETA}>
        {etiqueta}
      </label>
      <input
        id={id}
        type="password"
        value={valor}
        autoComplete={autoComplete}
        onChange={(ev) => {
          accion.limpiarError();
          onChange(ev.target.value);
        }}
        aria-required="true"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined}
        className={`${CLASE_CAMPO} ${error ? 'border-saie-danger' : ''}`}
      />
      {error ? (
        <p id={`${id}-error`} className="m-0 text-sm font-medium text-saie-danger-strong">
          {error}
        </p>
      ) : (
        ayuda && (
          <p id={`${id}-ayuda`} className={CLASE_AYUDA}>
            {ayuda}
          </p>
        )
      )}
    </div>
  );

  return (
    <form
      onSubmit={(ev) => void enviar(ev)}
      noValidate
      className={`flex flex-col gap-4 ${className}`}
    >
      {accion.error && <Aviso tono="error">{accion.error}</Aviso>}
      {campo(
        'clave-actual',
        'Clave actual',
        claveActual,
        setClaveActual,
        'current-password',
        mostrar('claveActual'),
      )}
      {campo(
        'clave-nueva',
        'Clave nueva',
        claveNueva,
        setClaveNueva,
        'new-password',
        mostrar('claveNueva'),
        `Entre ${LONGITUD_MINIMA_CLAVE} y ${LONGITUD_MAXIMA_CLAVE} caracteres. Debe ser distinta de la actual y de tu código de acceso.`,
      )}
      {campo(
        'clave-confirmacion',
        'Repite la clave nueva',
        confirmacion,
        setConfirmacion,
        'new-password',
        mostrar('confirmacion'),
      )}
      <Boton type="submit" cargando={accion.cargando} textoCargando="Guardando…" anchoCompleto>
        Cambiar clave
      </Boton>
    </form>
  );
};

export default FormularioCambioClave;

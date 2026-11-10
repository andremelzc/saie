import React, { useEffect, useRef, useState } from 'react';
import CampoFormulario from '../../components/admin/CampoFormulario';
import LayoutAdmin from '../../components/admin/LayoutAdmin';
import FormularioCambioClave from '../../components/auth/FormularioCambioClave';
import { Aviso } from '../../components/ui/Aviso';
import { Boton } from '../../components/ui/Boton';
import { DialogoConfirmacion } from '../../components/ui/DialogoConfirmacion';
import { useAuth } from '../../context/useAuth';
import { useAccion } from '../../hooks/useAccion';
import { restablecerClave } from '../../services/admin';
import type { ClaveRestablecidaDTO } from '../../types/admin';
import { ROL } from '../../utils/diccionarios';

/**
 * Clave recién generada. Se muestra una sola vez (el servidor no vuelve a entregarla ni la
 * guarda en claro): Coordinación la copia y se la da al usuario, que deberá cambiarla al entrar.
 */
const ClaveGenerada: React.FC<{ resultado: ClaveRestablecidaDTO; onListo: () => void }> = ({
  resultado,
  onListo,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [copiada, setCopiada] = useState<'si' | 'no' | null>(null);
  useEffect(() => ref.current?.focus(), []);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(resultado.claveInicial);
      setCopiada('si');
    } catch {
      // Sin permiso del portapapeles: la clave sigue visible para copiarla a mano.
      setCopiada('no');
    }
  };

  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="flex flex-col gap-4 rounded-2xl border border-saie-success/30 bg-saie-success-soft p-5 text-saie-text outline-none focus-visible:ring-3 focus-visible:ring-saie-primary/30"
    >
      <h3 className="m-0 text-lg font-bold text-saie-success-strong">
        Se restableció la clave de {resultado.nombre}
      </h3>
      <dl className="m-0 grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1 text-sm">
        <dt className="font-semibold">Usuario</dt>
        <dd className="m-0 break-all font-mono">{resultado.codigo}</dd>
        <dt className="font-semibold">Rol</dt>
        <dd className="m-0">{ROL[resultado.rol]}</dd>
        <dt className="font-semibold">Clave inicial</dt>
        <dd className="m-0">
          <strong
            className="break-all rounded-lg bg-white px-3 py-1.5 font-mono text-lg tracking-wide"
            data-testid="clave-inicial"
          >
            {resultado.claveInicial}
          </strong>
        </dd>
      </dl>
      <Aviso tono="advertencia">
        <strong>Se muestra una sola vez.</strong> Cópiala y entrégasela a la persona: al salir de
        esta pantalla no se podrá volver a ver. Deberá cambiarla en su próximo ingreso.
      </Aviso>
      <div className="flex flex-wrap items-center gap-3">
        <Boton variante="secundario" onClick={() => void copiar()} anchoCompleto>
          Copiar clave
        </Boton>
        <Boton onClick={onListo} anchoCompleto>
          Listo, ya la anoté
        </Boton>
      </div>
      <p role="status" className="m-0 min-h-5 text-sm text-saie-muted">
        {copiada === 'si' && 'Clave copiada al portapapeles.'}
        {copiada === 'no' && 'No se pudo copiar automáticamente: selecciónala y cópiala a mano.'}
      </p>
    </div>
  );
};

/** Restablecimiento de la clave de un alumno o docente (Issue 4.26, solo Coordinación). */
const RestablecerClave: React.FC = () => {
  const accion = useAccion();
  const [usuario, setUsuario] = useState('');
  const [intentado, setIntentado] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [resultado, setResultado] = useState<ClaveRestablecidaDTO | null>(null);

  const objetivo = usuario.trim();
  const error =
    intentado && objetivo === '' ? 'Escribe el código o el correo del usuario.' : undefined;

  const pedirConfirmacion = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIntentado(true);
    if (objetivo !== '') setConfirmando(true);
  };

  const restablecer = async () => {
    const respuesta = await accion.ejecutar(() => restablecerClave(objetivo), {
      avisarError: false,
    });
    setConfirmando(false);
    if (respuesta?.ok) {
      setResultado(respuesta.valor);
      setUsuario('');
      setIntentado(false);
    }
  };

  return (
    <section
      aria-labelledby="titulo-restablecer"
      className="flex max-w-xl flex-col gap-4 rounded-2xl border border-saie-divider bg-white p-5"
    >
      <h2 id="titulo-restablecer" className="m-0 text-lg font-bold text-saie-text">
        Restablecer la clave de un usuario
      </h2>

      {resultado ? (
        <ClaveGenerada resultado={resultado} onListo={() => setResultado(null)} />
      ) : (
        <form onSubmit={pedirConfirmacion} noValidate className="flex flex-col gap-4">
          <p className="m-0 text-sm text-saie-muted">
            Si un alumno o docente olvidó su clave, genera una nueva. Solo aplica a alumnos y
            docentes: las cuentas de Coordinación y de Jefatura no se restablecen aquí.
          </p>
          {accion.error && <Aviso tono="error">{accion.error}</Aviso>}
          <CampoFormulario
            id="restablecer-usuario"
            etiqueta="Código o correo del usuario"
            valor={usuario}
            onCambio={(valor) => {
              accion.limpiarError();
              setUsuario(valor);
            }}
            obligatorio
            maxLength={200}
            error={error}
          />
          <div>
            <Boton type="submit" variante="secundario" anchoCompleto>
              Restablecer clave
            </Boton>
          </div>
        </form>
      )}

      <DialogoConfirmacion
        abierto={confirmando}
        titulo="¿Restablecer esta clave?"
        descripcion={
          <>
            Se generará una clave nueva para «{objetivo}». La clave actual dejará de servir y la
            persona deberá cambiarla en su próximo ingreso.
          </>
        }
        textoConfirmar="Sí, restablecer"
        variante="peligro"
        cargando={accion.cargando}
        textoCargando="Restableciendo…"
        onConfirmar={() => void restablecer()}
        onCancelar={() => setConfirmando(false)}
      />
    </section>
  );
};

/**
 * Claves del panel. Todos los roles del panel cambian su propia clave (Issue 4.21); solo
 * Coordinación Académica restablece las de alumnos y docentes (Issue 4.26).
 */
export const ClavesAdminPage: React.FC = () => {
  const { sesion } = useAuth();
  const esCoordinacion = sesion?.rol === 'COORDINACION_ACADEMICA';

  return (
    <LayoutAdmin titulo="Claves y contraseñas" subtitulo={sesion ? ROL[sesion.rol] : undefined}>
      <section
        aria-labelledby="titulo-cambiar"
        className="flex max-w-xl flex-col gap-4 rounded-2xl border border-saie-divider bg-white p-5"
      >
        <h2 id="titulo-cambiar" className="m-0 text-lg font-bold text-saie-text">
          Cambiar mi clave
        </h2>
        <FormularioCambioClave />
      </section>

      {esCoordinacion && <RestablecerClave />}
    </LayoutAdmin>
  );
};

export default ClavesAdminPage;

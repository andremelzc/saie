import React, { useEffect, useId, useRef, useState } from 'react';
import type { ErroresFormulario, ValoresFormulario } from '../../utils/perfil';
import { Aviso } from '../ui/Aviso';
import { Icono } from './ElementosHorario';

const TRAZO_LAPIZ =
  'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z';
const TRAZO_CHECK = 'M5 13l4 4L19 7';

export interface CampoPerfil {
  clave: string;
  etiqueta: string;
  tipo: 'texto' | 'fecha' | 'telefono' | 'numero' | 'select' | 'area' | 'checkbox';
  opciones?: readonly string[];
  /** Texto de ayuda bajo el campo (p. ej. «8 dígitos»). */
  ayuda?: string;
  placeholder?: string;
  autoComplete?: string;
  /** Máximo para campos de fecha (AAAA-MM-DD). */
  max?: string;
  /** Cómo mostrar el valor en modo lectura (p. ej. fecha con nombre de mes). */
  formatoLectura?: (valor: string) => string;
}

export interface SeccionEditableProps {
  /** Identificador único de la sección (se usa para enlazar etiquetas y errores). */
  id: string;
  titulo: string;
  descripcion?: string;
  trazoIcono: string;
  campos: CampoPerfil[];
  valores: ValoresFormulario;
  /** Devuelve los errores por campo; si no hay ninguno, se guarda. */
  validar: (valores: ValoresFormulario) => ErroresFormulario;
  /** Guarda los cambios. Si lanza un error, la sección queda en edición con un aviso. */
  onGuardar: (valores: ValoresFormulario) => Promise<void>;
  /** Mensaje cuando la sección no tiene ningún dato registrado. */
  textoVacio?: string;
  /** Contenido destacado sobre los campos (p. ej. aviso de privacidad). */
  aviso?: React.ReactNode;
}

const CLASES_CAMPO =
  'min-h-12 w-full rounded-xl border bg-white px-4 text-base text-saie-text placeholder:text-saie-muted/70';

const CLASES_BOTON_BASE =
  'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Tarjeta con dos modos: lectura (lista de datos) y edición (formulario). Valida antes de
 * guardar, muestra el error de cada campo junto a él y devuelve el foco a donde corresponde.
 */
export const SeccionEditable: React.FC<SeccionEditableProps> = ({
  id,
  titulo,
  descripcion,
  trazoIcono,
  campos,
  valores,
  validar,
  onGuardar,
  textoVacio,
  aviso,
}) => {
  const idBase = useId();
  const idTitulo = `${idBase}-titulo`;
  const [modo, setModo] = useState<'lectura' | 'edicion'>('lectura');
  const [borrador, setBorrador] = useState<ValoresFormulario>(valores);
  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [guardando, setGuardando] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [confirmacion, setConfirmacion] = useState(false);

  const botonEditarRef = useRef<HTMLButtonElement>(null);
  const modoAnterior = useRef(modo);
  const idPrimerCampo = `${id}-${campos[0]?.clave}`;

  // Lleva el foco al primer campo al editar y de vuelta al botón al terminar.
  useEffect(() => {
    if (modoAnterior.current === modo) return;
    modoAnterior.current = modo;
    if (modo === 'edicion') document.getElementById(idPrimerCampo)?.focus();
    else botonEditarRef.current?.focus();
  }, [modo, idPrimerCampo]);

  const sinDatos = campos.every((campo) => !valores[campo.clave]);

  const empezarEdicion = () => {
    setBorrador(valores);
    setErrores({});
    setErrorGeneral(null);
    setConfirmacion(false);
    setModo('edicion');
  };

  const cancelar = () => {
    setErrores({});
    setErrorGeneral(null);
    setModo('lectura');
  };

  const cambiarCampo = (clave: string, valor: string) => {
    setBorrador((actual) => ({ ...actual, [clave]: valor }));
    if (errores[clave]) {
      setErrores((actuales) => {
        const resto = { ...actuales };
        delete resto[clave];
        return resto;
      });
    }
  };

  const guardar = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (guardando) return;

    const erroresEncontrados = validar(borrador);
    setErrores(erroresEncontrados);
    setErrorGeneral(null);
    const primerError = campos.find((campo) => erroresEncontrados[campo.clave]);
    if (primerError) {
      document.getElementById(`${id}-${primerError.clave}`)?.focus();
      return;
    }

    setGuardando(true);
    try {
      await onGuardar(borrador);
      setConfirmacion(true);
      setModo('lectura');
    } catch {
      setErrorGeneral(
        'No se pudieron guardar los cambios. Revisa tu conexión e inténtalo de nuevo.',
      );
    } finally {
      setGuardando(false);
    }
  };

  const renderLectura = () => {
    if (sinDatos && textoVacio) {
      return <p className="m-0 text-sm text-saie-muted">{textoVacio}</p>;
    }
    return (
      <dl className="m-0 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {campos.map((campo) => {
          const valor = valores[campo.clave];
          // La casilla es binaria: el valor vacío significa «no», no «sin registrar».
          const texto = campo.tipo === 'checkbox' ? (valor === 'true' ? 'Sí' : 'No') : valor;
          return (
            <div key={campo.clave} className="min-w-0">
              <dt className="text-xs font-medium uppercase tracking-wide text-saie-muted">
                {campo.etiqueta}
              </dt>
              <dd className="m-0 mt-1 break-words text-base text-saie-text">
                {texto ? (
                  campo.formatoLectura ? (
                    campo.formatoLectura(texto)
                  ) : (
                    texto
                  )
                ) : (
                  <span className="text-saie-muted italic">Sin registrar</span>
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    );
  };

  const renderCampo = (campo: CampoPerfil) => {
    const idCampo = `${id}-${campo.clave}`;
    const idAyuda = `${idCampo}-ayuda`;
    const idError = `${idCampo}-error`;
    const error = errores[campo.clave];
    const describedBy = [campo.ayuda ? idAyuda : null, error ? idError : null]
      .filter(Boolean)
      .join(' ');
    const comunes = {
      id: idCampo,
      name: campo.clave,
      value: borrador[campo.clave] ?? '',
      'aria-invalid': error ? true : undefined,
      'aria-describedby': describedBy || undefined,
      className: `${CLASES_CAMPO} ${error ? 'border-saie-danger' : 'border-saie-divider'}`,
    };

    let control: React.ReactNode;
    if (campo.tipo === 'checkbox') {
      // Casilla binaria: el valor vacío es «no», así el formulario sigue siendo de texto.
      control = (
        <div className="flex min-h-12 items-center">
          <input
            id={idCampo}
            name={campo.clave}
            type="checkbox"
            checked={borrador[campo.clave] === 'true'}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy || undefined}
            className="h-6 w-6 cursor-pointer accent-saie-primary"
            onChange={(e) => cambiarCampo(campo.clave, e.target.checked ? 'true' : '')}
          />
        </div>
      );
    } else if (campo.tipo === 'select') {
      control = (
        <select {...comunes} onChange={(e) => cambiarCampo(campo.clave, e.target.value)}>
          <option value="">Sin registrar</option>
          {campo.opciones?.map((opcion) => (
            <option key={opcion} value={opcion}>
              {opcion}
            </option>
          ))}
        </select>
      );
    } else if (campo.tipo === 'area') {
      control = (
        <textarea
          {...comunes}
          rows={3}
          placeholder={campo.placeholder}
          className={`${comunes.className} py-3`}
          onChange={(e) => cambiarCampo(campo.clave, e.target.value)}
        />
      );
    } else {
      const tipoInput = { texto: 'text', fecha: 'date', telefono: 'tel', numero: 'text' }[
        campo.tipo
      ];
      control = (
        <input
          {...comunes}
          type={tipoInput}
          inputMode={campo.tipo === 'numero' ? 'numeric' : undefined}
          autoComplete={campo.autoComplete}
          placeholder={campo.placeholder}
          max={campo.max}
          onChange={(e) => cambiarCampo(campo.clave, e.target.value)}
        />
      );
    }

    return (
      <div key={campo.clave} className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor={idCampo} className="text-sm font-medium text-saie-text">
          {campo.etiqueta}
        </label>
        {control}
        {campo.ayuda && (
          <p id={idAyuda} className="m-0 text-xs text-saie-muted">
            {campo.ayuda}
          </p>
        )}
        {error && (
          <p id={idError} className="m-0 text-sm font-medium text-saie-danger">
            {error}
          </p>
        )}
      </div>
    );
  };

  return (
    <section
      aria-labelledby={idTitulo}
      className="rounded-2xl border border-saie-divider bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-saie-primary/10 text-saie-primary"
          >
            <Icono trazo={trazoIcono} className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 id={idTitulo} className="m-0 text-xl font-bold leading-7">
              {titulo}
            </h2>
            {descripcion && <p className="m-0 mt-0.5 text-sm text-saie-muted">{descripcion}</p>}
          </div>
        </div>
        {modo === 'lectura' && (
          <button
            ref={botonEditarRef}
            type="button"
            onClick={empezarEdicion}
            aria-label={`${sinDatos && textoVacio ? 'Completar' : 'Editar'} ${titulo.toLowerCase()}`}
            className={`${CLASES_BOTON_BASE} border border-saie-primary text-saie-primary hover:bg-saie-primary/5`}
          >
            <Icono trazo={TRAZO_LAPIZ} className="h-4 w-4" />
            {sinDatos && textoVacio ? 'Completar' : 'Editar'}
          </button>
        )}
      </div>

      {aviso && <div className="mt-4">{aviso}</div>}

      <div className="mt-5">
        {confirmacion && modo === 'lectura' && (
          <p
            role="status"
            className="m-0 mb-4 flex items-center gap-2 rounded-xl bg-saie-success-soft px-4 py-3 text-sm font-medium text-saie-success-strong"
          >
            <Icono trazo={TRAZO_CHECK} className="h-4 w-4 shrink-0" />
            Cambios guardados.
          </p>
        )}

        {modo === 'lectura' ? (
          renderLectura()
        ) : (
          <form onSubmit={guardar} noValidate aria-label={`Editar ${titulo.toLowerCase()}`}>
            <div className="grid gap-4 sm:grid-cols-2">
              {campos.map((campo) => (
                <div
                  key={campo.clave}
                  className={
                    campo.tipo === 'area' ||
                    campo.tipo === 'checkbox' ||
                    campo.clave === 'direccion'
                      ? 'sm:col-span-2'
                      : ''
                  }
                >
                  {renderCampo(campo)}
                </div>
              ))}
            </div>

            {errorGeneral && (
              <Aviso tono="error" className="mt-4">
                {errorGeneral}
              </Aviso>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={guardando}
                className={`${CLASES_BOTON_BASE} bg-saie-primary text-white hover:bg-saie-primary-dark`}
              >
                {guardando ? 'Guardando…' : 'Guardar cambios'}
              </button>
              <button
                type="button"
                onClick={cancelar}
                disabled={guardando}
                className={`${CLASES_BOTON_BASE} border border-saie-divider bg-white text-saie-text hover:bg-saie-canvas`}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
};

export default SeccionEditable;

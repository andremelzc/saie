import React, { useState } from 'react';
import { CLASE_CAMPO, CLASE_ETIQUETA } from '../ui/campos';
import { DialogoConfirmacion } from '../ui/DialogoConfirmacion';

const MIN_MOTIVO = 5;
const MAX_MOTIVO = 500;

export interface DialogoRechazoSolicitudProps {
  titulo: string;
  /** Prefijo de los ids del campo y su error. */
  idBase: string;
  /** Quién verá el motivo: «el alumno», «el docente». */
  destinatario: string;
  textoConfirmar: string;
  cargando: boolean;
  onConfirmar: (motivo: string) => void;
  onCancelar: () => void;
}

/**
 * Diálogo para rechazar una solicitud con motivo obligatorio (Issues 3.60 y 7.17). Se monta al
 * abrirlo, así cada rechazo empieza con el motivo vacío.
 */
export const DialogoRechazoSolicitud: React.FC<DialogoRechazoSolicitudProps> = ({
  titulo,
  idBase,
  destinatario,
  textoConfirmar,
  cargando,
  onConfirmar,
  onCancelar,
}) => {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const idCampo = `motivo-rechazo-${idBase}`;
  const idError = `error-motivo-${idBase}`;

  const confirmar = () => {
    const texto = motivo.trim();
    if (texto.length < MIN_MOTIVO) {
      setError(
        `Escribe el motivo del rechazo (al menos ${MIN_MOTIVO} caracteres): ${destinatario} lo verá.`,
      );
      return;
    }
    onConfirmar(texto);
  };

  return (
    <DialogoConfirmacion
      abierto
      titulo={titulo}
      variante="peligro"
      descripcion={
        <span className="flex flex-col gap-2">
          <label htmlFor={idCampo} className={CLASE_ETIQUETA}>
            Motivo del rechazo (obligatorio, {destinatario} lo verá)
          </label>
          <textarea
            id={idCampo}
            value={motivo}
            maxLength={MAX_MOTIVO}
            rows={3}
            onChange={(e) => {
              setMotivo(e.target.value);
              setError(null);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? idError : undefined}
            className={`${CLASE_CAMPO} py-2`}
          />
          {error && (
            <span id={idError} role="alert" className="text-sm text-saie-danger-strong">
              {error}
            </span>
          )}
        </span>
      }
      textoConfirmar={textoConfirmar}
      cargando={cargando}
      textoCargando="Rechazando…"
      onConfirmar={confirmar}
      onCancelar={onCancelar}
    />
  );
};

export default DialogoRechazoSolicitud;

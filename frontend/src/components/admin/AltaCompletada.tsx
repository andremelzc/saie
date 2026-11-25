import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { RUTAS } from '../../config/rutas';
import type { UsuarioCreadoDTO } from '../../types/admin';
import { Boton } from '../ui/Boton';
import { clasesBoton } from '../ui/clasesBoton';

export interface AltaCompletadaProps {
  usuario: UsuarioCreadoDTO;
  /** «alumno» o «docente», para el texto. */
  tipo: 'alumno' | 'docente';
  onOtro: () => void;
}

/**
 * Resultado de un alta individual. La clave inicial de estas cuentas es el propio código
 * (contrato de `POST /admin/alumnos` y `/admin/docentes`, Issues 4.17 y 4.18) y la cuenta debe
 * cambiarla en su primer ingreso. El foco pasa aquí para que el lector de pantalla lo anuncie.
 */
export const AltaCompletada: React.FC<AltaCompletadaProps> = ({ usuario, tipo, onOtro }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="status"
      className="flex flex-col gap-4 rounded-2xl border border-saie-success/30 bg-saie-success-soft p-5 text-saie-success-strong outline-none focus-visible:ring-3 focus-visible:ring-saie-primary/30"
    >
      <h2 className="m-0 text-lg font-bold">
        Se dio de alta {tipo === 'alumno' ? 'al alumno' : 'al docente'} {usuario.nombre}
      </h2>
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-saie-text">
        <dt className="font-semibold">Usuario</dt>
        <dd className="m-0 break-all font-mono">{usuario.codigo}</dd>
        <dt className="font-semibold">Clave inicial</dt>
        <dd className="m-0">
          Es su propio código (<span className="break-all font-mono">{usuario.codigo}</span>).
        </dd>
      </dl>
      <p className="m-0 text-sm text-saie-text">
        Ya puede iniciar sesión. El sistema le pedirá una clave nueva en su primer ingreso.
      </p>
      <div className="flex flex-wrap gap-3">
        <Boton onClick={onOtro} anchoCompleto>
          Dar de alta a otro {tipo}
        </Boton>
        <Link to={RUTAS.inicioAdmin} className={clasesBoton('secundario', 'md', true)}>
          Volver al inicio
        </Link>
      </div>
    </div>
  );
};

export default AltaCompletada;

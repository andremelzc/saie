import React, { useState } from 'react';
import { Boton } from '../ui/Boton';
import { DialogoConfirmacion } from '../ui/DialogoConfirmacion';
import { useAccion } from '../../hooks/useAccion';
import { invalidarCacheCarga, useCarga } from '../../hooks/useCarga';
import { ejecutarReorganizacion, obtenerReorganizacion } from '../../services/admin';
import { frasesSimulacion } from '../../utils/reorganizacion';
import { plural } from '../../utils/texto';

const CLAVE = 'reorganizacion';

/**
 * «Reorganizar con prioridad» (Issue 2.26, riesgo R9). Solo aparece durante las primeras semanas del
 * ciclo: procesa primero las secciones en revisión y puede mover a otras de aula. Antes de confirmar
 * muestra cuántas cambiarían; los alumnos afectados reciben el aviso por Telegram.
 */
export const ReorganizacionPrioridad: React.FC<{
  deshabilitado?: boolean;
  onTerminar: () => void;
}> = ({ deshabilitado = false, onTerminar }) => {
  const vista = useCarga(obtenerReorganizacion, { clave: CLAVE });
  const accion = useAccion();
  const [confirmando, setConfirmando] = useState(false);

  const datos = vista.datos;
  // Fuera de la ventana (o sin datos) no se ofrece: la salida es la asignación manual.
  if (!datos?.disponible || !datos.simulacion) return null;
  const sinEscaladas = datos.simulacion.totalEscaladas === 0;

  async function confirmar() {
    const resultado = await accion.ejecutar(() => ejecutarReorganizacion(), {
      exito: (r) =>
        `Reorganización hecha: ${plural(r.asignadas, 'sección con aula nueva', 'secciones con aula nueva')} y ${plural(r.escaladas, 'en revisión', 'en revisión')}.`,
    });
    setConfirmando(false);
    if (resultado?.ok) {
      invalidarCacheCarga(CLAVE);
      vista.recargar();
      onTerminar();
    }
  }

  return (
    <>
      <Boton
        variante="secundario"
        tamano="sm"
        onClick={() => setConfirmando(true)}
        disabled={deshabilitado || sinEscaladas}
        motivoDeshabilitado={
          sinEscaladas
            ? 'No hay secciones en revisión que priorizar.'
            : deshabilitado
              ? 'Espera a que termine la asignación en curso.'
              : undefined
        }
      >
        Reorganizar con prioridad
      </Boton>
      <DialogoConfirmacion
        abierto={confirmando}
        titulo="¿Reorganizar dando prioridad a las secciones en revisión?"
        variante="peligro"
        descripcion={
          <span className="flex flex-col gap-2">
            <span>
              Disponible al inicio del ciclo (hasta el {datos.hasta}). Se procesan primero las
              secciones en revisión y otras pueden cambiar de aula:
            </span>
            <ul className="m-0 flex list-disc flex-col gap-1 pl-5">
              {frasesSimulacion(datos.simulacion).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <span>Los alumnos de las secciones que cambian reciben el aviso por Telegram.</span>
          </span>
        }
        textoConfirmar="Sí, reorganizar"
        cargando={accion.cargando}
        textoCargando="Reorganizando…"
        onConfirmar={confirmar}
        onCancelar={() => setConfirmando(false)}
      />
    </>
  );
};

export default ReorganizacionPrioridad;

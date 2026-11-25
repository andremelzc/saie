import React, { useState } from 'react';
import { Aviso } from '../ui/Aviso';
import { Boton } from '../ui/Boton';
import { Campo } from '../ui/Campo';
import { CLASE_CAMPO } from '../ui/campos';
import { EstadoError } from '../ui/EstadoError';
import { useAccion } from '../../hooks/useAccion';
import { useCarga } from '../../hooks/useCarga';
import {
  declararAccesibilidadDocente,
  obtenerAccesibilidadDocente,
} from '../../services/accesibilidad';
import type { AccesibilidadDocenteDTO } from '../../types/accesibilidad';
import { formatearFechaCivil, formatearFechaCorta } from '../../utils/fechas';
import { validarFechaFinCondicion } from '../../utils/perfil';

const CLAVE = 'docente:accesibilidad';

/** « hasta el 20 de diciembre de 2026» o vacío si no vence. */
function textoHasta(fecha: string | null | undefined): string {
  return fecha ? ` hasta el ${formatearFechaCivil(fecha) ?? fecha}` : '';
}

/** Qué ve el docente según el estado de su declaración. */
function EstadoActual({ datos }: { datos: AccesibilidadDocenteDTO }): React.ReactNode {
  const s = datos.solicitud;
  if (datos.aprobada) {
    return (
      <Aviso tono="exito" role="status">
        <strong className="font-semibold">Aprobada.</strong> El sistema prioriza aulas del piso 1
        para tus secciones{textoHasta(datos.vigenteHasta)}.
      </Aviso>
    );
  }
  if (s?.estado === 'PENDIENTE') {
    return (
      <Aviso tono="advertencia" role="status">
        <strong className="font-semibold">Pendiente.</strong> Coordinación Académica la está
        revisando (la enviaste el {formatearFechaCorta(s.fechaSolicitud)}
        {s.fechaFin ? `, la pediste${textoHasta(s.fechaFin)}` : ''}). Mientras tanto tus aulas no
        cambian.
      </Aviso>
    );
  }
  if (s?.estado === 'RECHAZADA') {
    return (
      <Aviso tono="error" role="status">
        <strong className="font-semibold">No aprobada.</strong>{' '}
        {s.motivoRechazo ?? 'Coordinación Académica no la aprobó.'} Si tu situación cambió, puedes
        volver a pedirla.
      </Aviso>
    );
  }
  return null;
}

/**
 * Issue 3.61 (riesgo R15): el docente declara que no puede subir a pisos superiores, con la misma
 * aprobación de Coordinación que los alumnos (Issue 3.60). Si la condición es temporal (R16),
 * indica hasta cuándo: ese día se quita la marca y sus secciones se reasignan.
 */
export const AccesibilidadDocente: React.FC = () => {
  const { datos, error, recargar } = useCarga(obtenerAccesibilidadDocente, { clave: CLAVE });
  const accion = useAccion();
  const [fechaFin, setFechaFin] = useState('');
  const [errorFecha, setErrorFecha] = useState<string | null>(null);

  const declarada = datos?.aprobada === true || datos?.solicitud?.estado === 'PENDIENTE';

  async function enviar(declarado: boolean) {
    if (declarado) {
      const errorEncontrado = validarFechaFinCondicion(fechaFin);
      setErrorFecha(errorEncontrado);
      if (errorEncontrado) return;
    }
    const resultado = await accion.ejecutar(
      () =>
        declararAccesibilidadDocente(
          declarado ? { declarado, fechaFin: fechaFin || null } : { declarado },
        ),
      {
        exito: declarado
          ? 'Solicitud enviada. Coordinación la revisará.'
          : 'Listo: ya no pides aulas en el piso 1.',
      },
    );
    if (resultado?.ok) {
      setFechaFin('');
      recargar();
    }
  }

  return (
    <section
      aria-labelledby="titulo-accesibilidad-docente"
      className="flex flex-col gap-3 rounded-2xl border border-saie-divider bg-white p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 id="titulo-accesibilidad-docente" className="m-0 text-base font-bold">
          Aulas en el piso 1
        </h2>
        <p className="m-0 text-sm text-saie-muted">
          ¿Tienes una condición que te impide subir a pisos superiores? Pídelo aquí: al aprobarlo
          Coordinación Académica, el sistema prioriza aulas del piso 1 para tus secciones. Es un
          requisito de acceso al espacio, no hace falta que expliques tu condición.
        </p>
      </div>

      {error && <EstadoError mensaje={error} onReintentar={recargar} />}
      {datos && <EstadoActual datos={datos} />}

      {datos && !declarada && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-56 flex-col gap-1">
            <Campo
              etiqueta="¿Hasta cuándo? (solo si es temporal)"
              ayuda="Déjala vacía si no tiene fin."
            >
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => {
                  setFechaFin(e.target.value);
                  setErrorFecha(null);
                }}
                aria-invalid={errorFecha ? true : undefined}
                aria-describedby={errorFecha ? 'error-fin-accesibilidad-docente' : undefined}
                className={CLASE_CAMPO}
              />
            </Campo>
            {errorFecha && (
              <p
                id="error-fin-accesibilidad-docente"
                role="alert"
                className="m-0 text-sm text-saie-danger-strong"
              >
                {errorFecha}
              </p>
            )}
          </div>
          <Boton onClick={() => enviar(true)} cargando={accion.cargando} textoCargando="Enviando…">
            Pedir aulas en el piso 1
          </Boton>
        </div>
      )}

      {datos && declarada && (
        <Boton
          variante="secundario"
          tamano="sm"
          claseContenedor="self-start"
          onClick={() => enviar(false)}
          cargando={accion.cargando}
          textoCargando="Guardando…"
        >
          {datos.aprobada ? 'Ya no lo necesito' : 'Retirar la solicitud'}
        </Boton>
      )}
    </section>
  );
};

export default AccesibilidadDocente;

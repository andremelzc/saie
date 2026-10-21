import React, { useState } from 'react';
import CabeceraPantalla from '../components/estudiante/CabeceraPantalla';
import { Contenedor } from '../components/ui/Contenedor';
import { ID_CONTENIDO } from '../components/ui/EnlaceSaltar';
import { aplicarPreferencias, guardarPreferencias, leerPreferencias } from '../utils/preferencias';
import type { PreferenciasApp } from '../utils/preferencias';

const TRAZO_AJUSTES =
  'M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75';

interface OpcionPreferencia {
  clave: keyof PreferenciasApp;
  titulo: string;
  descripcion: string;
}

const OPCIONES: OpcionPreferencia[] = [
  {
    clave: 'textoGrande',
    titulo: 'Texto grande',
    descripcion: 'Aumenta el tamaño del texto en toda la app.',
  },
  {
    clave: 'reducirMovimiento',
    titulo: 'Reducir movimiento',
    descripcion: 'Quita las animaciones y transiciones.',
  },
];

const Interruptor: React.FC<{
  id: string;
  activo: boolean;
  onCambio: (activo: boolean) => void;
  etiquetaPor: string;
}> = ({ id, activo, onCambio, etiquetaPor }) => (
  <button
    id={id}
    type="button"
    role="switch"
    aria-checked={activo}
    aria-labelledby={etiquetaPor}
    onClick={() => onCambio(!activo)}
    className={`relative h-8 w-14 shrink-0 cursor-pointer rounded-full border transition-colors focus-visible:outline-3 focus-visible:outline-saie-text ${
      activo ? 'border-saie-primary bg-saie-primary' : 'border-saie-border bg-saie-divider'
    }`}
  >
    <span
      aria-hidden="true"
      className={`absolute left-[3px] top-[3px] h-6 w-6 rounded-full bg-white shadow transition-transform ${
        activo ? 'translate-x-6' : 'translate-x-0'
      }`}
    />
  </button>
);

/**
 * Pantalla «Configuración» del alumno (Issue 3.17): preferencias de accesibilidad de la app en
 * este dispositivo (texto grande, reducir movimiento). El backend no guarda preferencias: se
 * guardan en el navegador. Cerrar sesión vive en la cabecera del inicio, y la ayuda, en su icono.
 */
export const ConfiguracionAlumno: React.FC = () => {
  const [preferencias, setPreferencias] = useState<PreferenciasApp>(leerPreferencias);
  const [guardado, setGuardado] = useState(false);

  const cambiar = (clave: keyof PreferenciasApp, valor: boolean): void => {
    const nuevas = { ...preferencias, [clave]: valor };
    setPreferencias(nuevas);
    guardarPreferencias(nuevas);
    aplicarPreferencias(nuevas);
    setGuardado(true);
  };

  return (
    <div className="min-h-screen bg-saie-canvas text-saie-text">
      <CabeceraPantalla
        titulo="Configuración"
        subtitulo="Ajusta la app a tu comodidad."
        trazoIcono={TRAZO_AJUSTES}
        ancho="lectura"
      />

      <Contenedor
        como="main"
        ancho="lectura"
        id={ID_CONTENIDO}
        tabIndex={-1}
        className="flex flex-col gap-3 py-6 focus:outline-none"
      >
        <section
          aria-labelledby="config-accesibilidad"
          className="flex flex-col gap-2 rounded-2xl border border-saie-divider bg-white p-5 shadow-sm sm:p-6"
        >
          <div>
            <h2 id="config-accesibilidad" className="m-0 text-xl font-bold">
              Accesibilidad
            </h2>
            <p className="m-0 mt-1 text-sm text-saie-muted">
              Estos ajustes se guardan solo en este dispositivo.
            </p>
          </div>
          <ul className="m-0 flex list-none flex-col divide-y divide-saie-divider p-0">
            {OPCIONES.map((o) => (
              <li key={o.clave} className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p id={`pref-${o.clave}-t`} className="m-0 font-medium">
                    {o.titulo}
                  </p>
                  <p className="m-0 text-sm text-saie-muted">{o.descripcion}</p>
                </div>
                <Interruptor
                  id={`pref-${o.clave}`}
                  activo={preferencias[o.clave]}
                  onCambio={(v) => cambiar(o.clave, v)}
                  etiquetaPor={`pref-${o.clave}-t`}
                />
              </li>
            ))}
          </ul>
        </section>
        <p role="status" className="m-0 min-h-5 px-1 text-sm text-saie-muted">
          {guardado ? 'Cambio guardado en este dispositivo.' : ''}
        </p>
      </Contenedor>
    </div>
  );
};

export default ConfiguracionAlumno;

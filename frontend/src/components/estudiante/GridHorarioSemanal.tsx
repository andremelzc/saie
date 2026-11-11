import React, { useState } from 'react';
import type { DiaSemana } from '../../types/consulta';
import type { HorarioSemanalDTO, SesionDTO } from '../../types/horario';
import {
  ALTO_HORA_PX,
  DIAS_LECTIVOS,
  ETIQUETA_DIA,
  PALETA_CURSOS,
  etiquetaTipoEspacio,
  formatearRango,
  horasDeRango,
  posicionBloque,
  rangoDeHorario,
  resumenUbicacion,
  sesionesDeDia,
} from '../../utils/horario';
import type { ColorCurso } from '../../utils/horario';
import { Drawer } from '../ui/Drawer';
import { EstadoAsignacion } from '../ui/EstadoAsignacion';

export interface GridHorarioSemanalProps {
  horario: HorarioSemanalDTO;
  /** Color de cada curso, por código (ver `asignarColoresCursos`). */
  colores: Record<string, ColorCurso>;
  /** Día actual, para resaltar su columna. */
  hoy?: DiaSemana;
  className?: string;
}

const COLUMNAS = 'grid grid-cols-[3.5rem_repeat(6,minmax(7rem,1fr))]';
/** Alto mínimo de un bloque: una clase corta no pierde su código ni su hora. */
const ALTO_MINIMO_BLOQUE_PX = 48;

function etiquetaHora(hora: number): string {
  return `${String(hora).padStart(2, '0')}:00`;
}

function nombrePabellon(nombre: string): string {
  return /pabell/i.test(nombre) ? nombre : `Pabellón ${nombre}`;
}

/** Todos los datos de una clase, en el drawer que abre su bloque. */
const DetalleSesion: React.FC<{ sesion: SesionDTO }> = ({ sesion }) => (
  <dl className="m-0 flex flex-col gap-4 text-base">
    <div>
      <dt className="text-sm text-saie-muted">Curso</dt>
      <dd className="m-0 font-semibold">
        {sesion.codigoCurso} · {sesion.nombreCurso}
      </dd>
    </div>
    <div>
      <dt className="text-sm text-saie-muted">Sección</dt>
      <dd className="m-0">{sesion.codigoSeccion}</dd>
    </div>
    <div>
      <dt className="text-sm text-saie-muted">Docente</dt>
      <dd className="m-0">{sesion.docenteNombre ?? 'Por asignar'}</dd>
    </div>
    <div>
      <dt className="text-sm text-saie-muted">Horario</dt>
      <dd className="m-0">
        {ETIQUETA_DIA[sesion.diaSemana]}, {formatearRango(sesion.horaInicio, sesion.horaFin)}
      </dd>
    </div>
    <div>
      <dt className="text-sm text-saie-muted">Aula o laboratorio</dt>
      <dd className="m-0 flex flex-col gap-1">
        {sesion.espacios.length === 0 ? (
          <span>Por asignar</span>
        ) : (
          sesion.espacios.map((e) => (
            <span key={e.id}>
              {etiquetaTipoEspacio(e.tipo)} {e.identificador} · {nombrePabellon(e.pabellon)}, piso{' '}
              {e.piso}
            </span>
          ))
        )}
        <span>
          <EstadoAsignacion
            estado={sesion.estadoAsignacion}
            cantidadEspacios={sesion.espacios.length}
          />
        </span>
      </dd>
    </div>
  </dl>
);

/**
 * Grilla semanal de lunes a sábado (Guía de diseño 2.3). Issue 3.39: el rango de horas se ajusta
 * a las clases, cada bloque tiene un alto mínimo y es un botón que abre su detalle completo
 * (curso, sección, docente, aula y hora) en un drawer, y la región con desplazamiento horizontal
 * se alcanza con el teclado.
 */
export const GridHorarioSemanal: React.FC<GridHorarioSemanalProps> = ({
  horario,
  colores,
  hoy,
  className = '',
}) => {
  const [abierta, setAbierta] = useState<SesionDTO | null>(null);
  const rango = rangoDeHorario(horario);
  const horas = horasDeRango(rango);
  const altoTotal = horas.length * ALTO_HORA_PX;

  return (
    <>
      <section
        role="region"
        tabIndex={0}
        aria-label="Horario semanal de lunes a sábado"
        className={`overflow-x-auto rounded-xl border border-saie-divider bg-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-saie-primary ${className}`}
      >
        <div className="min-w-[48rem]">
          <div className={`${COLUMNAS} border-b border-saie-divider bg-saie-canvas`}>
            <div aria-hidden="true" />
            {DIAS_LECTIVOS.map((dia) => {
              const esHoy = dia === hoy;
              return (
                <div
                  key={dia}
                  className={`px-2 py-3 text-center text-sm ${
                    esHoy
                      ? 'border-b-4 border-saie-primary font-bold text-saie-primary'
                      : 'font-medium text-saie-text'
                  }`}
                >
                  <span>{ETIQUETA_DIA[dia]}</span>
                  {esHoy && <span className="block text-sm font-medium">Hoy</span>}
                </div>
              );
            })}
          </div>

          <div className={COLUMNAS}>
            <div aria-hidden="true" className="relative" style={{ height: altoTotal }}>
              {horas.map((hora, i) => (
                <span
                  key={hora}
                  className="absolute right-2 text-xs text-saie-muted"
                  style={{ top: i * ALTO_HORA_PX + 4 }}
                >
                  {etiquetaHora(hora)}
                </span>
              ))}
            </div>

            {DIAS_LECTIVOS.map((dia) => (
              <section
                key={dia}
                aria-label={ETIQUETA_DIA[dia]}
                className={`relative border-l border-saie-divider ${
                  dia === hoy ? 'bg-saie-primary/5' : ''
                }`}
                style={{ height: altoTotal }}
              >
                {horas.map((hora, i) => (
                  <div
                    key={hora}
                    aria-hidden="true"
                    className="absolute inset-x-0 border-t border-saie-divider"
                    style={{ top: i * ALTO_HORA_PX }}
                  />
                ))}

                <ul className="absolute inset-0 m-0 list-none p-0">
                  {sesionesDeDia(horario, dia).map((sesion) => {
                    const { top, height } = posicionBloque(
                      sesion.horaInicio,
                      sesion.horaFin,
                      rango,
                    );
                    const color = colores[sesion.codigoCurso] ?? PALETA_CURSOS[0];
                    return (
                      <li
                        key={`${sesion.seccionId}-${sesion.horaInicio}`}
                        className="absolute inset-x-1"
                        style={{
                          top: `${top}%`,
                          height: `calc(${height}% - 2px)`,
                          minHeight: ALTO_MINIMO_BLOQUE_PX,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setAbierta(sesion)}
                          className="flex h-full w-full flex-col overflow-hidden rounded-lg border px-2 py-1 text-left text-saie-text hover:brightness-95 focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-saie-primary"
                          style={{
                            backgroundColor: color.fondo,
                            borderColor: color.borde,
                          }}
                        >
                          <span className="block truncate text-sm font-bold leading-5">
                            {`${sesion.codigoCurso} · Sec. ${sesion.codigoSeccion}`}
                          </span>
                          <span className="block truncate text-xs leading-4">
                            {formatearRango(sesion.horaInicio, sesion.horaFin)}
                          </span>
                          <span className="block truncate text-xs leading-4 text-saie-muted">
                            {resumenUbicacion(sesion.espacios)}
                          </span>
                          <span className="sr-only">
                            {`: ${sesion.nombreCurso}. Ver detalle de la clase`}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </section>

      <Drawer
        abierto={abierta !== null}
        onCerrar={() => setAbierta(null)}
        titulo={abierta?.nombreCurso ?? ''}
        tamano="sm"
      >
        {abierta && <DetalleSesion sesion={abierta} />}
      </Drawer>
    </>
  );
};

export default GridHorarioSemanal;

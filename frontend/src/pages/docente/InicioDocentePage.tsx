import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PaginaDocente from '../../components/docente/PaginaDocente';
import { BadgeEstadoClase, Icono } from '../../components/estudiante/ElementosHorario';
import { EstadoError } from '../../components/ui/EstadoError';
import { ICONOS } from '../../components/ui/iconos';
import { RUTAS } from '../../config/rutas';
import { useCarga } from '../../hooks/useCarga';
import { CLAVE_HORARIO_DOCENTE, obtenerHorarioDocente } from '../../services/docente';
import { proximaClaseDocente } from '../../utils/docente';
import type { ProximaClase } from '../../utils/docente';
import {
  cuentaRegresiva,
  diaDeFecha,
  ETIQUETA_DIA,
  estadoDeClase,
  fechaActual,
  formatearRango,
  minutosDeFecha,
  resumenUbicacion,
} from '../../utils/horario';
import { plural } from '../../utils/texto';

const UN_MINUTO_MS = 60_000;

const TarjetaProximaClase: React.FC<{ proxima: ProximaClase | null; ahora: number }> = ({
  proxima,
  ahora,
}) => {
  if (!proxima) {
    return (
      <div className="flex flex-col gap-1">
        <h2 className="m-0 font-serif text-xl font-bold">No tienes clases programadas</h2>
        <p className="m-0 text-sm text-white/85">
          Cuando se asignen aulas a tus secciones, tu próxima clase aparecerá aquí.
        </p>
      </div>
    );
  }

  const { sesion, dia, esHoy } = proxima;
  const estado = esHoy ? estadoDeClase(sesion, ahora) : 'PROXIMA';
  const enCurso = estado === 'EN_CURSO';
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-sm font-bold text-white/85">
          {enCurso ? 'Clase en curso' : 'Tu próxima clase'}
        </p>
        {esHoy && <BadgeEstadoClase estado={estado} />}
      </div>
      <h2 className="m-0 font-serif text-2xl font-bold leading-8">{sesion.nombreCurso}</h2>
      <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-white/90">
        <li className="flex flex-wrap items-center gap-2">
          <span className="font-medium">
            {esHoy ? 'Hoy' : ETIQUETA_DIA[dia]} ·{' '}
            {formatearRango(sesion.horaInicio, sesion.horaFin)}
          </span>
          {esHoy && (
            <span
              className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-bold"
              aria-live="polite"
            >
              {cuentaRegresiva(sesion, ahora)}
            </span>
          )}
        </li>
        <li>
          Sección {sesion.codigoSeccion} · {resumenUbicacion(sesion.espacios)}
        </li>
      </ul>
    </div>
  );
};

interface Acceso {
  to: string;
  titulo: string;
  detalle: string;
  icono: string;
}

/**
 * Portada del portal docente (Issue 7.8): la próxima clase con su cuenta regresiva y accesos
 * rápidos. Los datos salen de GET /docente/horario (Issue 7.12).
 */
export const InicioDocentePage: React.FC<{ ahora?: Date }> = ({ ahora }) => {
  const { datos, cargando, error, recargar } = useCarga(obtenerHorarioDocente, {
    clave: CLAVE_HORARIO_DOCENTE,
  });
  const [referencia, setReferencia] = useState<Date>(ahora ?? fechaActual);

  // La cuenta regresiva se actualiza cada minuto (salvo en pruebas, con una hora fija).
  useEffect(() => {
    if (ahora) return undefined;
    const temporizador = setInterval(() => setReferencia(fechaActual()), UN_MINUTO_MS);
    return () => clearInterval(temporizador);
  }, [ahora]);

  const minutos = minutosDeFecha(referencia);
  const proxima = datos ? proximaClaseDocente(datos, diaDeFecha(referencia), minutos) : null;
  const secciones = datos?.asignacionesActivas.length ?? 0;

  const accesos: Acceso[] = [
    {
      to: RUTAS.horarioDocente,
      titulo: 'Mi horario y asignaciones',
      detalle: datos
        ? `${plural(secciones, 'sección activa', 'secciones activas')}`
        : 'Día y semana',
      icono: ICONOS.calendario,
    },
    {
      to: RUTAS.espaciosDocente,
      titulo: 'Espacios y equipos',
      detalle: 'Disponibilidad y estado de tu laboratorio',
      icono: ICONOS.edificio,
    },
    {
      to: RUTAS.incidenciasDocente,
      titulo: 'Reportar una incidencia',
      detalle: 'Equipos o software con problemas',
      icono: ICONOS.alerta,
    },
    {
      to: RUTAS.solicitudesSoftwareDocente,
      titulo: 'Solicitar software',
      detalle: 'Pide uno que no está en el catálogo',
      icono: ICONOS.monitor,
    },
  ];

  return (
    <PaginaDocente
      titulo="Portal del docente"
      descripcion={datos?.periodo ? `Periodo ${datos.periodo}` : undefined}
      conVolver={false}
    >
      <section
        aria-label="Próxima clase"
        aria-busy={cargando && !datos}
        className="rounded-2xl bg-gradient-to-br from-saie-primary to-saie-primary-dark p-6 text-white shadow-sm"
      >
        {error ? (
          <p className="m-0 text-sm text-white/90">No pudimos cargar tu horario.</p>
        ) : cargando && !datos ? (
          <p className="m-0 text-sm text-white/85">Cargando tu próxima clase…</p>
        ) : (
          <TarjetaProximaClase proxima={proxima} ahora={minutos} />
        )}
      </section>

      {error && <EstadoError mensaje={error} onReintentar={recargar} />}

      <nav aria-label="Accesos rápidos">
        <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2">
          {accesos.map((a) => (
            <li key={a.to}>
              <Link
                to={a.to}
                className="flex min-h-20 items-center gap-3 rounded-xl border border-saie-divider bg-white p-4 text-saie-text no-underline shadow-sm hover:border-saie-primary"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-saie-primary/10 text-saie-primary">
                  <Icono trazo={a.icono} className="h-6 w-6" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-base font-semibold">{a.titulo}</span>
                  <span className="text-sm text-saie-muted">{a.detalle}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </PaginaDocente>
  );
};

export default InicioDocentePage;

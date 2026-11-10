import React, { useCallback } from 'react';
import { isAxiosError } from 'axios';
import LayoutAdmin, { AvisoError } from '../../components/admin/LayoutAdmin';
import { EsqueletoCarga, EstadoVacio } from '../../components/estudiante/ElementosHorario';
import { BotonEnlace } from '../../components/ui/BotonEnlace';
import { ICONOS } from '../../components/ui/iconos';
import { RUTAS } from '../../config/rutas';
import { BadgeEstado } from '../../components/ui/BadgeEstado';
import { Boton } from '../../components/ui/Boton';
import { CabeceraTabla, TablaDatos } from '../../components/ui/TablaDatos';
import { ZonaActualizable } from '../../components/ui/ZonaActualizable';
import { useCarga } from '../../hooks/useCarga';
import { usePeriodoFiltro } from '../../hooks/usePeriodoFiltro';
import SelectorPeriodo from '../../components/admin/SelectorPeriodo';
import { obtenerReporteAsignaciones } from '../../services/admin';
import { formatearFechaCorta } from '../../utils/fechas';
import { FiltrosActivos } from '../../components/ui/FiltrosActivos';

/**
 * Issue 4.33 — informe de salones.
 *
 * Es una vista imprimible: el mismo HTML sirve en pantalla y para generar el PDF con el
 * diálogo del navegador («Guardar como PDF»), sin dependencias nuevas ni maquetar un PDF a
 * mano. Las secciones sin aula aparecen marcadas: es justo lo que hay que revisar antes de
 * presentar el cuadro.
 */
export const ReporteSalones: React.FC = () => {
  const filtroPeriodo = usePeriodoFiltro();
  const periodo = filtroPeriodo.periodo;

  const cargar = useCallback(async () => {
    try {
      return await obtenerReporteAsignaciones(periodo || undefined);
    } catch (error) {
      // 404: no hay ningún periodo con secciones. No es un fallo: es el estado vacío (Issue 4.57).
      if (isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  }, [periodo]);

  const {
    datos,
    cargando: cargandoDatos,
    error,
    recargar,
  } = useCarga(cargar, {
    clave: `reporte:${periodo}`,
    // Se espera a saber cuál es el vigente para no pedir el informe dos veces.
    habilitado: filtroPeriodo.listo,
  });
  // Mientras no se sabe el periodo vigente tampoco hay datos: es carga, no «sin resultados».
  const cargando = cargandoDatos || !filtroPeriodo.listo;
  // `datos` es `null` mientras carga y también si no hay periodo: lo distingue `cargando`.
  const sinSecciones = !cargando && !error && (datos === null || datos.secciones.length === 0);

  const imprimir = () => {
    window.print();
  };

  return (
    <LayoutAdmin
      titulo="Informe de salones"
      subtitulo="Las secciones del periodo con el aula que tienen asignada, listo para presentar."
      acciones={
        <div className="flex flex-wrap gap-2 saie-no-imprimir">
          <Boton
            variante="secundario"
            onClick={recargar}
            cargando={cargando}
            textoCargando="Actualizando…"
          >
            Actualizar datos
          </Boton>
          <Boton variante="primario" onClick={imprimir} disabled={!datos || sinSecciones}>
            Imprimir o guardar como PDF
          </Boton>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <SelectorPeriodo filtro={filtroPeriodo} className="max-w-xs saie-no-imprimir" />
        <FiltrosActivos
          filtros={
            filtroPeriodo.cambiado
              ? [
                  {
                    id: 'periodo',
                    etiqueta: 'Periodo',
                    valor: filtroPeriodo.valor,
                    onQuitar: filtroPeriodo.restablecer,
                  },
                ]
              : []
          }
          onLimpiar={filtroPeriodo.restablecer}
        />

        {error && (
          <div className="saie-no-imprimir">
            <AvisoError mensaje={error} onReintentar={recargar} />
          </div>
        )}

        <ZonaActualizable actualizando={cargando && datos !== null}>
          {cargando && !datos ? (
            <EsqueletoCarga texto="Preparando el informe…" forma="tabla" />
          ) : sinSecciones ? (
            <EstadoVacio
              titulo="No hay secciones en este periodo"
              icono={ICONOS.documento}
              descripcion={
                filtroPeriodo.cambiado
                  ? `El periodo ${periodo} no tiene secciones cargadas. Revisa el periodo o carga los cursos y secciones.`
                  : 'Todavía no hay secciones cargadas. Carga los cursos y secciones para armar el informe.'
              }
              accion={
                <BotonEnlace to={RUTAS.cargaAdmin} variante="secundario" tamano="sm">
                  Ir a Carga de datos
                </BotonEnlace>
              }
            />
          ) : datos ? (
            <article className="flex flex-col gap-5">
              <header className="flex flex-wrap items-end justify-between gap-3 border-b border-saie-divider pb-4">
                <div>
                  <h2 className="m-0 font-serif text-2xl font-bold text-saie-text">
                    Cuadro de asignación de aulas
                  </h2>
                  <p className="m-0 mt-1 text-sm text-saie-muted">
                    Periodo {datos.periodo} · generado el {formatearFechaCorta(datos.generadoEn)}
                  </p>
                </div>
                <dl className="m-0 flex flex-wrap gap-4 text-sm">
                  <div>
                    <dt className="text-xs text-saie-muted">Secciones</dt>
                    <dd className="m-0 text-lg font-bold text-saie-text">
                      {datos.totales.secciones}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-saie-muted">Con aula</dt>
                    <dd className="m-0 text-lg font-bold text-saie-text">
                      {datos.totales.asignadas}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-saie-muted">Sin aula</dt>
                    <dd className="m-0 text-lg font-bold text-saie-danger-strong">
                      {datos.totales.sinAula}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-saie-muted">Aulas usadas</dt>
                    <dd className="m-0 text-lg font-bold text-saie-text">
                      {datos.totales.aulasDistintas}
                    </dd>
                  </div>
                </dl>
              </header>

              {datos.totales.sinAula > 0 && (
                <p className="saie-no-imprimir m-0 rounded-xl border border-saie-warning-strong/30 bg-saie-warning-soft p-3 text-sm font-medium text-saie-warning-strong">
                  {datos.totales.sinAula === 1
                    ? '1 sección todavía no tiene aula: está marcada en la tabla y conviene resolverla antes de presentar el cuadro.'
                    : `${datos.totales.sinAula} secciones todavía no tienen aula: están marcadas en la tabla y conviene resolverlas antes de presentar el cuadro.`}
                </p>
              )}

              {/*
                Tabla desde `lg` y al imprimir; tarjetas por debajo (Issue 3.54). El cambio es CSS: no hay
                parpadeo al cargar y el documento impreso conserva siempre el cuadro completo.
              */}
              <ul className="m-0 flex list-none flex-col gap-3 p-0 lg:hidden print:hidden">
                {datos.secciones.map((s) => (
                  <li
                    key={`${s.codigoCurso}-${s.codigoSeccion}`}
                    className="flex flex-col gap-2 rounded-xl border border-saie-divider bg-white p-4 text-sm"
                  >
                    <p className="m-0 font-semibold">
                      <span className="font-mono text-sm">{s.codigoCurso}</span> · Sección{' '}
                      {s.codigoSeccion}
                      <span className="block text-sm font-normal text-saie-muted">
                        {s.nombreCurso}
                      </span>
                    </p>
                    <div>
                      <span className="block text-xs text-saie-muted">Aula</span>
                      {s.aula ? (
                        <span>
                          <span className="font-semibold">{s.aula.identificador}</span>
                          <span className="block text-sm text-saie-muted">
                            {s.aula.pabellon} · piso {s.aula.piso}
                          </span>
                        </span>
                      ) : (
                        <BadgeEstado tono="advertencia">Sin aula asignada</BadgeEstado>
                      )}
                    </div>
                    <dl className="m-0 grid grid-cols-1 gap-1 text-sm">
                      <div>
                        <dt className="inline text-saie-muted">Horario: </dt>
                        <dd className="m-0 inline">{s.horarios.join(' · ') || '—'}</dd>
                      </div>
                      <div>
                        <dt className="inline text-saie-muted">Docente: </dt>
                        <dd className="m-0 inline">{s.docente ?? '—'}</dd>
                      </div>
                      <div>
                        <dt className="inline text-saie-muted">Alumnos: </dt>
                        <dd className="m-0 inline tabular-nums">{s.alumnosMatriculados}</dd>
                      </div>
                      <div>
                        <dt className="inline text-saie-muted">Software: </dt>
                        <dd className="m-0 inline">{s.softwareRequerido.join(', ') || '—'}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>

              <div className="hidden lg:block print:block">
                <TablaDatos
                  etiqueta="Cuadro de asignación de aulas"
                  className="saie-imprimir-tabla"
                >
                  <CabeceraTabla
                    compacta
                    columnas={[
                      'Código',
                      'Curso',
                      'Sección',
                      'Aula',
                      'Horario',
                      'Docente',
                      'Alumnos',
                      'Software',
                    ]}
                  />
                  <tbody>
                    {datos.secciones.map((s) => (
                      <tr
                        key={`${s.codigoCurso}-${s.codigoSeccion}`}
                        className="border-t border-saie-divider"
                      >
                        <td className="px-3 py-2 font-mono text-sm">{s.codigoCurso}</td>
                        <td className="px-3 py-2">{s.nombreCurso}</td>
                        <td className="px-3 py-2 font-semibold">{s.codigoSeccion}</td>
                        <td className="px-3 py-2">
                          {s.aula ? (
                            <span>
                              <span className="font-semibold">{s.aula.identificador}</span>
                              <span className="block text-sm text-saie-muted">
                                {s.aula.pabellon} · piso {s.aula.piso}
                              </span>
                            </span>
                          ) : (
                            <BadgeEstado tono="advertencia">Sin aula asignada</BadgeEstado>
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm">{s.horarios.join(' · ') || '—'}</td>
                        <td className="px-3 py-2 text-sm">{s.docente ?? '—'}</td>
                        <td className="px-3 py-2 text-center tabular-nums">
                          {s.alumnosMatriculados}
                        </td>
                        <td className="px-3 py-2 text-sm">
                          {s.softwareRequerido.join(', ') || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </TablaDatos>
              </div>

              <footer className="border-t border-saie-divider pt-3 text-xs text-saie-muted">
                <p className="m-0">
                  Total de alumnos matriculados: {datos.totales.alumnos}. Documento generado por el
                  SAIE; los horarios están en hora de Lima.
                </p>
              </footer>
            </article>
          ) : null}
        </ZonaActualizable>
      </div>
    </LayoutAdmin>
  );
};

export default ReporteSalones;

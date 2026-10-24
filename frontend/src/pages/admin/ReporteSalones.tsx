import React, { useCallback, useState } from 'react';
import LayoutAdmin, { AvisoError } from '../../components/admin/LayoutAdmin';
import { EsqueletoCarga } from '../../components/estudiante/ElementosHorario';
import { BadgeEstado } from '../../components/ui/BadgeEstado';
import { Boton } from '../../components/ui/Boton';
import { CabeceraTabla, TablaDatos } from '../../components/ui/TablaDatos';
import { ZonaActualizable } from '../../components/ui/ZonaActualizable';
import { Campo } from '../../components/ui/Campo';
import { CLASE_CAMPO } from '../../components/ui/campos';
import { useCarga } from '../../hooks/useCarga';
import { useValorDiferido } from '../../hooks/useValorDiferido';
import { obtenerReporteAsignaciones } from '../../services/admin';
import { formatearFechaCorta } from '../../utils/fechas';

/**
 * Issue 4.33 — informe de salones.
 *
 * Es una vista imprimible: el mismo HTML sirve en pantalla y para generar el PDF con el
 * diálogo del navegador («Guardar como PDF»), sin dependencias nuevas ni maquetar un PDF a
 * mano. Las secciones sin aula aparecen marcadas: es justo lo que hay que revisar antes de
 * presentar el cuadro.
 */
export const ReporteSalones: React.FC = () => {
  const [periodo, setPeriodo] = useState('');
  // Una sola petición tras una pausa al escribir el periodo (Issue 4.41).
  const periodoDiferido = useValorDiferido(periodo);

  const cargar = useCallback(
    () => obtenerReporteAsignaciones(periodoDiferido.trim() || undefined),
    [periodoDiferido],
  );

  const { datos, cargando, error, recargar } = useCarga(cargar);

  const imprimir = () => {
    window.print();
  };

  return (
    <LayoutAdmin
      titulo="Informe de salones"
      subtitulo="Las secciones del periodo con el aula que tienen asignada, listo para presentar."
      acciones={
        <div className="flex flex-wrap gap-2 saie-no-imprimir">
          <Boton variante="secundario" onClick={recargar} cargando={cargando}>
            Actualizar
          </Boton>
          <Boton variante="primario" onClick={imprimir} disabled={!datos}>
            Imprimir o guardar como PDF
          </Boton>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <Campo etiqueta="Periodo" className="flex max-w-xs flex-col gap-1 saie-no-imprimir">
          <input
            type="text"
            placeholder="Ej. 2026-2 (vacío = vigente)"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className={CLASE_CAMPO}
          />
        </Campo>

        {error && (
          <div className="saie-no-imprimir">
            <AvisoError mensaje={error} onReintentar={recargar} />
          </div>
        )}

        <ZonaActualizable actualizando={cargando && datos !== null}>
          {cargando && !datos ? (
            <EsqueletoCarga texto="Preparando el informe…" forma="tabla" />
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
                      <span className="font-mono text-xs">{s.codigoCurso}</span> · Sección{' '}
                      {s.codigoSeccion}
                      <span className="block text-xs font-normal text-saie-muted">
                        {s.nombreCurso}
                      </span>
                    </p>
                    <div>
                      <span className="block text-xs text-saie-muted">Aula</span>
                      {s.aula ? (
                        <span>
                          <span className="font-semibold">{s.aula.identificador}</span>
                          <span className="block text-xs text-saie-muted">
                            {s.aula.pabellon} · piso {s.aula.piso}
                          </span>
                        </span>
                      ) : (
                        <BadgeEstado tono="advertencia">Sin aula asignada</BadgeEstado>
                      )}
                    </div>
                    <dl className="m-0 grid grid-cols-1 gap-1 text-xs">
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
                        <td className="px-3 py-2 font-mono text-xs">{s.codigoCurso}</td>
                        <td className="px-3 py-2">{s.nombreCurso}</td>
                        <td className="px-3 py-2 font-semibold">{s.codigoSeccion}</td>
                        <td className="px-3 py-2">
                          {s.aula ? (
                            <span>
                              <span className="font-semibold">{s.aula.identificador}</span>
                              <span className="block text-xs text-saie-muted">
                                {s.aula.pabellon} · piso {s.aula.piso}
                              </span>
                            </span>
                          ) : (
                            <BadgeEstado tono="advertencia">Sin aula asignada</BadgeEstado>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs">{s.horarios.join(' · ') || '—'}</td>
                        <td className="px-3 py-2 text-xs">{s.docente ?? '—'}</td>
                        <td className="px-3 py-2 text-center tabular-nums">
                          {s.alumnosMatriculados}
                        </td>
                        <td className="px-3 py-2 text-xs">
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
